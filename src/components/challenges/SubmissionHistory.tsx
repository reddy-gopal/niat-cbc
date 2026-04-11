"use client";

import { useEffect, useMemo, useState } from "react";
import { CHALLENGES } from "@/lib/challenges";
import type { Submission, SubmissionStatus } from "@/types/database";
import ProofLightbox from "./ProofLightbox";

type SubmissionHistoryProps = {
  submissions: Submission[];
};

const STATUS_ORDER: Record<SubmissionStatus, number> = {
  accepted: 0,
  pending: 1,
  rejected: 2,
  not_started: 3,
};

function formatReviewedDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function SubmissionProofImage({ submissionId }: { submissionId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await fetch(`/api/submissions/${submissionId}/image`);
        const json = (await res.json()) as {
          success?: boolean;
          data?: { signedUrl?: string };
        };
        if (!cancelled && res.ok && json.success && json.data?.signedUrl) {
          setUrl(json.data.signedUrl);
        } else if (!cancelled) {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (loading) {
    return (
      <div
        className="mt-3 aspect-video w-full max-h-52 rounded-lg bg-slate-100 animate-pulse"
        aria-hidden
      />
    );
  }
  if (failed || !url) {
    return (
      <p className="mt-3 text-xs text-[var(--text-muted)]">Proof preview unavailable.</p>
    );
  }
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-[var(--card-border)] bg-slate-50">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL */}
      <img
        src={url}
        alt="Uploaded proof"
        className="max-h-56 w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

type ActiveLightboxState = {
  submissionId: string;
  taskName: string;
  status: string;
  aiReason?: string;
  verifiedAt?: string;
  points?: number;
};

export default function SubmissionHistory({ submissions }: SubmissionHistoryProps) {
  const [activeLightbox, setActiveLightbox] = useState<ActiveLightboxState | null>(null);

  const counts = useMemo(() => {
    let accepted = 0;
    let pending = 0;
    let rejected = 0;
    let notStarted = 0;
    for (const s of submissions) {
      if (s.status === "accepted") accepted += 1;
      else if (s.status === "pending") pending += 1;
      else if (s.status === "rejected") rejected += 1;
      else notStarted += 1;
    }
    return { accepted, pending, rejected, notStarted };
  }, [submissions]);

  const sorted = useMemo(() => {
    return [...submissions].sort((a, b) => {
      const oa = STATUS_ORDER[a.status];
      const ob = STATUS_ORDER[b.status];
      if (oa !== ob) return oa - ob;
      return a.task_id - b.task_id;
    });
  }, [submissions]);

  return (
    <div className="w-full min-w-0">
      <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 md:justify-between md:gap-4 rounded-xl border border-[var(--card-border)] bg-white px-2.5 py-3 sm:px-4 shadow-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 sm:text-sm">
          ✅ {counts.accepted} Accepted
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 ring-1 ring-amber-200 sm:text-sm">
          🔄 {counts.pending} Under Review
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800 ring-1 ring-red-200 sm:text-sm">
          ❌ {counts.rejected} Rejected
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 sm:text-sm">
          ⬜ {counts.notStarted} Not Started
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((sub) => {
          const challenge = CHALLENGES.find((c) => c.id === sub.task_id);
          const title = challenge?.title ?? `Task ${sub.task_id}`;
          const showPoints = sub.status === "accepted" && sub.points > 0;
          const xp = sub.points * 50;
          const showProof =
            Boolean(sub.file_url) && sub.status !== "not_started";
          const showReason = sub.status === "rejected" && Boolean(sub.ai_reason);

          return (
            <article
              key={sub.id}
              className="flex min-w-0 flex-col rounded-xl border border-[var(--card-border)] bg-white p-3 sm:p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="font-heading text-sm sm:text-base font-bold text-[var(--text-dark)] leading-snug [overflow-wrap:anywhere]">
                {title}
              </h3>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {sub.status === "not_started" && (
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                    Not Started
                  </span>
                )}
                {sub.status === "pending" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200">
                    <span
                      className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"
                      aria-hidden
                    />
                    Under Review
                  </span>
                )}
                {sub.status === "accepted" && (
                  <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                    Accepted ✅
                  </span>
                )}
                {sub.status === "rejected" && (
                  <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-800 ring-1 ring-red-200">
                    Rejected ❌
                  </span>
                )}
              </div>

              {showPoints && (
                <p className="mt-2 text-sm font-bold text-emerald-600">+{xp} XP</p>
              )}

              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Attempt {sub.resubmit_count} of 3
              </p>

              {sub.verified_at && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Reviewed on {formatReviewedDate(sub.verified_at)}
                </p>
              )}

              {showReason && sub.ai_reason && (
                <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium leading-snug text-orange-950">
                  <span className="font-bold text-orange-800">Reason:</span> {sub.ai_reason}
                </div>
              )}

              {showProof && (
                <>
                  <SubmissionProofImage submissionId={sub.id} />
                  <button
                    type="button"
                    onClick={() =>
                      setActiveLightbox({
                        submissionId: sub.id,
                        taskName: title,
                        status: sub.status,
                        aiReason: sub.ai_reason ?? undefined,
                        verifiedAt: sub.verified_at ?? undefined,
                        points: sub.points,
                      })
                    }
                    className="btn-outline mt-3 w-full py-2 text-xs font-bold sm:w-auto sm:self-start"
                  >
                    View Proof →
                  </button>
                </>
              )}
            </article>
          );
        })}
      </div>

      {activeLightbox && (
        <ProofLightbox
          submissionId={activeLightbox.submissionId}
          taskName={activeLightbox.taskName}
          status={activeLightbox.status}
          aiReason={activeLightbox.aiReason}
          verifiedAt={activeLightbox.verifiedAt}
          points={activeLightbox.points}
          isOpen
          onClose={() => setActiveLightbox(null)}
        />
      )}
    </div>
  );
}
