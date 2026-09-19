import asyncio
from agents import Runner
from agent import requirements_agent, resume_agent, clarification_agent, candidate_agent
from dotenv import load_dotenv
from assessment_utils import get_unresolved_requirements
import json
from clarification_utils import collect_answers

load_dotenv()

job_description = """
    Machine Learning Engineer

    We are seeking a Machine Learning Engineer to build AI systems for
    healthcare applications.

    Required Qualifications:
    - Strong Python programming experience.
    - At least 3 years of professional machine learning experience.
    - Experience working with healthcare or clinical data.
    - Bachelor's degree in Computer Science, Engineering, or a related field,
    or equivalent professional experience.

    Preferred Qualifications:
    - Master's degree in Computer Science or a related field.
    - Experience with AWS.
    - Familiarity with HIPAA-regulated environments.

    Additional Requirements:
    - Must be legally authorized to work in the United States.
    - Must be able to work from our Detroit office three days per week.

    Nice to have:
    - AWS Certified Machine Learning certification.
    """

async def main():

    # First we extract the job requirements
    requirements_result = await Runner.run(
        requirements_agent,
        job_description,
    )

    requirements = requirements_result.final_output

    print("\n === JOB REQUIREMENTS ===")
    print(requirements.model_dump(mode = "json"))

    # Next we compare the resume against the job requirements
    assessment_input = f"""
        Analyze the candidate's resume against these job requirements
        {requirements.model_dump_json(indent=2)}
    """

    resume_result = await Runner.run(
        resume_agent,
        assessment_input
    )

    assessment = resume_result.final_output

    print("\n === RESUME ASSESSMENT ===")
    print(assessment.model_dump(mode="json"))

    unresolved = get_unresolved_requirements(assessment)

    clarification_input = {
        "unresolved_requirements": [
            item.model_dump(mode="json")
            for item in unresolved
        ]
    }

    clarification_result = await Runner.run(
        clarification_agent,
        json.dumps(clarification_input, indent = 2),
    )

    questions = clarification_result.final_output

    print("\n === NEEDS CLARIFICATION ===")

    for item in unresolved:
        print(
            f"- {item.requirement.name}: "
            f"- {item.match.value}"
        )

    print("\n=== CLARIFICATION QUESTIONS ===")

    for item in questions.questions:
        print(f"\nRequirement: {item.requirement.name}")
        print(f"Question: {item.question}")
        print(f"Type: {item.response_type.value}")

        if item.choices:
            print("Choices:")
            for choice in item.choices:
                print(f"  - {choice}")

    candidate_answers = collect_answers(questions)

    print("\n=== CANDIDATE ANSWERS ===")
    print(candidate_answers.model_dump(mode="json"))

    candidate_input = f"""
    Resume assessment:

    {assessment.model_dump_json(indent=2)}

    Candidate clarification answers:

    {candidate_answers.model_dump_json(indent=2)}
    """

    candidate_result = await Runner.run(
        candidate_agent,
        candidate_input,
    )

    candidate_assessment = candidate_result.final_output

    print("\n=== CANDIDATE ASSESSMENT ===")
    print(candidate_assessment.model_dump(mode="json"))

if __name__ == "__main__":
    asyncio.run(main())