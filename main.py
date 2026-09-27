import asyncio

from dotenv import load_dotenv

from clarification_utils import collect_answers
from job_analysis_service import (
    analyze_job,
    complete_job_analysis,
)

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
    analysis = await analyze_job(job_description)

    if analysis.clarification_questions.questions:
        answers = collect_answers(
            analysis.clarification_questions
        )

        analysis = await complete_job_analysis(
            analysis,
            answers,
        )

    print(analysis.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())