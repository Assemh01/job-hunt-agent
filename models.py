from enum import Enum
from pydantic import BaseModel, Field

class RequirementPriority(str, Enum):
    REQUIRED = "required"
    PREFERRED = "preferred"
    BONUS = "bonus"

class RequirementType(str, Enum):
    SKILL = "skill"
    EXPERIENCE = "experience"
    EDUCATION = "education"
    CERTIFICATION = "certification"
    DOMAIN = "domain"
    ELIGIBILITY = "eligibility"
    LOCATION = "location"
    OTHER = "other"

class JobRequirement(BaseModel):
    name: str
    description: str
    priority: RequirementPriority
    type: RequirementType
    hard_gate: bool = False

class JobRequirements(BaseModel):
    job_title: str | None = None
    requirements: list[JobRequirement] = Field(default_factory=list)

class MatchLevel(str, Enum):
    FULL = "full"
    PARTIAL = "partial"
    NOT_EVIDENCED = "not_evidenced"

class RequirementAssessment(BaseModel):
    requirement: JobRequirement
    match: MatchLevel
    evidence: list[str] = Field(default_factory=list)
    reasoning: str

class ResumeAssessment(BaseModel):
    assessments: list[RequirementAssessment] = Field(default_factory=list)

class QuestionType(str, Enum):
    YES_NO = "yes_no"
    PROFICIENCY = "proficiency"
    YEARS = "years"
    TEXT = "text"
    CHOICE = "choice"

class ClarificationQuestion(BaseModel):
    requirement: JobRequirement
    question: str
    response_type: QuestionType
    choices : list[str] = Field(default_factory=list)

class ClarificationQuestions(BaseModel):
    questions: list[ClarificationQuestion] = Field(default_factory=list)

class ClarificationAnswer(BaseModel):
    requirement: JobRequirement
    response_type: QuestionType
    answer: bool | int | float | str

class ClarificationAnswers(BaseModel):
    answers: list[ClarificationAnswer] = Field(default_factory=list)

class CandidateMatch(str, Enum):
    SATISFIED = "satisfied"
    PARTIAL = "partial"
    NOT_SATISFIED = "not_satisfied"
    UNKNOWN = "unknown"

class CandidateRequirementAssessment(BaseModel):
    requirement: JobRequirement
    match: CandidateMatch
    evidence: list[str] = Field(default_factory=list)
    reasoning: str

class CandidateAssessment(BaseModel):
    assessments: list[CandidateRequirementAssessment] = Field(default_factory=list)