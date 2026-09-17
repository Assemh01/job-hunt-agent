from pydantic import BaseModel, Field

class JobAnalysis(BaseModel):
    fit_score: int = Field(ge=0, le=100)
    matching_skills: list[str]
    missing_skills: list[str]
    strengths: list[str]
    recommendation: str