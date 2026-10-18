
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";


type JobRequirement = {
  name: string;
  description: string;
  priority: "required" | "preferred" | "bonus";
  type: string;
  hard_gate: boolean;
};

type RequirementAssessment = {
  requirement: JobRequirement;
  match: "full" | "partial" | "not_evidenced";
  evidence: string[];
  reasoning: string;
};

type CandidateRequirementAssessment = {
  requirement: JobRequirement;
  match:
    | "satisfied"
    | "partial"
    | "not_satisfied"
    | "unknown";
  evidence: string[];
  reasoning: string;
};

type HardGateAssessment = {
  requirement: JobRequirement;
  status: "satisfied" | "not_satisfied" | "unknown";
  evidence: string[];
  reasoning: string;
};


type FitScore = {
  overall_score: number;
  required_score: number;
  preferred_score: number;
  bonus_score: number;
};


type SavedJob = {
  id: number;
  profile_id: number;
  company_name: string | null;
  job_title: string | null;
  location: string | null;
  salary: string | null;
  employment_type: string | null;
  workplace_type: string | null;
  job_description: string;
  application_status: string;

  analysis: {
    resume_score: FitScore;
    candidate_score: FitScore | null;

    resume_assessment: {
      assessments: RequirementAssessment[];
    };

    candidate_assessment: {
      assessments: CandidateRequirementAssessment[];
    } | null;

    hard_gates: {
        gates: HardGateAssessment[];
    } | null;
  } | null;

  created_at: string;
};


export default function JobDetailsPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<SavedJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadJob() {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/jobs/${jobId}`
        );

        if (!response.ok) {
          throw new Error("Failed to load job.");
        }

        const data: SavedJob = await response.json();

        if (active) {
          setJob(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadJob();

    return () => {
      active = false;
    };
  }, [jobId]);

  const backHref = job
    ? `/jobs?profile_id=${job.profile_id}`
    : "/jobs";

  return (
    <main className="min-h-screen px-5 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={backHref}
          className="text-sm font-medium text-[#8ea1ff] hover:text-white"
        >
          ← Back to Saved Jobs
        </Link>

        {loading ? (
          <p className="mt-10 text-[#8ea1bd]">
            Loading job details...
          </p>
        ) : error ? (
          <p className="mt-10 text-red-400">{error}</p>
        ) : job ? (
          <>
            <header className="mt-8 mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6a87ff]">
                {job.company_name ?? "Unknown Company"}
              </p>

              <h1 className="mt-2 text-3xl font-bold text-[#f5f8fe] md:text-4xl">
                {job.job_title ?? "Job Details"}
              </h1>

              <p className="mt-3 text-[#8ea1bd]">
                {[
                  job.location,
                  job.salary,
                  job.employment_type,
                  job.workplace_type,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </header>

            {job.analysis && (
              <section className="mb-8 rounded-2xl border border-[#19304d] bg-[#071321] p-6 md:p-8">
                <h2 className="text-xl font-semibold text-[#f5f8fe]">
                  Fit Analysis
                </h2>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      ["Overall", "overall_score"],
                      ["Required", "required_score"],
                      ["Preferred", "preferred_score"],
                      ["Bonus", "bonus_score"],
                    ] as const
                  ).map(([label, key]) => {
                    const score =
                      job.analysis?.candidate_score ??
                      job.analysis?.resume_score;

                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-[#263f60] bg-[#0b1828] p-5"
                      >
                        <p className="text-sm text-[#91a3bd]">
                          {label}
                        </p>

                        <p className="mt-2 text-3xl font-bold text-[#f5f8fe]">
                          {score
                            ? `${Math.round(score[key])}%`
                            : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            {job.analysis && (
            <section className="mb-8 rounded-2xl border border-[#19304d] bg-[#071321] p-6 md:p-8">
                <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6a87ff]">
                    Resume Assessment
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#f5f8fe]">
                    Requirement Breakdown
                </h2>

                <p className="mt-2 text-sm text-[#8ea1bd]">
                    See how your resume matches each job requirement.
                </p>
                </div>

                <div className="space-y-4">
                {job.analysis.resume_assessment.assessments.map(
                    (assessment, index) => (
                    <div
                        key={`${assessment.requirement.name}-${index}`}
                        className="rounded-xl border border-[#263f60] bg-[#0b1828] p-5"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h3 className="font-semibold text-[#edf3fb]">
                            {assessment.requirement.name}
                            </h3>

                            <p className="mt-1 text-xs capitalize text-[#8195af]">
                            {assessment.requirement.priority}
                            {" · "}
                            {assessment.requirement.type}
                            </p>
                        </div>

                        <span
                            className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                            assessment.match === "full"
                                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                                : assessment.match === "partial"
                                ? "border-amber-400/25 bg-amber-500/10 text-amber-300"
                                : "border-red-400/25 bg-red-500/10 text-red-300"
                            }`}
                        >
                            {assessment.match === "full"
                            ? "Full Match"
                            : assessment.match === "partial"
                            ? "Partial Match"
                            : "Not Evidenced"}
                        </span>
                        </div>

                        <p className="mt-4 text-sm leading-relaxed text-[#b5c5da]">
                        {assessment.reasoning}
                        </p>

                        {assessment.evidence.length > 0 && (
                        <div className="mt-4 border-t border-[#263f60] pt-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7f93af]">
                            Supporting Evidence
                            </p>

                            <ul className="space-y-2">
                            {assessment.evidence.map(
                                (evidence, evidenceIndex) => (
                                <li
                                    key={evidenceIndex}
                                    className="text-sm text-[#a8bed8]"
                                >
                                    • {evidence}
                                </li>
                                )
                            )}
                            </ul>
                        </div>
                        )}
                    </div>
                    )
                )}
                </div>
            </section>
            )}
            
            {job.analysis?.candidate_assessment && (
            <section className="mb-8 rounded-2xl border border-[#19304d] bg-[#071321] p-6 md:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6a87ff]">
                Candidate Assessment
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#f5f8fe]">
                Final Requirement Breakdown
                </h2>

                <p className="mt-2 text-sm text-[#8ea1bd]">
                Includes your resume and additional candidate information.
                </p>

                <div className="mt-6 space-y-4">
                {job.analysis.candidate_assessment.assessments.map(
                    (assessment, index) => {
                    const statusStyles = {
                        satisfied:
                        "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
                        partial:
                        "border-amber-400/25 bg-amber-500/10 text-amber-300",
                        not_satisfied:
                        "border-red-400/25 bg-red-500/10 text-red-300",
                        unknown:
                        "border-[#314866] bg-[#111f31] text-[#9eb0c8]",
                    };

                    const statusLabels = {
                        satisfied: "Satisfied",
                        partial: "Partial",
                        not_satisfied: "Not Satisfied",
                        unknown: "Unknown",
                    };

                    return (
                        <div
                        key={`${assessment.requirement.name}-${index}`}
                        className="rounded-xl border border-[#263f60] bg-[#0b1828] p-5"
                        >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                            <h3 className="font-semibold text-[#edf3fb]">
                                {assessment.requirement.name}
                            </h3>

                            <p className="mt-1 text-xs capitalize text-[#8195af]">
                                {assessment.requirement.priority}
                                {" · "}
                                {assessment.requirement.type}
                            </p>
                            </div>

                            <span
                            className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                                statusStyles[assessment.match]
                            }`}
                            >
                            {statusLabels[assessment.match]}
                            </span>
                        </div>

                        <p className="mt-4 text-sm leading-relaxed text-[#b5c5da]">
                            {assessment.reasoning}
                        </p>

                        {assessment.evidence.length > 0 && (
                            <div className="mt-4 border-t border-[#263f60] pt-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7f93af]">
                                Supporting Evidence
                            </p>

                            <ul className="space-y-2">
                                {assessment.evidence.map(
                                (evidence, evidenceIndex) => (
                                    <li
                                    key={evidenceIndex}
                                    className="text-sm text-[#a8bed8]"
                                    >
                                    • {evidence}
                                    </li>
                                )
                                )}
                            </ul>
                            </div>
                        )}
                        </div>
                    );
                    }
                )}
                </div>
            </section>
            )}
            
            {job.analysis?.hard_gates && (
            <section className="mb-8 rounded-2xl border border-[#19304d] bg-[#071321] p-6 md:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6a87ff]">
                Eligibility
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#f5f8fe]">
                Hard-Gate Requirements
                </h2>

                <p className="mt-2 text-sm text-[#8ea1bd]">
                Requirements that may determine whether you qualify
                for this position.
                </p>

                <div className="mt-6 space-y-4">
                {job.analysis.hard_gates.gates.length === 0 ? (
                    <p className="text-[#8ea1bd]">
                    No hard-gate requirements were identified.
                    </p>
                ) : (
                    job.analysis.hard_gates.gates.map((gate, index) => {
                    const styles = {
                        satisfied:
                        "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
                        not_satisfied:
                        "border-red-400/25 bg-red-500/10 text-red-300",
                        unknown:
                        "border-amber-400/25 bg-amber-500/10 text-amber-300",
                    };

                    const labels = {
                        satisfied: "Satisfied",
                        not_satisfied: "Not Satisfied",
                        unknown: "Unknown",
                    };

                    return (
                        <div
                        key={`${gate.requirement.name}-${index}`}
                        className="rounded-xl border border-[#263f60] bg-[#0b1828] p-5"
                        >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="font-semibold text-[#edf3fb]">
                            {gate.requirement.name}
                            </h3>

                            <span
                            className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                                styles[gate.status]
                            }`}
                            >
                            {labels[gate.status]}
                            </span>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-[#b5c5da]">
                            {gate.reasoning}
                        </p>

                        {gate.evidence.length > 0 && (
                            <ul className="mt-3 space-y-2 border-t border-[#263f60] pt-3">
                            {gate.evidence.map((evidence, index) => (
                                <li
                                key={index}
                                className="text-sm text-[#a8bed8]"
                                >
                                • {evidence}
                                </li>
                            ))}
                            </ul>
                        )}
                        </div>
                    );
                    })
                )}
                </div>
            </section>
            )}        
            <details className="group rounded-2xl border border-[#19304d] bg-[#071321]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 text-xl font-semibold text-[#f5f8fe] md:p-8 [&::-webkit-details-marker]:hidden">
                Original Job Description

                <span className="text-sm text-[#8ea1ff] transition-transform group-open:rotate-180">
                ▼
                </span>
            </summary>

            <div className="border-t border-[#19304d] px-6 py-6 md:px-8">
                <p className="whitespace-pre-wrap leading-relaxed text-[#b5c5da]">
                {job.job_description}
                </p>
            </div>
            </details>
          </>
        ) : null}
      </div>
    </main>
  );
}
