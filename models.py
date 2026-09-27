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

class JobInfo(BaseModel):
    company_name: str | None = None
    job_title: str | None = None
    location: str | None = None
    salary: str | None = None
    employment_type: str | None = None
    workplace_type: str | None = None

class JobRequirements(BaseModel):
    job_info : JobInfo
    requirements: list[JobRequirement]

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

class FitScore(BaseModel):
    overall_score:float
    required_score:float
    preferred_score:float
    bonus_score:float

class HardGateStatus(str, Enum):
    SATISFIED = "satisfied"
    NOT_SATISFIED = "not_satisfied"
    UNKNOWN = "unknown"


class HardGateAssessment(BaseModel):
    requirement: JobRequirement
    status: HardGateStatus
    evidence: list[str] = Field(default_factory=list)
    reasoning: str

class HardGateResult(BaseModel):
    gates: list[HardGateAssessment] = Field(default_factory=list)

class JobAnalysisResult(BaseModel):
    requirements: JobRequirements
    resume_assessment: ResumeAssessment
    resume_score: FitScore
    clarification_questions: ClarificationQuestions

    candidate_assessment: CandidateAssessment | None = None
    candidate_score: FitScore | None = None
    hard_gates: HardGateResult | None = None

class JobAnalysisRequest(BaseModel):
    profile_id: int
    job_description: str

class ClarificationSubmission(BaseModel):
    profile_id: int
    analysis: JobAnalysisResult
    answers: ClarificationAnswers

class ProfileCreate(BaseModel):
    name: str

class ProfileResponse(BaseModel):
    id: int
    name: str
    resume_filename: str | None = None
    has_resume: bool = False

class ResumeExperience(BaseModel):
    company: str | None = None
    title: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: list[str] = Field(default_factory=list)

class ResumeEducation(BaseModel):
    institution: str | None = None
    degree: str | None = None
    field_of_study: str | None = None
    start_date: str | None = None
    end_date: str | None = None

class ResumeData(BaseModel):
    name: str | None = None
    location: str | None = None
    summary: str | None = None

    skills: list[str] = Field(default_factory=list)
    experience: list[ResumeExperience] = Field(default_factory=list)
    education: list[ResumeEducation] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)

class ProfileFact(BaseModel):
    key: str
    statement: str
    value: bool | int | float | str
    response_type: QuestionType


class ProfileFactDecision(BaseModel):
    reusable: bool
    fact: ProfileFact | None = None

class ProfileFactDecisions(BaseModel):
    decisions: list[ProfileFactDecision] = Field(default_factory=list)