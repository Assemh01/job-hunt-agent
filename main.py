import asyncio

from dotenv import load_dotenv
from agents import Runner

from agent import job_agent


load_dotenv()


async def main():
    job_description = """
    We are looking for an AI Engineer to join our team.

    Requirements:
    - Strong Python experience
    - Experience building REST APIs with FastAPI
    - Experience with RAG and LLM applications
    - Docker experience
    - AWS experience
    - Kubernetes experience
    - 3+ years of professional software engineering experience
    """

    result = await Runner.run(
        job_agent,
        input=f"""
        Analyze my fit for this position:

        {job_description}
        """,
    )

    print("\nFINAL RESPONSE\n")
    print(result.final_output)
    print("\nTYPE:")
    print(type(result.final_output))
    print("\nMISSING SKILLS:")
    print(result.final_output.missing_skills)


if __name__ == "__main__":
    asyncio.run(main())