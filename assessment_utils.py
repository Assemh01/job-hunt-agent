from models import ResumeAssessment, MatchLevel


def get_unresolved_requirements(
    assessment: ResumeAssessment,
):
    return [
        item
        for item in assessment.assessments
        if item.match != MatchLevel.FULL
    ]