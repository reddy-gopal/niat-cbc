"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import type { Challenge, StudentSession } from "@/types/app";
import type { StudentChallengeStatus } from "@/types/database";
import { CHALLENGES, CHALLENGE_ID_MAP } from "@/lib/challenges";
import { StudentAppShell } from "@/components/student/StudentAppShell";
import { studentMainTopPaddingClass } from "@/components/student/StudentNavbar";
import { useSubmissionPolling } from "@/hooks/useSubmissionPolling";

const XPToast = dynamic(() => import("@/components/challenges/XPToast"), { ssr: false });
const RejectToast = dynamic(() => import("@/components/challenges/RejectToast"), {
  ssr: false,
});
const ProofLightbox = dynamic(() => import("@/components/challenges/ProofLightbox"), {
  ssr: false,
});

/** Formats ISO date string to human-readable format */
function formatTableDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(d);
  } catch {
    return "—";
  }
}

export interface SubmissionsClientProps {
  session: StudentSession;
  initialAttempts: any[];
  initialSignedUrls: Record<string, string>;
}

export default function SubmissionsClient({
  session,
  initialAttempts,
  initialSignedUrls,
}: SubmissionsClientProps) {
  const [attempts, setAttempts] = useState<any[]>(initialAttempts);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>(initialSignedUrls);
  
  // --- AUDIT FIX: Add status state for polling detection ---
  const [challengeStatuses, setChallengeStatuses] = useState<StudentChallengeStatus[]>(() => {
    // Basic mapping from attempts to status view format for polling start
    const map = new Map<number, StudentChallengeStatus>();
    initialAttempts.forEach(a => {
      const existing = map.get(a.task_id);
      if (!existing || new Date(a.created_at) > new Date(existing.completed_at || 0)) {
        map.set(a.task_id, {
          student_id: a.student_id,
          task_id: a.task_id,
          bootcamp_id: a.bootcamp_id,
          attempts_used: (existing?.attempts_used ?? 0) + 1,
          is_completed: a.status === 'accepted' || (existing?.is_completed ?? false),
          points_earned: a.points || (existing?.points_earned ?? 0),
          latest_status: a.status,
          completed_at: a.status === 'accepted' ? a.created_at : (existing?.completed_at ?? null),
        });
      }
    });
    return Array.from(map.values());
  });

  const [toastData, setToastData] = useState<{ id: number; points: number } | null>(null);
  const [rejectToastMessage, setRejectToastMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const firstName = session.fullName.split(" ")[0] ?? session.fullName;

  const refreshAttempts = async (): Promise<void> => {
    try {
      const res = await fetch("/api/submissions/attempts");
      const json = await res.json();
      
      if (json.success && json.data?.attempts) {
        setAttempts(json.data.attempts);
      }
    } catch (err) {
      console.error("[SubmissionsClient] Refresh failed:", err);
    }
  };

  // Real-time polling for status changes
  useSubmissionPolling(challengeStatuses, setChallengeStatuses, {
    onAccepted: ({ taskId, points }) => {
      setToastData({ id: taskId, points });
      void refreshAttempts();
    },
    onRejected: (message) => {
      setRejectToastMessage(message);
      void refreshAttempts();
    },
  });

  // Re-fetch signed URLs via API if attempts list changes (e.g. after refresh)
  useEffect(() => {
    const paths = attempts
      .map((a) => a.file_url)
      .filter((url): url is string => Boolean(url));
    
    if (paths.length === 0) return;

    // Check if we already have signed URLs for these paths
    const missingPaths = paths.filter(p => !signedUrls[p]);
    if (missingPaths.length === 0) return;

    // We fetch one by one using the existing image API or we could create a bulk one.
    // For now, let's just refresh the ones that are missing.
    missingPaths.forEach(async (path) => {
      try {
        // Find the attempt ID for this path
        const attempt = attempts.find(a => a.file_url === path);
        if (!attempt) return;

        const res = await fetch(`/api/submissions/attempts/${attempt.id}/image`);
        const json = await res.json();
        if (json.success && json.data?.signedUrl) {
          setSignedUrls(prev => ({ ...prev, [path]: json.data.signedUrl }));
        }
      } catch (err) {
        console.error("Failed to fetch image URL:", err);
      }
    });
  }, [attempts]);

  const challengeById = useMemo(
    () => new Map<number, Challenge>(CHALLENGES.map((challenge) => [challenge.id, challenge])),
    []
  );

  const getDisplayId = (taskId: number) => CHALLENGE_ID_MAP[taskId] ?? taskId;

  return (
    <>
      <StudentAppShell firstName={firstName}>
        <main
          className={`min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] pb-10 md:pb-16 ${studentMainTopPaddingClass}`}
        >
          <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6 pb-6 md:pb-10">
            <header className="mb-8">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-dark)] mb-2 px-0.5">
                My Submissions
              </h1>
              <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
                A complete history of your challenge attempts and AI feedback.
              </p>
            </header>

            <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-slate-50 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      <th className="px-6 py-4">Proof</th>
                      <th className="px-6 py-4">Challenge</th>
                      <th className="px-6 py-4">AI Reason</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--card-border)]">
                    {attempts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          You haven't made any submissions yet.
                        </td>
                      </tr>
                    ) : (
                      attempts.map((attempt) => {
                        const challenge = challengeById.get(attempt.task_id);
                        const imageUrl = attempt.file_url ? signedUrls[attempt.file_url] : null;
                        const status = attempt.status;

                        return (
                          <tr key={attempt.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              {imageUrl || attempt.hasProof ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedAttempt(attempt)}
                                  className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--card-border)] bg-slate-100 transition hover:scale-105 active:scale-95"
                                >
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt="Proof"
                                      className="h-full w-full object-cover transition group-hover:opacity-90"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                                      Loading...
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                                    <span className="text-white">🔍</span>
                                  </div>
                                </button>
                              ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                                  No File
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-[var(--text-dark)]">
                                {challenge?.title ?? `Task ${getDisplayId(attempt.task_id)}`}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1">
                                {challenge?.day}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                               {attempt.ai_reason ? (
                                 <div className="max-w-xs rounded-lg bg-slate-100 p-2 text-[11px] font-medium leading-relaxed text-slate-600 border border-slate-200">
                                   {attempt.ai_reason}
                                 </div>
                               ) : (
                                 <span className="text-slate-400 italic text-xs">No feedback yet</span>
                               )}
                            </td>
                            <td className="px-6 py-4">
                              {status === "accepted" ? (
                                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                                  ACCEPTED ✅
                                </span>
                              ) : status === "pending" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  PENDING
                                </span>
                              ) : status === "rejected" ? (
                                <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700 ring-1 ring-red-200">
                                  REJECTED ❌
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                                  {typeof status === 'string' ? status.toUpperCase() : "UNKNOWN"}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-[var(--text-secondary)] tabular-nums">
                              {isMounted ? formatTableDate(attempt.created_at) : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </StudentAppShell>

      <AnimatePresence>
        {toastData && (
          <XPToast
            key="points-toast"
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

      <ProofLightbox
        isOpen={!!selectedAttempt}
        onClose={() => setSelectedAttempt(null)}
        submissionId={selectedAttempt?.id ?? ""}
        taskName={challengeById.get(selectedAttempt?.task_id)?.title ?? "Mission Proof"}
        status={selectedAttempt?.status ?? ""}
        aiReason={selectedAttempt?.ai_reason ?? ""}
        verifiedAt={selectedAttempt?.verified_at}
        points={selectedAttempt?.points}
        textResponse={selectedAttempt?.text_response}
        hasProof={selectedAttempt?.hasProof ?? !!selectedAttempt?.file_url}
        initialSignedUrl={selectedAttempt?.file_url ? signedUrls[selectedAttempt.file_url] : null}
        imageEndpoint={selectedAttempt?.submission_id && selectedAttempt?.submission_id !== selectedAttempt?.id ? "attempt" : "submission"}
      />
    </>
  );
}
