"use client";

import { useState } from "react";

type Requirement = {
  name: string;
  description: string;
  priority: "required" | "preferred" | "bonus";
  type: string;
  hard_gate: boolean;
};

type FitScore = {
  overall_score: number;
  required_score: number;
  preferred_score: number;
  bonus_score: number;
};

type ResponseType =
  | "yes_no"
  | "proficiency"
  | "years"
  | "text"
  | "choice";

type ClarificationQuestion = {
  requirement: Requirement;
  question: string;
  response_type: ResponseType;
  choices: string[];
};

type HardGate = {
  requirement: Requirement;
  status: "satisfied" | "not_satisfied" | "unknown";
  evidence: string[];
  reasoning: string;
};

type JobAnalysisResult = {
  requirements: {
    job_title: string | null;
    requirements: Requirement[];
  };

  resume_assessment: {
    assessments: unknown[];
  };

  resume_score: FitScore;

  clarification_questions: {
    questions: ClarificationQuestion[];
  };

  candidate_assessment: {
    assessments: unknown[];
  } | null;

  candidate_score: FitScore | null;

  hard_gates: {
    gates: HardGate[];
  } | null;
};

type AnswerValue = string | number | boolean;

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] =
    useState<JobAnalysisResult | null>(null);

  const [answers, setAnswers] = useState<
    Record<number, AnswerValue>
  >({});

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);
    setAnswers({});

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_description: jobDescription,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to analyze job.");
      }

      const data: JobAnalysisResult =
        await response.json();

      setAnalysis(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(
    index: number,
    value: AnswerValue
  ) {
    setAnswers((current) => ({
      ...current,
      [index]: value,
    }));
  }

  function allQuestionsAnswered() {
    if (!analysis) {
      return false;
    }

    return analysis.clarification_questions.questions.every(
      (_, index) =>
        answers[index] !== undefined &&
        answers[index] !== ""
    );
  }

  async function handleSubmitClarifications() {
    if (!analysis) {
      return;
    }

    if (!allQuestionsAnswered()) {
      setError("Please answer every clarification question.");
      return;
    }

    setSubmitting(true);
    setError("");

    const clarificationAnswers =
      analysis.clarification_questions.questions.map(
        (question, index) => ({
          requirement: question.requirement,
          response_type: question.response_type,
          answer: answers[index],
        })
      );

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/clarifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            analysis,
            answers: {
              answers: clarificationAnswers,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to submit clarification answers."
        );
      }

      const data: JobAnalysisResult =
        await response.json();

      setAnalysis(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Job Hunt Copilot
          </h1>

          <p className="mt-2 text-gray-600">
            Paste a job description to see how well your
            resume matches.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <label
            htmlFor="job-description"
            className="mb-2 block font-medium text-gray-900"
          >
            Job Description
          </label>

          <textarea
            id="job-description"
            value={jobDescription}
            onChange={(event) =>
              setJobDescription(event.target.value)
            }
            placeholder="Paste the full job description here..."
            className="min-h-64 w-full resize-y rounded-lg border border-gray-300 p-4 text-gray-900 outline-none focus:border-gray-500"
          />

          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-4 rounded-lg bg-gray-900 px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {analysis && (
          <>
            <ScoreSection
              title="Resume Fit"
              score={analysis.resume_score}
              jobTitle={analysis.requirements.job_title}
            />

            {!analysis.candidate_assessment &&
              analysis.clarification_questions.questions
                .length > 0 && (
                <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Clarification Questions
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Help fill in information that your
                      resume could not confirm.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {analysis.clarification_questions.questions.map(
                      (question, index) => (
                        <QuestionField
                          key={`${question.requirement.name}-${index}`}
                          question={question}
                          value={answers[index]}
                          onChange={(value) =>
                            updateAnswer(index, value)
                          }
                        />
                      )
                    )}
                  </div>

                  <button
                    onClick={
                      handleSubmitClarifications
                    }
                    disabled={
                      submitting ||
                      !allQuestionsAnswered()
                    }
                    className="mt-8 rounded-lg bg-gray-900 px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? "Calculating..."
                      : "Calculate Candidate Fit"}
                  </button>
                </div>
              )}

            {analysis.candidate_score && (
              <ScoreSection
                title="Candidate Fit"
                score={analysis.candidate_score}
                jobTitle={
                  analysis.requirements.job_title
                }
              />
            )}

            {analysis.hard_gates && (
              <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">
                  Hard Gates
                </h2>

                {analysis.hard_gates.gates.length ===
                0 ? (
                  <p className="mt-4 text-gray-500">
                    No hard-gate requirements were
                    identified.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {analysis.hard_gates.gates.map(
                      (gate) => (
                        <div
                          key={gate.requirement.name}
                          className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {
                                gate.requirement
                                  .name
                              }
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {gate.reasoning}
                            </p>
                          </div>

                          <HardGateBadge
                            status={gate.status}
                          />
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: ClarificationQuestion;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}) {
  return (
    <div>
      <p className="font-medium text-gray-900">
        {question.question}
      </p>

      <p className="mt-1 text-sm text-gray-500">
        {question.requirement.name}
      </p>

      <div className="mt-3">
        {question.response_type === "yes_no" && (
          <div className="flex gap-3">
            <AnswerButton
              selected={value === true}
              onClick={() => onChange(true)}
            >
              Yes
            </AnswerButton>

            <AnswerButton
              selected={value === false}
              onClick={() => onChange(false)}
            >
              No
            </AnswerButton>
          </div>
        )}

        {question.response_type === "years" && (
          <input
            type="number"
            min="0"
            step="0.5"
            value={
              typeof value === "number"
                ? value
                : ""
            }
            onChange={(event) =>
              onChange(
                Number(event.target.value)
              )
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-500"
            placeholder="Years of experience"
          />
        )}

        {question.response_type ===
          "proficiency" && (
          <select
            value={
              typeof value === "number"
                ? value
                : ""
            }
            onChange={(event) =>
              onChange(
                Number(event.target.value)
              )
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-500"
          >
            <option value="">
              Select proficiency
            </option>
            <option value="1">1 - Beginner</option>
            <option value="2">2</option>
            <option value="3">3 - Intermediate</option>
            <option value="4">4</option>
            <option value="5">5 - Expert</option>
          </select>
        )}

        {question.response_type === "choice" && (
          <select
            value={
              typeof value === "string"
                ? value
                : ""
            }
            onChange={(event) =>
              onChange(event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-500"
          >
            <option value="">
              Select an option
            </option>

            {question.choices.map((choice) => (
              <option
                key={choice}
                value={choice}
              >
                {choice}
              </option>
            ))}
          </select>
        )}

        {question.response_type === "text" && (
          <input
            type="text"
            value={
              typeof value === "string"
                ? value
                : ""
            }
            onChange={(event) =>
              onChange(event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-500"
            placeholder="Enter your answer"
          />
        )}
      </div>
    </div>
  );
}

function AnswerButton({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-5 py-2.5 font-medium ${
        selected
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-300 bg-white text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function ScoreSection({
  title,
  score,
  jobTitle,
}: {
  title: string;
  score: FitScore;
  jobTitle: string | null;
}) {
  return (
    <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
        {title}
      </p>

      <div className="mt-2 text-5xl font-bold text-gray-900">
        {Math.round(score.overall_score)}%
      </div>

      {jobTitle && (
        <p className="mt-2 text-gray-600">
          {jobTitle}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <ScoreCard
          label="Required"
          score={score.required_score}
        />

        <ScoreCard
          label="Preferred"
          score={score.preferred_score}
        />

        <ScoreCard
          label="Bonus"
          score={score.bonus_score}
        />
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold text-gray-900">
        {Math.round(score)}%
      </p>
    </div>
  );
}

function HardGateBadge({
  status,
}: {
  status:
    | "satisfied"
    | "not_satisfied"
    | "unknown";
}) {
  const labels = {
    satisfied: "Satisfied",
    not_satisfied: "Not Satisfied",
    unknown: "Unknown",
  };

  return (
    <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700">
      {labels[status]}
    </span>
  );
}