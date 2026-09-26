from models import (
    JobRequirement,
    RequirementPriority,
    RequirementType,
    RequirementAssessment,
    ResumeAssessment,
    MatchLevel,
    HardGateStatus
)
from assessment_utils import evaluate_hard_gates
from scoring import calculate_resume_score
import pytest
from models import CandidateRequirementAssessment, CandidateAssessment, CandidateMatch
from scoring import calculate_candidate_score

def test_only_required_requirements():
    python_requirement = JobRequirement(
        name="Python",
        description="Strong Python programming experience",
        priority=RequirementPriority.REQUIRED,
        type=RequirementType.SKILL,
    )

    years_requirement = JobRequirement(
        name="Years of Experience",
        description="At least 5 years of professional machine learning experience.",
        priority=RequirementPriority.REQUIRED,
        type=RequirementType.EXPERIENCE,
    )

    python_assessment = RequirementAssessment(
        requirement=python_requirement,
        match=MatchLevel.FULL,
        evidence=["Python listed in skills"],
        reasoning="The resume clearly demonstrates Python experience.",
    )

    years_assessment = RequirementAssessment(
        requirement=years_requirement,
        match=MatchLevel.PARTIAL,
        evidence=["Resume shows some machine learning experience"],
        reasoning="The resume shows relevant experience, but not enough to confirm five years.",
    )

    resume_assessment = ResumeAssessment(
        assessments=[
            python_assessment,
            years_assessment,
        ]
    )

    score = calculate_resume_score(resume_assessment)

    assert score.required_score == 75.0
    assert score.overall_score == 75.0

def test_required_and_preferred_without_bonus():
    python_requirement = JobRequirement(
        name="Python",
        description="Strong Python programming experience",
        priority=RequirementPriority.REQUIRED,
        type=RequirementType.SKILL,
    )

    healthcare_requirement = JobRequirement(
        name="Healthcare Experience",
        description="Experience working with healthcare data",
        priority=RequirementPriority.REQUIRED,
        type=RequirementType.DOMAIN,
    )

    aws_requirement = JobRequirement(
        name="AWS",
        description="Experience with AWS",
        priority=RequirementPriority.PREFERRED,
        type=RequirementType.SKILL,
    )

    python_assessment = RequirementAssessment(
        requirement=python_requirement,
        match=MatchLevel.FULL,
        evidence=["Python listed in skills"],
        reasoning="The resume clearly demonstrates Python experience.",
    )

    healthcare_assessment = RequirementAssessment(
        requirement=healthcare_requirement,
        match=MatchLevel.NOT_EVIDENCED,
        evidence=["Resume does not show experience working with healthcare data"],
        reasoning="The resume does not show experience working in healthcare data or HIPAA regulated fields",
    )

    aws_assessment = RequirementAssessment(
        requirement=aws_requirement,
        match=MatchLevel.FULL,
        evidence= ["Resume shows clear experience working with AWS services such as S3 buckets and lambda functions"],
        reasoning="Resume shows AWS experience"
    )

    resume_assessment = ResumeAssessment(
        assessments=[
            python_assessment,
            healthcare_assessment,
            aws_assessment,
        ]
    )

    score = calculate_resume_score(resume_assessment)

    assert score.required_score == 50.0
    assert score.preferred_score == 100.0
    assert score.overall_score == pytest.approx(61.11, rel=1e-3)

def test_hard_gates_are_excluded_from_score():
    python_requirement = JobRequirement(
        name="Python",
        description="Strong Python programming experience",
        priority=RequirementPriority.REQUIRED,
        type=RequirementType.SKILL,
    )

    work_authorization_requirement = JobRequirement(
        name="Work Authorization",
        description="Must be legally authorized to work in the United States",
        priority=RequirementPriority.REQUIRED,
        type=RequirementType.ELIGIBILITY,
        hard_gate=True,
    )

    python_assessment = RequirementAssessment(
        requirement=python_requirement,
        match=MatchLevel.FULL,
        evidence=["Python listed in skills"],
        reasoning="The resume clearly demonstrates Python experience.",
    )

    work_authorization_assessment = RequirementAssessment(
        requirement=work_authorization_requirement,
        match=MatchLevel.NOT_EVIDENCED,
        evidence=[],
        reasoning="The resume does not state work authorization.",
    )

    resume_assessment = ResumeAssessment(
        assessments=[
            python_assessment,
            work_authorization_assessment,
        ]
    )

    score = calculate_resume_score(resume_assessment)

    assert score.required_score == 100.0
    assert score.overall_score == 100.0

def test_candidate_score_uses_candidate_matches():
    python_requirement = JobRequirement(
        name="Python",
        description="Strong Python programming experience",
        priority=RequirementPriority.REQUIRED,
        type=RequirementType.SKILL,
    )

    years_requirement = JobRequirement(
        name="Years of Experience",
        description="At least 5 years of professional machine learning experience.",
        priority=RequirementPriority.REQUIRED,
        type=RequirementType.EXPERIENCE,
    )

    python_assessment = CandidateRequirementAssessment(
        requirement=python_requirement,
        match=CandidateMatch.SATISFIED,
        evidence=["Candidate clearly demonstrates Python experience"],
        reasoning="The candidate fully satisfies the Python requirement.",
    )

    years_assessment = CandidateRequirementAssessment(
        requirement=years_requirement,
        match=CandidateMatch.PARTIAL,
        evidence=["Candidate has relevant machine learning experience"],
        reasoning="The candidate has relevant experience but does not fully satisfy the five-year requirement.",
    )

    candidate_assessment = CandidateAssessment(
        assessments=[
            python_assessment,
            years_assessment,
        ]
    )

    score = calculate_candidate_score(candidate_assessment)

    assert score.required_score == 75.0
    assert score.overall_score == 75.0

def test_hard_gate_statuses():
    work_auth_requirement = JobRequirement(
        name="Work Authorization",
        description="Must be legally authorized to work in the United States.",
        priority=RequirementPriority.REQUIRED,
        type=RequirementType.ELIGIBILITY,
        hard_gate=True,
    )

    office_requirement = JobRequirement(
        name="Detroit Office Attendance",
        description="Must be able to work from the Detroit office three days per week.",
        priority=RequirementPriority.REQUIRED,
        type=RequirementType.LOCATION,
        hard_gate=True,
    )

    work_auth_assessment = CandidateRequirementAssessment(
        requirement=work_auth_requirement,
        match=CandidateMatch.SATISFIED,
        evidence=["Candidate confirmed U.S. work authorization."],
        reasoning="Candidate meets the work authorization requirement.",
    )

    office_assessment = CandidateRequirementAssessment(
        requirement=office_requirement,
        match=CandidateMatch.NOT_SATISFIED,
        evidence=["Candidate cannot work from the Detroit office three days per week."],
        reasoning="Candidate does not meet the office attendance requirement.",
    )

    candidate_assessment = CandidateAssessment(
        assessments=[
            work_auth_assessment,
            office_assessment,
        ]
    )

    result = evaluate_hard_gates(candidate_assessment)

    assert len(result.gates) == 2

    assert result.gates[0].status == HardGateStatus.SATISFIED
    assert result.gates[1].status == HardGateStatus.NOT_SATISFIED