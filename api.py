from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import (
    JobAnalysisRequest,
    ClarificationSubmission,
    JobAnalysisResult,
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


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post(
    "/analyze",
    response_model=JobAnalysisResult,
)
async def analyze(request: JobAnalysisRequest):
    return await analyze_job(
        request.job_description
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