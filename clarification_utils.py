from models import (
    ClarificationQuestions,
    ClarificationAnswer,
    ClarificationAnswers,
    QuestionType,
)


def collect_answers(
    questions: ClarificationQuestions,
) -> ClarificationAnswers:

    answers = []

    for item in questions.questions:
        print(f"\n{item.question}")

        if item.response_type == QuestionType.YES_NO:
            raw = input("Enter yes/no: ").strip().lower()
            answer = raw in ["yes", "y"]

        elif item.response_type == QuestionType.YEARS:
            answer = float(input("Enter years: "))

        elif item.response_type == QuestionType.PROFICIENCY:
            answer = int(input("Enter proficiency (1-5): "))

        elif item.response_type == QuestionType.CHOICE:
            for index, choice in enumerate(item.choices, start=1):
                print(f"{index}. {choice}")

            selected = int(input("Choose an option: "))
            answer = item.choices[selected - 1]

        else:
            answer = input("Enter response: ")

        answers.append(
            ClarificationAnswer(
                requirement=item.requirement,
                response_type=item.response_type,
                answer=answer,
            )
        )

    return ClarificationAnswers(answers=answers)