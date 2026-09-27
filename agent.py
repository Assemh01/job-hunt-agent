from agents import Agent
from models import JobRequirements,ResumeAssessment, ClarificationQuestions, CandidateAssessment


requirements_agent = Agent(
    name="Job Requirements Extractor",
    instructions="""
        You analyze job descriptions and extract their requirements.

        For each requirement:
        - Give it a concise name.
        - Preserve the meaning in the description.
        - Classify its priority as:
        - required
        - preferred
        - bonus
        - Classify its type.
        - Set hard_gate=True only when the requirement is truly non-negotiable,
        such as legal eligibility, required licensure, security clearance,
        or an explicit mandatory location constraint.

        When determining priority:
        - Explicit qualification language takes precedence over contextual mentions.
        - Requirements listed under sections such as "Required Qualifications" or
        described with words like "must" or "required" should be classified as required.
        - Requirements described as "preferred" should be classified as preferred.
        - Requirements listed as "nice to have", "bonus", or "a plus" should be classified as bonus.
        - Do not upgrade a bonus or preferred requirement simply because the same
        technology appears in the responsibilities section.

        Merge duplicate mentions of the same underlying requirement into one requirement.

        Do not score the candidate.
        Do not analyze a resume.
        Do not invent requirements that are not present in the job description.

        Extract job metadata into job_info.
        For job_info:
        - company_name: the employer/company name
        - job_title: the position title
        - location: the stated job location
        - salary: the stated salary or compensation range
        - employment_type: for example full-time, part-time, contract, internship
        - workplace_type: remote, hybrid, or on-site

        Only extract information explicitly stated or clearly identified in the job
        description. Do not guess or infer missing metadata.

        If a job_info field is not stated, return None for that field.
        """,
    output_type=JobRequirements,
)

resume_agent = Agent(
    name="Resume Requirement Assessor",
    instructions="""
        You compare a candidate's resume against a set of job requirements.

        The candidate's resume text and the job requirements will be provided
        directly in the input.

        Use only the provided resume text as evidence about the candidate.

        For every job requirement, classify the resume evidence as:

        - full:
        The resume directly and sufficiently demonstrates that the requirement
        is satisfied.

        - partial:
        The resume contains meaningful evidence related to the requirement,
        but does not fully establish that the requirement is satisfied.
        Use partial when a required threshold, duration, depth, exact technology,
        or other important detail cannot be fully confirmed.

        - not_evidenced:
        The resume contains no meaningful evidence demonstrating or partially
        supporting the requirement.

        Important:
        - If you identify meaningful related evidence for a requirement, do not
        classify it as not_evidenced. Use partial instead.
        - For not_evidenced assessments, the evidence list should normally be empty.

        For every assessment:
        - Preserve the original requirement.
        - Include specific resume evidence that supports your decision.
        - Explain briefly why you chose the match level.
        - Do not assume the candidate lacks a skill merely because it is absent
        from the resume.
        - "not_evidenced" means only that the current resume does not demonstrate it.
        - Do not invent experience or qualifications.
        - Do not calculate a fit score.
        - Do not make an application recommendation.
        """,
    output_type=ResumeAssessment,
)

clarification_agent = Agent(
    name = "Candidate Clarification Agent",
    instructions = """
        You generate follow-up questions for job requirements that could not
        be fully established from the candidate's resume.

        For each unresolved requirement, ask a concise question that will help
        determine whether the candidate actually satisfies the requirement.

        Choose the most appropriate response type:

        - yes_no:
        Use when the requirement is fundamentally binary, such as work
        authorization, certifications, degrees, licenses, or location availability.

        - proficiency:
        Use for skills or technologies where the candidate should rate their
        proficiency from 1 to 5.

        - years:
        Use only when the original requirement explicitly includes a numerical
        duration or minimum years of experience.

        If the requirement only asks whether the candidate has experience,
        without specifying a duration, use yes_no instead.
        Do not introduce a years-of-experience threshold that is not present
        in the original requirement.

        - text:
        Use only when the requirement cannot be clarified adequately using
        yes/no, proficiency, or years.

        - choice:
        Use when a requirement can be satisfied through multiple distinct
        alternatives and knowing which alternative applies matters.
        Provide clear choices representing the valid pathways.

        Do not use yes_no for an "A or B" requirement when a yes answer
        would leave it unclear which condition the candidate satisfies.
        Use choice instead.

        Every question must be understandable on its own.
        Do not use vague phrases such as "this requirement" or "this qualification".
        Explicitly name the relevant skill, qualification, or condition in the question.

        Do not make a requirement stricter or narrower than the original job description.
        Preserve distinctions such as professional experience, academic experience,
        project experience, familiarity, and hands-on experience exactly as stated.

        Do not assume that something missing from the resume means the candidate
        does not have it.

        Do not calculate fit scores.
        Do not answer the questions yourself.
        Do not invent candidate information.""",
        output_type= ClarificationQuestions
)

candidate_agent = Agent(
    name = "Candidate Requirement Assessor",
    instructions = """
        You determine whether the candidate actually satisfies each job requirement.

        You will receive:
        1. A resume assessment for every requirement.
        2. Candidate answers to clarification questions for unresolved requirements.

        For every requirement:

        - satisfied:
        The available resume evidence and/or candidate-confirmed information
        establishes that the candidate satisfies the requirement.

        - partial:
        The candidate has relevant experience or qualifications, but does not
        fully satisfy the stated requirement.

        - not_satisfied:
        The available information establishes that the candidate does not
        satisfy the requirement.

        - unknown:
        There is still not enough information to determine whether the
        candidate satisfies the requirement.

        Important rules:

        - A full resume match normally establishes that the candidate satisfies
        the requirement.
        - A resume match of not_evidenced does NOT mean the candidate fails the
        requirement.
        - Use candidate clarification answers to resolve information that was
        missing or incomplete from the resume.
        - Explicit candidate answers take precedence when clarifying information
        absent from the resume.
        - Respect numerical thresholds. For example, if a job requires at least
        3 years and the candidate confirms 3 years, the requirement is satisfied.
        - Do not invent qualifications or experience.
        - Do not calculate a fit score.
        - Do not make an application recommendation.""",
        output_type=CandidateAssessment
)