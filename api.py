from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import pymupdf

from database import Base, engine, get_db
from db_models import ProfileDB

from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

from models import (
    JobAnalysisRequest,
    ClarificationSubmission,
    JobAnalysisResult,
    ProfileCreate,
    ProfileResponse
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

    return await analyze_job(
        request.job_description,
        profile.resume_text,
    )


@app.post(
    "/clarifications",
    response_model=JobAnalysisResult,
)
async def submit_clarifications(
    submission: ClarificationSubmission,
):
    return await complete_job_analysis(
        submission.analysis,
        submission.answers,
    )

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

    profile.resume_text = resume_text
    profile.resume_filename = file.filename

    db.commit()
    db.refresh(profile)

    return profile_to_response(profile)