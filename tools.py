from agents import function_tool


@function_tool
def get_resume() -> str:
    """Returns the candidate's resume and professional background."""

    return """
    Name: Assem Homsi

    Skills:
    - Python
    - FastAPI
    - Flask
    - SQL
    - Docker
    - AWS
    - LangChain
    - LangGraph
    - RAG
    - LLM evaluation
    - Airflow
    - Spark
    - Milvus

    Experience:

    boxMind.ai
    Machine Learning / Data Engineer, later Technical Lead

    - Built enterprise generative AI applications.
    - Developed RAG pipelines and evaluation systems.
    - Built agentic AI systems.
    - Developed OCR pipelines.
    - Built backend services using Python and FastAPI.
    - Worked with AWS Lambda, S3, and API Gateway.
    - Built automated workflows using Airflow.
    - Used Docker and GitHub Actions.

    Inspyr Solutions / Apple
    AI Evaluation / Quality

    - Evaluated AI-generated responses.
    - Validated information quality and correctness.
    """