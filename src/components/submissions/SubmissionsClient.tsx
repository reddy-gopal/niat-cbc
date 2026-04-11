"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { StudentSession } from "@/types/app";
import type { SafeAttempt } from "@/types/database";
import { CHALLENGES } from "@/lib/challenges";
import ProofLightbox from "@/components/challenges/ProofLightbox";
import XPToast from "@/components/challenges/XPToast";
import RejectToast from "@/components/challenges/RejectToast";
import { StudentAppShell } from "@/components/student/StudentAppShell";
import { studentMainTopPaddingClass } from "@/components/student/StudentNavbar";

type SubmissionsClientProps = {
  session: StudentSession;
  initialAttempts: SafeAttempt[];
};

type FilterStatus = "all" | "accepted" | "pending" | "rejected";

type LightboxState = {
  attemptId: string;
  taskName: string;
  status: string;
  aiReason?: string;
  verifiedAt?: string;
  points?: number;
};

function formatTableDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function isPlagiarismReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return reason.includes("identical to another student");
}

function truncateReason(text: string | null, max: number): string {
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

type AttemptsPollResponse = {
  success?: boolean;
  data?: { attempts: SafeAttempt[] };
};

export default function SubmissionsClient({
  session,
  initialAttempts,
}: SubmissionsClientProps) {
  const [attempts, setAttempts] = useState<SafeAttempt[]>(initialAttempts);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [lightboxSignedUrl, setLightboxSignedUrl] = useState<string | null>(null);
  const [loadingAttemptId, setLoadingAttemptId] = useState<string | null>(null);
  const [toastData, setToastData] = useState<{ id: number; points: number } | null>(null);
  const [rejectToastMessage, setRejectToastMessage] = useState<string | null>(null);

  const attemptsRef = useRef(attempts);
  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  const firstName = session.fullName.split(" ")[0] ?? session.fullName;

  const hasPending = useMemo(
    () => attempts.some((a) => a.status === "pending"),
    [attempts]
  );

  useEffect(() => {
    if (!hasPending) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/submissions/attempts?limit=50", { cache: "no-store" });
        const json = (await res.json()) as AttemptsPollResponse;
        if (!res.ok || !json.success || !json.data?.attempts) return;
        setAttempts(json.data.attempts);

        const prev = attemptsRef.current;
        const next = json.data.attempts;
        for (const row of next) {
          const was = prev.find((p) => p.id === row.id);
          if (!was) continue;
          if (was.status === "pending" && row.status === "accepted") {
            setToastData({ id: row.task_id, points: row.points * 50 });
            break;
          }
          if (
            was.status === "pending" &&
            row.status === "rejected" &&
            row.ai_reason &&
            !isPlagiarismReason(row.ai_reason)
          ) {
            setRejectToastMessage(`❌ Challenge rejected: ${row.ai_reason}`);
            break;
          }
        }
      } catch {
        /* ignore */
      }
    };

    const timer = window.setInterval(() => {
      void poll();
    }, 8000);

    return () => window.clearInterval(timer);
  }, [hasPending]);

  const filtered = useMemo(() => {
    if (filterStatus === "all") return attempts;
    return attempts.filter((a) => a.status === filterStatus);
  }, [attempts, filterStatus]);

  const counts = useMemo(() => {
    let accepted = 0;
    let pending = 0;
    let rejected = 0;
    for (const a of attempts) {
      if (a.status === "accepted") accepted += 1;
      else if (a.status === "pending") pending += 1;
      else if (a.status === "rejected") rejected += 1;
    }
    return { accepted, pending, rejected, total: attempts.length };
  }, [attempts]);

  const totalXpEarned = useMemo(
    () =>
      attempts
        .filter((a) => a.status === "accepted")
        .reduce((sum, a) => sum + a.points * 50, 0),
    [attempts]
  );

  const handleViewProof = async (attempt: SafeAttempt) => {
    if (!attempt.hasProof) return;
    const challenge = CHALLENGES.find((c) => c.id === attempt.task_id);
    const taskName = challenge?.title ?? `Task ${attempt.task_id}`;
    setLoadingAttemptId(attempt.id);
    setLightboxSignedUrl(null);
    try {
      const res = await fetch(`/api/submissions/attempts/${attempt.id}/image`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { signedUrl?: string };
      };
      if (!res.ok || !json.success || !json.data?.signedUrl) {
        setRejectToastMessage("Could not load proof image.");
        return;
      }
      setLightboxSignedUrl(json.data.signedUrl);
      setLightbox({
        attemptId: attempt.id,
        taskName,
        status: attempt.status,
        aiReason: attempt.ai_reason ?? undefined,
        verifiedAt: attempt.verified_at ?? undefined,
        points: attempt.points,
      });
    } catch {
      setRejectToastMessage("Could not load proof image.");
    } finally {
      setLoadingAttemptId(null);
    }
  };

  const closeLightbox = () => {
    setLightbox(null);
    setLightboxSignedUrl(null);
  };

  const filterTabs: { id: FilterStatus; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.total },
    { id: "accepted", label: "Accepted", count: counts.accepted },
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "rejected", label: "Rejected", count: counts.rejected },
  ];

  return (
    <>
      <StudentAppShell firstName={firstName}>
        <main
          className={`min-h-[100dvh] min-h-screen overflow-x-hidden bg-[var(--bg-tint)] text-[var(--text-base)] pb-10 md:pb-16 ${studentMainTopPaddingClass}`}
        >
          <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6 pb-6 md:pb-10">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-dark)] mb-2 px-0.5 [overflow-wrap:anywhere]">
              My Submissions
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-4 sm:mb-6 max-w-2xl [overflow-wrap:anywhere]">
              Full history of every proof upload and review outcome.
            </p>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--text-secondary)]">
                Showing {filtered.length} of {counts.total} submissions
              </p>
              <p className="text-sm font-bold text-[var(--text-dark)]">
                Total: {totalXpEarned} XP
              </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--card-border)]">
              {filterTabs.map((tab) => {
                const active = filterStatus === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-3 py-2 text-sm transition-colors ${
                      active
                        ? "border-b-2 border-blue-600 bg-white font-medium text-[var(--text-dark)]"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                );
              })}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-white shadow-sm">
              <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] bg-slate-50 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="px-4 py-3">Challenge</th>
                    <th className="px-4 py-3">Attempt</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Reviewed</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-[var(--text-secondary)]">
                        {filterStatus === "all"
                          ? "No submissions found"
                          : `No ${filterStatus} submissions found`}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((attempt, i) => {
                      const challenge = CHALLENGES.find((c) => c.id === attempt.task_id);
                      const title = challenge?.title ?? `Task ${attempt.task_id}`;
                      const day = challenge?.day ?? "";
                      const borderClass =
                        attempt.status === "accepted"
                          ? "border-l-2 border-green-400"
                          : attempt.status === "rejected"
                            ? "border-l-2 border-red-400"
                            : "border-l-2 border-amber-400";
                      const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
                      const plagiarized = isPlagiarismReason(attempt.ai_reason);

                      return (
                        <tr
                          key={attempt.id}
                          className={`${rowBg} ${borderClass} transition-colors hover:bg-blue-50`}
                        >
                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-[var(--text-dark)]">{title}</div>
                            {day && (
                              <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                {day}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="inline-flex rounded-md bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                              #{attempt.attempt_number}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top text-[var(--text-secondary)] tabular-nums">
                            {formatTableDate(attempt.created_at)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {attempt.status === "pending" ? (
                              <span className="inline-flex items-center gap-1.5 text-amber-800">
                                <span
                                  className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"
                                  aria-hidden
                                />
                                Pending review…
                              </span>
                            ) : (
                              <span className="text-[var(--text-secondary)] tabular-nums">
                                {formatTableDate(attempt.verified_at)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {attempt.status === "pending" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase text-amber-900 ring-1 ring-amber-200">
                                <span
                                  className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"
                                  aria-hidden
                                />
                                Under Review
                              </span>
                            )}
                            {attempt.status === "accepted" && (
                              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
                                Accepted
                              </span>
                            )}
                            {attempt.status === "rejected" && (
                              <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-800 ring-1 ring-red-200">
                                Rejected
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top font-medium tabular-nums">
                            {attempt.status === "accepted" && attempt.points > 0 ? (
                              <span className="text-emerald-600">+{attempt.points * 50} XP</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="max-w-[200px] px-4 py-3 align-top text-xs text-[var(--text-secondary)]">
                            {plagiarized ? (
                              <span className="font-semibold text-orange-600">
                                ⚠ Duplicate submission
                              </span>
                            ) : (
                              <span title={attempt.ai_reason ?? undefined}>
                                {truncateReason(attempt.ai_reason, 60)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {attempt.hasProof ? (
                              <button
                                type="button"
                                onClick={() => void handleViewProof(attempt)}
                                disabled={loadingAttemptId === attempt.id}
                                className="font-bold text-blue-600 hover:underline disabled:opacity-50"
                              >
                                {loadingAttemptId === attempt.id ? "Loading…" : "View →"}
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </StudentAppShell>

      {lightbox && (
        <ProofLightbox
          submissionId={lightbox.attemptId}
          taskName={lightbox.taskName}
          status={lightbox.status}
          aiReason={lightbox.aiReason}
          verifiedAt={lightbox.verifiedAt}
          points={lightbox.points}
          initialSignedUrl={lightboxSignedUrl}
          imageEndpoint="attempt"
          isOpen
          onClose={closeLightbox}
        />
      )}

      <AnimatePresence>
        {toastData && (
          <XPToast
            key="xp-toast"
            points={toastData.points}
            onComplete={() => setToastData(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rejectToastMessage && (
          <RejectToast
            key="reject-toast"
            message={rejectToastMessage}
            onComplete={() => setRejectToastMessage(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
