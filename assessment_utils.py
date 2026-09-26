from models import (
    ResumeAssessment,
    MatchLevel,
    CandidateAssessment,
    CandidateMatch,
    HardGateStatus,
    HardGateAssessment,
    HardGateResult,
)


def get_unresolved_requirements(
    assessment: ResumeAssessment,
):
    return [
        item
        for item in assessment.assessments
        if item.match != MatchLevel.FULL
    ]

def evaluate_hard_gates(candidate_assessment: CandidateAssessment):
    gates = []

    for item in candidate_assessment.assessments:
        if not item.requirement.hard_gate:
            continue

        if item.match == CandidateMatch.SATISFIED:
            status = HardGateStatus.SATISFIED

        elif item.match in (
            CandidateMatch.NOT_SATISFIED,
            CandidateMatch.PARTIAL,
        ):
            status = HardGateStatus.NOT_SATISFIED

        else:
            status = HardGateStatus.UNKNOWN

        gates.append(
            HardGateAssessment(
                requirement=item.requirement,
                status=status,
                evidence=item.evidence,
                reasoning=item.reasoning,
            )
        )

    return HardGateResult(gates=gates)