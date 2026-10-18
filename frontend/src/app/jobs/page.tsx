
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ApplicationStatus =
  | "saved"
  | "applied"
  | "interview"
  | "rejected"
  | "offer";


type SavedJob = {
  id: number;
  profile_id: number;
  company_name: string | null;
  job_title: string | null;
  location: string | null;
  application_status: ApplicationStatus;
  analysis: {
    resume_score: {
      overall_score: number;
    };
    candidate_score: {
      overall_score: number;
    } | null;
  } | null;
  created_at: string;
};

function SavedJobsContent() {
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profile_id");

  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [updatingJobId, setUpdatingJobId] =
    useState<number | null>(null);

    const [deletingJobId, setDeletingJobId] =
  useState<number | null>(null);
    const [jobToDelete, setJobToDelete] =
  useState<SavedJob | null>(null);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    let active = true;

    async function loadJobs() {
      setLoading(true);
      setError("");
      setJobs([]);

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/profiles/${profileId}/jobs`
        );

        if (!response.ok) {
          throw new Error("Failed to load saved jobs.");
        }

        const data: SavedJob[] = await response.json();

        if (active) {
          setJobs(data);
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

    void loadJobs();

    return () => {
      active = false;
    };
  }, [profileId]);
  
    async function handleStatusChange(
    jobId: number,
    status: ApplicationStatus
    ) {
    setUpdatingJobId(jobId);
    setError("");

    try {
        const response = await fetch(
        `http://127.0.0.1:8000/jobs/${jobId}`,
        {
            method: "PATCH",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            application_status: status,
            }),
        }
        );

        if (!response.ok) {
        throw new Error("Failed to update application status.");
        }

        const updatedJob: SavedJob = await response.json();

        setJobs((current) =>
        current.map((job) =>
            job.id === updatedJob.id ? updatedJob : job
        )
        );
    } catch (err) {
        setError(
        err instanceof Error
            ? err.message
            : "Something went wrong."
        );
    } finally {
        setUpdatingJobId(null);
    }
    }
    
async function handleDeleteJob() {
  if (!jobToDelete) return;

  const jobId = jobToDelete.id;

  setDeletingJobId(jobId);
  setError("");

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/jobs/${jobId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete saved job.");
    }

    setJobs((current) =>
      current.filter((job) => job.id !== jobId)
    );

    setJobToDelete(null);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Something went wrong."
    );
  } finally {
    setDeletingJobId(null);
  }
}

  return (
    <main className="min-h-screen px-5 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#6a87ff]">
            AI Career Workspace
          </p>

          <h1 className="text-4xl font-bold text-[#f5f8fe] md:text-5xl">
            Saved Jobs
          </h1>

          <p className="mt-3 text-[#8ea1bd]">
            Manage your opportunities and track your applications.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl border border-[#314866] bg-[#111f31] px-5 py-2.5 text-sm font-semibold text-[#dce8f7] hover:border-[#6a87ff]"
          >
            ← Back to Analyze
          </Link>
        </header>

        {!profileId ? (
          <p className="text-[#8ea1bd]">
            Select a profile on the Analyze page to view its jobs.
          </p>
        ) : loading ? (
          <p className="text-[#8ea1bd]">
            Loading saved jobs...
          </p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : jobs.length === 0 ? (
          <section className="rounded-2xl border border-[#19304d] bg-[#071321] p-8">
            <h2 className="text-xl font-semibold text-[#f5f8fe]">
              No saved jobs yet
            </h2>
            <p className="mt-2 text-[#8ea1bd]">
              Analyze a job and save it to see it here.
            </p>
          </section>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {jobs.map((job) => {
              const score =
                job.analysis?.candidate_score?.overall_score ??
                job.analysis?.resume_score.overall_score;

              return (
                <article
                  key={job.id}
                  className="rounded-2xl border border-[#19304d] bg-[#071321] p-6 shadow-xl shadow-black/20"
                >
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-[#8199bb]">
                        {job.company_name ?? "Unknown Company"}
                      </p>

                      <h2 className="mt-2 text-xl font-semibold text-[#f5f8fe]">
                        {job.job_title ?? "Job title unavailable"}
                      </h2>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-bold text-[#c4e879]">
                        {score !== undefined
                          ? `${Math.round(score)}%`
                          : "—"}
                      </p>
                      <p className="text-xs text-[#8195af]">
                        Fit Score
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[#8ea1bd]">
                        {job.location ?? "Location not specified"}
                    </p>

                    <Link
                        href={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#314866] bg-[#111f31] px-4 py-2 text-sm font-medium text-[#c0d0e5] transition hover:border-[#6a87ff] hover:text-white"
                    >
                        View Details →
                    </Link>
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#19304d] pt-4">
                    <select
                        aria-label={`Application status for ${job.job_title ?? "saved job"}`}
                        value={job.application_status}
                        onChange={(event) =>
                        void handleStatusChange(
                            job.id,
                            event.target.value as ApplicationStatus
                        )
                        }
                        disabled={updatingJobId === job.id}
                        className="rounded-lg border border-[#314866] bg-[#111f31] px-3 py-2 text-sm font-medium capitalize text-[#c0d0e5] outline-none transition hover:border-[#6a87ff] focus:border-[#6a87ff] disabled:cursor-wait disabled:opacity-50"
                    >
                        <option value="saved">Saved</option>
                        <option value="applied">Applied</option>
                        <option value="interview">Interview</option>
                        <option value="rejected">Rejected</option>
                        <option value="offer">Offer</option>
                    </select>

                    <button
                        type="button"
                        onClick={() => setJobToDelete(job)}
                        className="rounded-lg border border-red-400/20 px-4 py-2 text-sm font-medium text-red-300 transition hover:border-red-400/40 hover:bg-red-500/10"
                    >
                        Delete
                    </button>
                    </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
        {jobToDelete && (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5"
            role="presentation"
        >
            <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-job-title"
            className="w-full max-w-md rounded-2xl border border-[#304461] bg-[#0b1828] p-6 shadow-2xl"
            >
            <h2
                id="delete-job-title"
                className="text-xl font-semibold text-[#f5f8fe]"
            >
                Delete saved job?
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-[#9eb0c8]">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-[#edf3fb]">
                {jobToDelete.job_title ?? "this job"}
                </span>
                ? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
                <button
                type="button"
                onClick={() => setJobToDelete(null)}
                disabled={deletingJobId !== null}
                className="rounded-xl border border-[#314866] px-4 py-2.5 text-sm font-medium text-[#c0d0e5] transition hover:bg-[#142b48] disabled:opacity-50"
                >
                Cancel
                </button>

                <button
                type="button"
                onClick={() => void handleDeleteJob()}
                disabled={deletingJobId !== null}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-50"
                >
                {deletingJobId !== null
                    ? "Deleting..."
                    : "Delete Job"}
                </button>
            </div>
            </div>
        </div>
        )}
    </main>
  );
}


export default function SavedJobsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen px-5 py-10 text-[#8ea1bd]">
        Loading saved jobs...
      </main>
    }>
      <SavedJobsContent />
    </Suspense>
  );
}
