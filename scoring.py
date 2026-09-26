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

def calculate_fit_score(assessment, match_values):
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

    required_score = calculate_group_score(required, match_values)
    preferred_score = calculate_group_score(preferred, match_values)
    bonus_score = calculate_group_score(bonus, match_values)

    active_weight = 0.0

    if required:
        active_weight += REQUIRED_WEIGHT

    if preferred:
        active_weight += PREFERRED_WEIGHT

    if bonus:
        active_weight += BONUS_WEIGHT

    final_required = required_score * REQUIRED_WEIGHT
    final_preferred = preferred_score * PREFERRED_WEIGHT
    final_bonus = bonus_score * BONUS_WEIGHT

    weighted_score = final_required + final_preferred + final_bonus

    if active_weight == 0:
        fit_score = 0.0
    else:
        fit_score = weighted_score/active_weight

    return FitScore(
        overall_score= fit_score,
        required_score= required_score,
        preferred_score=preferred_score,
        bonus_score=bonus_score,
    )

def calculate_resume_score(assessment):
    return calculate_fit_score(assessment, RESUME_MATCH_VALUES)

def calculate_candidate_score(assessment):
    return calculate_fit_score(assessment, CANDIDATE_MATCH_VALUES)