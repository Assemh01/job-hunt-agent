import json

from agents import Runner

from agent import (
    requirements_agent,
    resume_agent,
    clarification_agent,
    candidate_agent,
)

from models import (
    JobAnalysisResult,
    ClarificationAnswers,
    ClarificationQuestions,
    ProfileFact,
)

from assessment_utils import (
    get_unresolved_requirements,
    evaluate_hard_gates,
)

from scoring import (
    calculate_resume_score,
    calculate_candidate_score,
)


async def analyze_job(
    job_description: str,
    resume_text: str,
    profile_facts: list[ProfileFact],
) -> JobAnalysisResult:
    
    requirements_result = await Runner.run(
        requirements_agent,
        job_description,
    )

    requirements = requirements_result.final_output

    assessment_input = f"""
        Candidate resume:

        {resume_text}

        Job requirements:

        {requirements.model_dump_json(indent=2)}
        """

    resume_result = await Runner.run(
        resume_agent,
        assessment_input,
    )

    resume_assessment = resume_result.final_output

    resume_score = calculate_resume_score(
        resume_assessment
    )

    unresolved = get_unresolved_requirements(
        resume_assessment
    )

    if unresolved:
        clarification_input = {
            "unresolved_requirements": [
                item.model_dump(mode="json")
                for item in unresolved
            ],
            "profile_facts": [
                fact.model_dump(mode = "json")
                for fact in profile_facts
            ],
        }

        clarification_result = await Runner.run(
            clarification_agent,
            json.dumps(clarification_input, indent=2),
        )

        clarification_questions = (
            clarification_result.final_output
        )

    else:
        clarification_questions = ClarificationQuestions()

    analysis = JobAnalysisResult(
        requirements=requirements,
        resume_assessment=resume_assessment,
        resume_score=resume_score,
        clarification_questions=clarification_questions,
    )

    if not clarification_questions.questions:
        return await complete_job_analysis(
            analysis,
            ClarificationAnswers(),
            profile_facts,
        )

    return analysis


async def complete_job_analysis(
    analysis: JobAnalysisResult,
    answers: ClarificationAnswers,
    profile_facts: list[ProfileFact],
) -> JobAnalysisResult:
    candidate_input = f"""
        Resume assessment:

        {analysis.resume_assessment.model_dump_json(indent=2)}

        Previously confirmed reusable profile facts:

        {json.dumps(
            [
                fact.model_dump(mode="json")
                for fact in profile_facts
            ],
            indent=2,
        )}

        Candidate clarification answers for this job:

        {answers.model_dump_json(indent=2)}
    """

    candidate_result = await Runner.run(
        candidate_agent,
        candidate_input,
    )

    candidate_assessment = candidate_result.final_output

    candidate_score = calculate_candidate_score(
        candidate_assessment
    )

    hard_gates = evaluate_hard_gates(
        candidate_assessment
    )

    return analysis.model_copy(
        update={
            "candidate_assessment": candidate_assessment,
            "candidate_score": candidate_score,
            "hard_gates": hard_gates,
        }
    )