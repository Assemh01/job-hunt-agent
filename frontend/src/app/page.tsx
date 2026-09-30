"use client";

import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";

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

type JobInfo = {
  company_name: string | null;
  job_title: string | null;
  location: string | null;
  salary: string | null;
  employment_type: string | null;
  workplace_type: string | null;
};

type JobAnalysisResult = {
  requirements: {
    job_info: JobInfo;
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

type Profile = {
  id: number;
  name: string;
  resume_filename: string | null;
  has_resume: boolean;
};

const MIN_ANALYZE_LOADING_MS = 1400;
const MIN_CANDIDATE_LOADING_MS = 1400;

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

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] =
    useState<number | null>(null);

  const [profilesLoading, setProfilesLoading] =
    useState(true);

  const [newProfileName, setNewProfileName] =
    useState("");

  const [creatingProfile, setCreatingProfile] =
    useState(false);

  const selectedProfile =
    profiles.find(
      (profile) => profile.id === selectedProfileId
    ) ?? null;

  const [uploadingResume, setUploadingResume] =
  useState(false);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/profiles"
        );

        if (!response.ok) {
          throw new Error("Failed to load profiles.");
        }

        const data: Profile[] = await response.json();

        setProfiles(data);

        if (data.length > 0) {
          setSelectedProfileId(data[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load profiles."
        );
      } finally {
        setProfilesLoading(false);
      }
    }

    loadProfiles();
  }, []);

  async function waitForMinimumTime(
    startedAt: number,
    minimumMs: number
  ) {
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(
      0,
      minimumMs - elapsed
    );

    if (remaining > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, remaining)
      );
    }
  }
  async function handleResumeUpload(file: File) {
    if (!selectedProfileId) {
      setError("Please select a profile first.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Resume must be a PDF.");
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("PDF must be smaller than 10 MB.");
      return;
    }

    setUploadingResume(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/profiles/${selectedProfileId}/resume`,
        {
          method: "PUT",
          body: formData,
        }
      );

      if (!response.ok) {
        let message = "Failed to upload resume.";

        try {
          const data = await response.json();

          if (typeof data.detail === "string") {
            message = data.detail;
          }
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const updatedProfile: Profile =
        await response.json();

      setProfiles((current) =>
        current.map((profile) =>
          profile.id === updatedProfile.id
            ? updatedProfile
            : profile
        )
      );

      setAnalysis(null);
      setAnswers({});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload resume."
      );
    } finally {
      setUploadingResume(false);
    }
  }
  async function handleCreateProfile() {
    const name = newProfileName.trim();

    if (!name) {
      setError("Please enter a profile name.");
      return;
    }

    setCreatingProfile(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/profiles",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create profile.");
      }

      const profile: Profile = await response.json();

      setProfiles((current) => [
        ...current,
        profile,
      ]);

      setSelectedProfileId(profile.id);
      setNewProfileName("");

      setAnalysis(null);
      setAnswers({});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create profile."
      );
    } finally {
      setCreatingProfile(false);
    }
  }

  function handleProfileChange(profileId: number) {
    setSelectedProfileId(profileId);

    setAnalysis(null);
    setAnswers({});
    setError("");
  }

  async function handleAnalyze() {
    if (!selectedProfileId) {
      setError("Please select a profile.");
      return;
    }

    if (!selectedProfile?.has_resume) {
      setError(
        "The selected profile does not have a resume."
      );
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);
    setAnswers({});

    const startedAt = performance.now();

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profile_id: selectedProfileId,
            job_description: jobDescription,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to analyze job.");
      }

      const data: JobAnalysisResult =
        await response.json();

      await waitForMinimumTime(
        startedAt,
        MIN_ANALYZE_LOADING_MS
      );

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
    if (!analysis || !selectedProfileId) {
      return;
    }

    if (!allQuestionsAnswered()) {
      setError(
        "Please answer every clarification question."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    const startedAt = performance.now();

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
            profile_id: selectedProfileId,
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

      await waitForMinimumTime(
        startedAt,
        MIN_CANDIDATE_LOADING_MS
      );

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
    <main className="min-h-screen px-5 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#6a87ff]">
            AI Career Workspace
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#f5f8fe] md:text-5xl">
            Job Hunt Copilot
          </h1>

          <p className="mt-3 max-w-2xl text-[#8ea1bd]">
            Analyze a role against your resume, resolve
            missing information, and understand your true
            candidate fit.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-[#19304d] bg-[#071321] p-6 shadow-xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6a87ff]">
                Candidate Profile
              </p>

              <h2 className="mt-2 text-xl font-semibold text-[#f5f8fe]">
                Select Profile
              </h2>

              <p className="mt-1 text-sm text-[#7f93af]">
                Choose which resume and saved candidate
                information should be used for job analysis.
              </p>

              <select
                value={selectedProfileId ?? ""}
                onChange={(event) =>
                  handleProfileChange(
                    Number(event.target.value)
                  )
                }
                disabled={
                  profilesLoading ||
                  profiles.length === 0
                }
                className="mt-4 w-full rounded-xl border border-[#314866] bg-[#111f31] px-4 py-3 text-[#edf2fb] outline-none transition focus:border-[#6a87ff] focus:ring-2 focus:ring-[#6a87ff]/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {profilesLoading && (
                  <option value="">
                    Loading profiles...
                  </option>
                )}

                {!profilesLoading &&
                  profiles.length === 0 && (
                    <option value="">
                      No profiles yet
                    </option>
                  )}

                {profiles.map((profile) => (
                  <option
                    key={profile.id}
                    value={profile.id}
                  >
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium text-[#9eb0c8]">
                Create a new profile
              </p>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(event) =>
                    setNewProfileName(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleCreateProfile();
                    }
                  }}
                  placeholder="Profile name"
                  className="flex-1 rounded-xl border border-[#314866] bg-[#111f31] px-4 py-3 text-[#edf2fb] outline-none transition placeholder:text-[#7288a3] focus:border-[#6a87ff] focus:ring-2 focus:ring-[#6a87ff]/15"
                />

                <button
                  type="button"
                  onClick={handleCreateProfile}
                  disabled={
                    creatingProfile ||
                    !newProfileName.trim()
                  }
                  className="rounded-xl border border-[#425d83] bg-[#10223a] px-5 py-3 font-semibold text-[#dce8f7] transition hover:border-[#6a87ff] hover:bg-[#142b48] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {creatingProfile
                    ? "Creating..."
                    : "Create Profile"}
                </button>
              </div>
            </div>
          </div>

          {selectedProfile && (
            <div className="mt-6 rounded-xl border border-[#263f60] bg-[#0b1828] p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7188a7]">
                    Active Profile
                  </p>

                  <p className="mt-1 font-semibold text-[#f5f8fe]">
                    {selectedProfile.name}
                  </p>

                  {selectedProfile.resume_filename ? (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#12243a] text-sm text-[#8eb1ff]">
                        PDF
                      </span>

                      <div>
                        <p className="text-sm text-[#b7c7da]">
                          {selectedProfile.resume_filename}
                        </p>

                        <p className="text-xs text-[#667d9a]">
                          Resume ready for analysis
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#8195af]">
                      No resume has been uploaded yet.
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <span
                    className={`w-fit rounded-full border px-3 py-1.5 text-xs font-medium ${
                      selectedProfile.has_resume
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-400/20 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {selectedProfile.has_resume
                      ? "Resume uploaded"
                      : "No resume"}
                  </span>

                  <label
                    className={`cursor-pointer rounded-xl border border-[#425d83] bg-[#10223a] px-4 py-2.5 text-sm font-semibold text-[#dce8f7] transition hover:border-[#6a87ff] hover:bg-[#142b48] ${
                      uploadingResume
                        ? "pointer-events-none opacity-50"
                        : ""
                    }`}
                  >
                    {uploadingResume
                      ? "Processing Resume..."
                      : selectedProfile.has_resume
                      ? "Replace Resume"
                      : "Upload Resume"}

                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      disabled={uploadingResume}
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0];

                        if (file) {
                          void handleResumeUpload(file);
                        }

                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              {uploadingResume && (
                <div className="mt-5 border-t border-[#213753] pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#334d70] border-t-[#6a87ff]" />

                    <div>
                      <p className="text-sm font-medium text-[#c9d7e8]">
                        Reading and parsing resume...
                      </p>

                      <p className="mt-0.5 text-xs text-[#7187a3]">
                        Extracting your experience, skills,
                        education, and certifications.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#19304d] bg-[#071321] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-[#f5f8fe]">
              Analyze a Job
            </h2>

            <p className="mt-1 text-sm text-[#7f93af]">
              Paste the full job description below.
            </p>
          </div>

          <textarea
            suppressHydrationWarning
            value={jobDescription}
            onChange={(event) =>
              setJobDescription(event.target.value)
            }
            placeholder="Paste the full job description here..."
            className="min-h-72 w-full resize-y rounded-xl border border-[#172a45] bg-[#020917] p-5 text-[#edf2fb] outline-none transition placeholder:text-[#556882] focus:border-[#6a87ff] focus:ring-2 focus:ring-[#6a87ff]/15"
          />

          {selectedProfile &&
            !selectedProfile.has_resume && (
              <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Upload a resume for{" "}
                <span className="font-semibold">
                  {selectedProfile.name}
                </span>{" "}
                before analyzing a job.
              </div>
            )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={
              loading ||
              !selectedProfile ||
              !selectedProfile.has_resume
            }
            className="mt-5 rounded-xl bg-[#6a87ff] px-6 py-3 font-semibold text-white transition hover:bg-[#8098ff] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? "Analyzing..."
              : "Analyze Job"}
          </button>
        </section>

        {loading && (
          <ScoreLoadingSection
            title="Resume Fit"
            message="Extracting requirements and calculating resume match..."
          />
        )}

        {analysis && (
          <>
            <ScoreSection
              title="Resume Fit"
              score={analysis.resume_score}
              jobInfo={analysis.requirements.job_info}
            />
            {!analysis.candidate_assessment &&
              analysis.clarification_questions.questions
                .length > 0 && (
                <section className="mt-8 rounded-2xl border border-[#19304d] bg-[#071321] p-6 shadow-xl shadow-black/30 md:p-8">
                  <div className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6a87ff]">
                      Candidate Context
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold text-[#f5f8fe]">
                      Clarification Questions
                    </h2>

                    <p className="mt-2 text-[#7f93af]">
                      Your resume could not confirm these
                      details. Answer them to calculate your
                      candidate fit.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {analysis.clarification_questions.questions.map(
                      (question, index) => (
                        <QuestionField
                          key={`${question.requirement.name}-${index}`}
                          question={question}
                          value={answers[index]}
                          onChange={(value) =>
                            updateAnswer(
                              index,
                              value
                            )
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
                    className="mt-8 rounded-xl bg-[#6a87ff] px-6 py-3 font-semibold text-white transition hover:bg-[#8098ff] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting
                      ? "Calculating Candidate Fit..."
                      : "Calculate Candidate Fit"}
                  </button>
                </section>
              )}

            {submitting && (
              <ScoreLoadingSection
                title="Candidate Fit"
                message="Applying your answers and recalculating overall fit..."
              />
            )}

            {analysis.candidate_score &&
              !submitting && (
                <ScoreSection
                  title="Candidate Fit"
                  score={analysis.candidate_score}
                  jobInfo={analysis.requirements.job_info}
                />
              )}

            {analysis.hard_gates &&
              !submitting && (
                <HardGatesSection
                  gates={
                    analysis.hard_gates.gates
                  }
                />
              )}
          </>
        )}
      </div>
    </main>
  );
}

function ScoreSection({
  title,
  score,
  jobInfo,
}: {
  title: string;
  score: FitScore;
  jobInfo: JobInfo;
}) {
  const jobMeta = [
    jobInfo.location,
    jobInfo.salary,
    jobInfo.employment_type,
    jobInfo.workplace_type,
  ].filter(Boolean);

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#19304d] bg-[#071321] shadow-xl shadow-black/30">
      <div className="border-b border-[#19304d] bg-[#091827] px-6 py-5 md:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6a87ff]">
              {title}
            </p>

            <div className="mt-2">
              <h2 className="text-2xl font-semibold text-[#f5f8fe]">
                {jobInfo.job_title ?? "Job Analysis"}
              </h2>

              {jobInfo.company_name && (
                <p className="mt-1 text-base font-medium text-[#9eb0c8]">
                  {jobInfo.company_name}
                </p>
              )}
            </div>

            {jobMeta.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {jobMeta.map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-[#263f60] bg-[#0c1b2d] px-3 py-1.5 text-xs font-medium text-[#91a8c4]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-sm text-[#7f93af]">
            Match breakdown
          </p>
        </div>
      </div>

      <div className="px-6 py-10 md:px-10 md:py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <ProgressRing
            label="Required"
            score={score.required_score}
            size={175}
            strokeWidth={11}
          />

          <ProgressRing
            label="Preferred"
            score={score.preferred_score}
            size={175}
            strokeWidth={11}
          />

          <ProgressRing
            label="Bonus"
            score={score.bonus_score}
            size={175}
            strokeWidth={11}
          />
        </div>

        <div className="mt-12 flex justify-center">
          <ProgressRing
            label="Overall"
            score={score.overall_score}
            size={250}
            strokeWidth={14}
            primary
          />
        </div>
      </div>
    </section>
  );
}

function ScoreLoadingSection({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#19304d] bg-[#071321] shadow-xl shadow-black/30">
      <div className="border-b border-[#19304d] px-6 py-5 md:px-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6a87ff]">
              {title}
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-[#f5f8fe]">
              Calculating...
            </h2>
          </div>

          <p className="text-sm text-[#7f93af]">
            {message}
          </p>
        </div>
      </div>

      <div className="px-6 py-10 md:px-10 md:py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <LoadingRing
            label="Required"
            size={175}
            strokeWidth={11}
          />

          <LoadingRing
            label="Preferred"
            size={175}
            strokeWidth={11}
          />

          <LoadingRing
            label="Bonus"
            size={175}
            strokeWidth={11}
          />
        </div>

        <div className="mt-12 flex justify-center">
          <LoadingRing
            label="Overall"
            size={250}
            strokeWidth={14}
            primary
          />
        </div>
      </div>
    </section>
  );
}

function ProgressRing({
  label,
  score,
  size,
  strokeWidth,
  primary = false,
}: {
  label: string;
  score: number;
  size: number;
  strokeWidth: number;
  primary?: boolean;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);

  const filterId = useId().replace(/:/g, "");

  const safeScore = Math.max(
    0,
    Math.min(100, score)
  );

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const offset =
    circumference -
    (animatedScore / 100) * circumference;

  const colors = getScoreColors(safeScore);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimatedScore(safeScore);
    });

    return () => cancelAnimationFrame(frame);
  }, [safeScore]);

  return (
    <div className="flex flex-col items-center">
      <p
        className={`mb-4 font-semibold ${
          primary
            ? "text-lg text-[#f5f8fe]"
            : "text-sm uppercase tracking-[0.12em] text-[#91a3bd]"
        }`}
      >
        {label}
      </p>

      <div
        className="relative"
        style={{
          width: size,
          height: size,
        }}
      >
        <svg
          width={size}
          height={size}
          className="-rotate-90 overflow-visible"
        >
          <defs>
            <filter
              id={filterId}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur
                stdDeviation={primary ? 5 : 4}
              />
            </filter>
          </defs>

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#12233b"
            strokeWidth={strokeWidth}
          />

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={colors.stroke}
            strokeWidth={strokeWidth + 3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            opacity={0.32}
            filter={`url(#${filterId})`}
            style={{
              transition:
                "stroke-dashoffset 1500ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition:
                "stroke-dashoffset 1500ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber
            value={safeScore}
            large={primary}
          />

          {primary && (
            <span
              className="mt-1 text-xs uppercase tracking-[0.16em]"
              style={{ color: colors.label }}
            >
              Fit Score
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingRing({
  label,
  size,
  strokeWidth,
  primary = false,
}: {
  label: string;
  size: number;
  strokeWidth: number;
  primary?: boolean;
}) {
  const filterId = useId().replace(/:/g, "");

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * 0.28;

  const color = primary
    ? "#8b5cf6"
    : "#6a87ff";

  return (
    <div className="flex flex-col items-center">
      <p
        className={`mb-4 font-semibold ${
          primary
            ? "text-lg text-[#f5f8fe]"
            : "text-sm uppercase tracking-[0.12em] text-[#91a3bd]"
        }`}
      >
        {label}
      </p>

      <div
        className="relative"
        style={{
          width: size,
          height: size,
        }}
      >
        <svg
          width={size}
          height={size}
          className="-rotate-90 overflow-visible"
        >
          <defs>
            <filter
              id={filterId}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur
                stdDeviation={primary ? 5 : 4}
              />
            </filter>
          </defs>

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#12233b"
            strokeWidth={strokeWidth}
          />

          <g
            className="animate-spin"
            style={{
              transformOrigin: "center",
              animationDuration: primary
                ? "1.8s"
                : "1.5s",
            }}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth={strokeWidth + 3}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              opacity={0.32}
              filter={`url(#${filterId})`}
            />

            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-bold tracking-tight text-[#f5f8fe] ${
              primary
                ? "text-4xl"
                : "text-2xl"
            }`}
          >
            ...
          </span>

          {primary && (
            <span className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8397b3]">
              Calculating
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AnimatedNumber({
  value,
  large,
}: {
  value: number;
  large: boolean;
}) {
  const [displayValue, setDisplayValue] =
    useState(0);

  useEffect(() => {
    const duration = 1400;
    const startTime = performance.now();

    let frame = 0;

    function animate(time: number) {
      const elapsed = time - startTime;
      const progress = Math.min(
        elapsed / duration,
        1
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      setDisplayValue(
        Math.round(value * eased)
      );

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }

    frame = requestAnimationFrame(animate);

    return () =>
      cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span
      className={`font-bold tracking-tight text-[#f7faff] ${
        large ? "text-5xl" : "text-3xl"
      }`}
    >
      {displayValue}%
    </span>
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
  const inputClass =
    "w-full rounded-xl border border-[#314866] bg-[#111f31] px-4 py-3 text-[#edf2fb] outline-none transition placeholder:text-[#7288a3] focus:border-[#6a87ff] focus:ring-2 focus:ring-[#6a87ff]/15";

  return (
    <div className="rounded-xl border border-[#223a59] bg-[#0b1828] p-5">
      <p className="font-medium leading-relaxed text-[#edf3fb]">
        {question.question}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-md bg-[#0d1830] px-2 py-1 text-xs font-medium text-[#8eb1ff]">
          {question.requirement.priority}
        </span>

        <span className="text-xs text-[#657a97]">
          {question.requirement.name}
        </span>
      </div>

      <div className="mt-4">
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
                : typeof value === "string"
                ? value
                : ""
            }
            onChange={(event) =>
              onChange(
                event.target.value === ""
                  ? ""
                  : Number(event.target.value)
              )
            }
            className={inputClass}
            placeholder="Years of experience"
          />
        )}

        {question.response_type ===
          "proficiency" && (
          <select
            value={
              typeof value === "number"
                ? value
                : typeof value === "string"
                ? value
                : ""
            }
            onChange={(event) =>
              onChange(
                event.target.value === ""
                  ? ""
                  : Number(event.target.value)
              )
            }
            className={inputClass}
          >
            <option value="">
              Select proficiency
            </option>
            <option value="1">
              1 - Beginner
            </option>
            <option value="2">2</option>
            <option value="3">
              3 - Intermediate
            </option>
            <option value="4">4</option>
            <option value="5">
              5 - Expert
            </option>
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
            className={inputClass}
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
            className={inputClass}
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
  children: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-5 py-2.5 font-medium transition ${
        selected
          ? "border-[#6a87ff] bg-[#6a87ff] text-white shadow-lg shadow-[#6a87ff]/15"
          : "border-[#2b4360] bg-[#0f1c2d] text-[#bdd0e6] hover:border-[#6a87ff] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function HardGatesSection({
  gates,
}: {
  gates: HardGate[];
}) {
  return (
    <section className="mt-8 rounded-2xl border border-[#19304d] bg-[#071321] p-6 shadow-xl shadow-black/30 md:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6a87ff]">
          Eligibility
        </p>

        <h2 className="mt-2 text-2xl font-semibold text-[#f5f8fe]">
          Hard Gates
        </h2>
      </div>

      {gates.length === 0 ? (
        <p className="text-[#7f93af]">
          No hard-gate requirements were identified.
        </p>
      ) : (
        <div className="space-y-3">
          {gates.map((gate) => (
            <div
              key={gate.requirement.name}
              className="flex flex-col justify-between gap-4 rounded-xl border border-[#19304d] bg-[#040b14] p-5 sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-medium text-[#edf3fb]">
                  {gate.requirement.name}
                </p>

                <p className="mt-1 text-sm text-[#8195af]">
                  {gate.reasoning}
                </p>
              </div>

              <HardGateBadge
                status={gate.status}
              />
            </div>
          ))}
        </div>
      )}
    </section>
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
    <span
      className={`w-fit whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function getScoreColors(score: number) {
  const hue = Math.round((score / 100) * 130);

  return {
    stroke: `hsl(${hue} 84% 62%)`,
    glow: `hsla(${hue} 90% 62% / 0.24)`,
    label: `hsl(${hue} 84% 72%)`,
  };
}