
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

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
  } | null;
  created_at: string;
};

export default function JobDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
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

            <section className="rounded-2xl border border-[#19304d] bg-[#071321] p-6 md:p-8">
              <h2 className="text-xl font-semibold text-[#f5f8fe]">
                Original Job Description
              </h2>

              <p className="mt-5 whitespace-pre-wrap leading-relaxed text-[#b5c5da]">
                {job.job_description}
              </p>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
