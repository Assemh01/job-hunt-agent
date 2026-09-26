from models import FitScore, MatchLevel, RequirementPriority, CandidateMatch

REQUIRED_WEIGHT = 0.7
PREFERRED_WEIGHT = 0.2
BONUS_WEIGHT = 0.1

RESUME_MATCH_VALUES = {
    MatchLevel.FULL : 1.0,
    MatchLevel.PARTIAL : 0.5,
    MatchLevel.NOT_EVIDENCED : 0.0,
}

CANDIDATE_MATCH_VALUES = {
    CandidateMatch.SATISFIED : 1.0,
    CandidateMatch.PARTIAL : 0.5,
    CandidateMatch.NOT_SATISFIED : 0.0,
    CandidateMatch.UNKNOWN : 0.0,
}

def calculate_group_score(assessments, match_values):
    if not assessments:
        return 0.0
    total = 0.0
    for assessment in assessments:
        total = total + match_values[assessment.match]
    score = (total / len(assessments)) * 100
    return score

def calculate_resume_score(assessment):
    required = []
    preferred = []
    bonus = []

    for item in assessment.assessments:
        if item.requirement.hard_gate:
            continue
        if item.requirement.priority == RequirementPriority.REQUIRED:
            required.append(item)
        elif item.requirement.priority == RequirementPriority.PREFERRED:
            preferred.append(item)
        elif item.requirement.priority == RequirementPriority.BONUS:
            bonus.append(item)

    required_score = calculate_group_score(required, RESUME_MATCH_VALUES)
    preferred_score = calculate_group_score(preferred, RESUME_MATCH_VALUES)
    bonus_score = calculate_group_score(bonus, RESUME_MATCH_VALUES)

    final_required = (required_score * REQUIRED_WEIGHT)
    final_preferred = (preferred_score * PREFERRED_WEIGHT)
    final_bonus = (bonus_score * BONUS_WEIGHT)

    resume_score = final_required + final_preferred + final_bonus

    return FitScore(
        overall_score= resume_score,
        required_score= required_score,
        preferred_score=preferred_score,
        bonus_score=bonus_score,
    )

def calculate_candidate_score(assessment):
    required = []
    preferred = []
    bonus = []

    for item in assessment.assessments:
        if item.requirement.hard_gate:
            continue
        if item.requirement.priority == RequirementPriority.REQUIRED:
            required.append(item)
        elif item.requirement.priority == RequirementPriority.PREFERRED:
            preferred.append(item)
        elif item.requirement.priority == RequirementPriority.BONUS:
            bonus.append(item)

    required_score = calculate_group_score(required, CANDIDATE_MATCH_VALUES)
    preferred_score = calculate_group_score(preferred, CANDIDATE_MATCH_VALUES)
    bonus_score = calculate_group_score(bonus, CANDIDATE_MATCH_VALUES)

    final_required = (required_score * REQUIRED_WEIGHT)
    final_preferred = (preferred_score * PREFERRED_WEIGHT)
    final_bonus = (bonus_score * BONUS_WEIGHT)

    candidate_score = final_required + final_preferred + final_bonus

    return FitScore(
        overall_score= candidate_score,
        required_score= required_score,
        preferred_score=preferred_score,
        bonus_score=bonus_score,
    )
