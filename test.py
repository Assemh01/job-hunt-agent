from models import (
    JobRequirements,
    JobRequirement,
    RequirementPriority,
    RequirementType,
)


test = JobRequirements(
    job_title="AI Engineer",
    requirements=[
        JobRequirement(
            name="Python",
            description="Strong Python programming experience",
            priority=RequirementPriority.REQUIRED,
            type=RequirementType.SKILL,
        ),
        JobRequirement(
            name="AWS",
            description="AWS experience preferred",
            priority=RequirementPriority.PREFERRED,
            type=RequirementType.SKILL,
        ),
    ],
)

print(test)
print(test.model_dump())