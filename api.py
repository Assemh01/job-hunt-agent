from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import pymupdf

import json

from database import Base, engine, get_db
from db_models import ProfileDB, ResumeDataDB, ProfileFactDB, SavedJobDB

from agents import Runner
from agent import resume_parser_agent, profile_fact_agent

from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

from models import (
    JobAnalysisRequest,
    ClarificationSubmission,
    JobAnalysisResult,
    ProfileCreate,
    ProfileResponse,
    ResumeData,
    ProfileFact,
    QuestionType,
    SavedJobCreate,
    SavedJobResponse,
    SavedJobUpdate,
)

from job_analysis_service import (
    analyze_job,
    complete_job_analysis,
)

from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Job Hunt Agent API",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def profile_to_response(profile: ProfileDB) -> ProfileResponse:
    return ProfileResponse(
        id=profile.id,
        name=profile.name,
        resume_filename=profile.resume_filename,
        has_resume=profile.resume_text is not None,
    )

def saved_job_to_response(job:SavedJobDB) -> SavedJobResponse:
    return SavedJobResponse(
        id = job.id,
        profile_id = job.profile_id,
        company_name = job.company_name,
        job_title = job.job_title,
        location = job.location,
        salary = job.salary,
        employment_type = job.employment_type,
        workplace_type = job.workplace_type,
        job_description = job.job_description,
        application_status = job.application_status,
        analysis=(
            JobAnalysisResult.model_validate_json(
                job.analysis_json
            )
            if job.analysis_json
            else None
        ),
        created_at = job.created_at,
        updated_at = job.updated_at,
    )

def load_profile_facts(
        profile_id: int,
        db:Session
) -> list[ProfileFact]:
    facts = (
        db.query(ProfileFactDB)
        .filter(ProfileFactDB.profile_id == profile_id)
        .order_by(ProfileFactDB.id)
        .all()
    )

    return [
        ProfileFact(
            key = fact.key,
            statement=fact.statement,
            value = json.loads(fact.value_json),
            response_type = QuestionType(
                fact.response_type
            ),
        )
        for fact in facts
    ]

def extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        with pymupdf.open(
            stream=pdf_bytes,
            filetype="pdf",
        ) as document:
            text = "\n".join(
                page.get_text("text")
                for page in document
            )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Could not read the PDF.",
        ) from exc

    text = text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="No readable text was found in the PDF.",
        )

    return text

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post(
    "/analyze",
    response_model=JobAnalysisResult,
)
async def analyze(
    request: JobAnalysisRequest,
    db: Session = Depends(get_db),
):
    profile = db.get(ProfileDB, request.profile_id)

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found.",
        )

    if not profile.resume_text:
        raise HTTPException(
            status_code=400,
            detail="This profile does not have a resume.",
        )

    profile_facts = load_profile_facts(
        profile.id,
        db,
    )

    return await analyze_job(
        request.job_description,
        profile.resume_text,
        profile_facts,
    )


@app.post(
    "/clarifications",
    response_model=JobAnalysisResult,
)
async def submit_clarifications(
    submission: ClarificationSubmission,
    db: Session = Depends(get_db),
):
    profile = db.get(
        ProfileDB,
        submission.profile_id,
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found.",
        )

    profile_facts = load_profile_facts(
        profile.id, 
        db,
    )

    completed_analysis = await complete_job_analysis(
        submission.analysis,
        submission.answers,
        profile_facts,
    )

    fact_inputs = []

    for answer in submission.answers.answers:
        question = next(
            (
                question
                for question
                in submission.analysis.clarification_questions.questions
                if question.requirement == answer.requirement
            ),
            None,
        )

        fact_inputs.append(
            {
                "requirement": answer.requirement.model_dump(
                    mode="json"
                ),
                "clarification_question": (
                    question.question
                    if question
                    else None
                ),
                "response_type": answer.response_type.value,
                "answer": answer.answer,
            }
        )

    if fact_inputs:
        fact_result = await Runner.run(
            profile_fact_agent,
            json.dumps(
                {
                    "clarification_answers": fact_inputs,
                },
                indent=2,
            ),
        )

        decisions = fact_result.final_output

        for decision in decisions.decisions:
            if not decision.reusable:
                continue

            if decision.fact is None:
                continue

            fact = decision.fact

            stored_fact = (
                db.query(ProfileFactDB)
                .filter(
                    ProfileFactDB.profile_id
                    == profile.id,
                    ProfileFactDB.key
                    == fact.key,
                )
                .first()
            )

            value_json = json.dumps(fact.value)

            if stored_fact is None:
                stored_fact = ProfileFactDB(
                    profile_id=profile.id,
                    key=fact.key,
                    statement=fact.statement,
                    value_json=value_json,
                    response_type=fact.response_type.value,
                )

                db.add(stored_fact)

            else:
                stored_fact.statement = fact.statement
                stored_fact.value_json = value_json
                stored_fact.response_type = (
                    fact.response_type.value
                )

        db.commit()

    return completed_analysis

@app.post(
    "/profiles",
    response_model=ProfileResponse,
    status_code=201,
)
def create_profile(
    profile_data: ProfileCreate,
    db: Session = Depends(get_db),
):
    name = profile_data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Profile name cannot be empty.",
        )

    profile = ProfileDB(name=name)

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile_to_response(profile)

@app.get(
    "/profiles",
    response_model=list[ProfileResponse],
)
def list_profiles(
    db: Session = Depends(get_db),
):
    profiles = db.query(ProfileDB).order_by(ProfileDB.id).all()

    return [
        profile_to_response(profile)
        for profile in profiles
    ]

@app.get(
    "/profiles/{profile_id}",
    response_model=ProfileResponse,
)
def get_profile(
    profile_id: int,
    db: Session = Depends(get_db),
):
    profile = db.get(ProfileDB, profile_id)

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found.",
        )

    return profile_to_response(profile)

@app.put(
    "/profiles/{profile_id}/resume",
    response_model=ProfileResponse,
)
async def upload_resume(
    profile_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    profile = db.get(ProfileDB, profile_id)

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found.",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="A filename is required.",
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Resume must be a PDF.",
        )

    pdf_bytes = await file.read()

    if not pdf_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded PDF is empty.",
        )

    max_size = 10 * 1024 * 1024

    if len(pdf_bytes) > max_size:
        raise HTTPException(
            status_code=400,
            detail="PDF must be smaller than 10 MB.",
        )

    resume_text = extract_pdf_text(pdf_bytes)
    parser_result = await Runner.run(
        resume_parser_agent,
        resume_text,
    )

    resume_data = parser_result.final_output

    profile.resume_text = resume_text
    profile.resume_filename = file.filename

    stored_resume_data = (
        db.query(ResumeDataDB)
        .filter(ResumeDataDB.profile_id == profile.id)
        .first()
    )

    if stored_resume_data is None:
        stored_resume_data = ResumeDataDB(
            profile_id=profile.id,
            data_json=resume_data.model_dump_json(),
        )

        db.add(stored_resume_data)

    else:
        stored_resume_data.data_json = (
            resume_data.model_dump_json()
        )

    db.commit()
    db.refresh(profile)

    return profile_to_response(profile)

@app.get(
    "/profiles/{profile_id}/resume-data",
    response_model=ResumeData,
)
def get_resume_data(
    profile_id: int,
    db: Session = Depends(get_db),
):
    profile = db.get(ProfileDB, profile_id)

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found.",
        )

    resume_data = (
        db.query(ResumeDataDB)
        .filter(ResumeDataDB.profile_id == profile_id)
        .first()
    )

    if resume_data is None:
        raise HTTPException(
            status_code=404,
            detail="No parsed resume data found for this profile.",
        )

    return ResumeData.model_validate_json(
        resume_data.data_json
    )

@app.get(
    "/profiles/{profile_id}/facts",
    response_model=list[ProfileFact],
)
def get_profile_facts(
    profile_id: int,
    db: Session = Depends(get_db),
):
    profile = db.get(ProfileDB, profile_id)

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found.",
        )

    return load_profile_facts(
        profile_id,
        db,
    )

@app.post(
    "/profiles/{profile_id}/jobs",
    response_model = SavedJobResponse,
    status_code= 201,
)
def save_job(
    profile_id: int,
    job_data: SavedJobCreate,
    db: Session = Depends(get_db),
):
    profile = db.get(ProfileDB, profile_id)

    if profile is None:
        raise HTTPException(
            status_code= 404,
            detail="Profile not found."
        )
    job = SavedJobDB(
        profile_id=profile_id,
        company_name=job_data.company_name,
        job_title=job_data.job_title,
        location=job_data.location,
        salary=job_data.salary,
        employment_type=job_data.employment_type,
        workplace_type=job_data.workplace_type,
        job_description=job_data.job_description,
        application_status="saved",
        analysis_json=(
            job_data.analysis.model_dump_json()
            if job_data.analysis
            else None
        ),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return saved_job_to_response(job)

@app.get(
    "/profiles/{profile_id}/jobs",
    response_model=list[SavedJobResponse],
)
def list_saved_jobs(
    profile_id: int,
    db: Session = Depends(get_db),
):
    profile = db.get(ProfileDB, profile_id)

    if profile is None:
        raise HTTPException(
            status_code= 404,
            detail = "Profile not found",
        )

    jobs = (
        db.query(SavedJobDB)
        .filter(SavedJobDB.profile_id==profile_id)
        .order_by(SavedJobDB.created_at.desc())
        .all()
    )

    return [ 
        saved_job_to_response(job)
        for job in jobs
    ]


@app.get(
    "/jobs/{job_id}",
    response_model=SavedJobResponse,
)
def get_saved_job(
    job_id: int,
    db: Session = Depends(get_db),
):
    job = db.get(SavedJobDB, job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Saved job not found.",
        )

    return saved_job_to_response(job)

@app.patch(
    "/jobs/{job_id}",
    response_model=SavedJobResponse,
)
def update_saved_job(
    job_id: int,
    updates: SavedJobUpdate,
    db: Session = Depends(get_db),
):
    job = db.get(SavedJobDB, job_id)

    if job is None:
        raise HTTPException(
            status_code= 404,
            detail = "Saved job not found.",
        )

    update_data = updates.model_dump(
        exclude_unset = True,
        mode = "json",
    )

    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)

    return saved_job_to_response(job)


@app.delete(
    "/jobs/{job_id}",
    status_code=204,
)
def delete_saved_job(
    job_id: int,
    db: Session = Depends(get_db),
):
    job = db.get(SavedJobDB, job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Saved job not found.",
        )

    db.delete(job)
    db.commit()
