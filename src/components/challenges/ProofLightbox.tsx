"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SubmissionStatus } from "@/types/database";

export type ProofLightboxProps = {
  submissionId: string;
  taskName: string;
  status: string;
  hasProof?: boolean;
  aiReason?: string;
  verifiedAt?: string;
  points?: number;
  textResponse?: string;
  isOpen: boolean;
  onClose: () => void;
  /** When set, skips network fetch (e.g. caller already fetched a signed URL). */
  initialSignedUrl?: string | null;
  /** Which API to call on load/retry when `initialSignedUrl` is not set. */
  imageEndpoint?: "submission" | "attempt";
};

function ValidProofTips() {
  return (
    <div className="mt-8 border-t border-[var(--card-border)] pt-8">
      <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-[var(--text-dark)]">
        Proof Submission Guidelines
      </h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="mb-2 flex items-center gap-2 font-bold text-emerald-800">
            <span className="text-base">✅</span>
            <span className="text-xs uppercase tracking-wider">Accepted Examples</span>
          </div>
          <ul className="space-y-2 pl-5 list-disc text-xs font-semibold leading-relaxed text-emerald-900/70">
            <li>Original photos taken by you in the moment</li>
            <li>Authentic text expressing your real thoughts</li>
            <li>Screenshots showing specific details requested</li>
            <li>Photos where teammate faces are clearly visible</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
          <div className="mb-2 flex items-center gap-2 font-bold text-red-800">
            <span className="text-base">❌</span>
            <span className="text-xs uppercase tracking-wider">Common Rejections</span>
          </div>
          <ul className="space-y-2 pl-5 list-disc text-xs font-semibold leading-relaxed text-red-900/70">
            <li>Forwarded messages or generic templates</li>
            <li>Stock images or low-quality screenshots</li>
            <li>Photos unrelated to the specific challenge</li>
            <li>Evidence missing the required participants</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ReviewedDate({ iso }: { iso: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <span>—</span>;

  try {
    const d = new Date(iso);
    return (
      <span className="text-[var(--text-dark)]">
        {d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    );
  } catch {
    return <span className="text-[var(--text-dark)]">{iso}</span>;
  }
}

function StatusBadge({ status }: { status: string }) {
  const s = status as SubmissionStatus;
  if (s === "not_started") {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
        Not Started
      </span>
    );
  }
  if (s === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200">
        <span
          className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"
          aria-hidden
        />
        Under Review
      </span>
    );
  }
  if (s === "accepted") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
        Accepted ✅
      </span>
    );
  }
  if (s === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-800 ring-1 ring-red-200">
        Rejected ❌
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
      {status}
    </span>
  );
}

function imageFetchUrl(submissionId: string, imageEndpoint: "submission" | "attempt"): string {
  if (imageEndpoint === "attempt") {
    return `/api/submissions/attempts/${submissionId}/image`;
  }
  return `/api/submissions/${submissionId}/image`;
}

export default function ProofLightbox({
  submissionId,
  taskName,
  status,
  hasProof = true,
  aiReason,
  verifiedAt,
  points,
  textResponse,
  isOpen,
  onClose,
  initialSignedUrl,
  imageEndpoint = "submission",
}: ProofLightboxProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [entered, setEntered] = useState(false);

  const reset = useCallback(() => {
    setSignedUrl(null);
    setError(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    if (initialSignedUrl) {
      setSignedUrl(initialSignedUrl);
      setLoading(false);
      setError(false);
      return;
    }

    if (!hasProof) {
      setSignedUrl(null);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    setSignedUrl(null);

    const url = imageFetchUrl(submissionId, imageEndpoint);

    void (async () => {
      try {
        const res = await fetch(url);
        const json = (await res.json()) as {
          success?: boolean;
          data?: { signedUrl?: string };
        };
        if (cancelled) return;
        if (res.ok && json.success && json.data?.signedUrl) {
          setSignedUrl(json.data.signedUrl);
          setError(false);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, submissionId, hasProof, initialSignedUrl, imageEndpoint, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  const handleRetry = () => {
    if (!isOpen) return;
    if (!hasProof) return;
    setLoading(true);
    setError(false);
    setSignedUrl(null);
    const url = imageFetchUrl(submissionId, imageEndpoint);
    void (async () => {
      try {
        const res = await fetch(url);
        const json = (await res.json()) as {
          success?: boolean;
          data?: { signedUrl?: string };
        };
        if (res.ok && json.success && json.data?.signedUrl) {
          setSignedUrl(json.data.signedUrl);
          setError(false);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  };

  const showPoints = status === "accepted" && points !== undefined && points > 0;
  const displayPoints = showPoints ? points! : 0;
  const rejected = status === "rejected" && Boolean(aiReason?.trim());

  if (!isOpen) return null;

  const modal = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proof-lightbox-title"
        className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl transition-all duration-200 ease-out mx-4 ${
          entered ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3 sm:px-6 sm:py-4">
          <h2
            id="proof-lightbox-title"
            className="font-heading pr-2 text-base font-bold text-[var(--text-dark)] sm:text-lg [overflow-wrap:anywhere]"
          >
            {taskName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-[var(--text-muted)] transition hover:bg-gray-100 hover:text-[var(--text-dark)]"
            aria-label="Close"
          >
            <span className="text-xl leading-none" aria-hidden>
              ✕
            </span>
          </button>
        </div>

        <div className="px-4 py-6 sm:px-8 sm:py-8">
          {textResponse && (
            <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-slate-50 shadow-inner">
              <div className="border-b border-[var(--card-border)] bg-slate-100/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Text Response
              </div>
              <div className="p-5 text-sm font-medium leading-relaxed italic text-[var(--text-dark)] [overflow-wrap:anywhere]">
                "{textResponse}"
              </div>
            </div>
          )}

          {hasProof && (
            <div className="flex min-h-[100px] flex-col items-center justify-center">
              {loading && (
                <div className="flex flex-col items-center gap-3 py-12">
                  <span
                    className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"
                    aria-hidden
                  />
                  <span className="text-sm text-[var(--text-muted)]">Loading image…</span>
                </div>
              )}
              {!loading && error && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <p className="text-sm font-medium text-[var(--text-dark)]">
                    Failed to load image. Please try again.
                  </p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loading && !error && signedUrl && (
                <div className="w-full overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--bg-tint)] p-1 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL */}
                  <img
                    src={signedUrl}
                    alt="Proof"
                    className="max-h-[60vh] w-full rounded-xl object-contain"
                  />
                </div>
              )}
            </div>
          )}
      </div>

        <div className="border-t border-[var(--card-border)] px-4 py-4 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center gap-3 gap-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[var(--text-secondary)]">Status:</span>
              <StatusBadge status={status} />
            </div>
            {verifiedAt && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[var(--text-secondary)]">Reviewed:</span>
                <ReviewedDate iso={verifiedAt} />
              </div>
            )}
          </div>
          {showPoints && (
            <p className="mt-3 text-sm font-bold text-emerald-600">+{displayPoints} Points</p>
          )}
          {rejected && aiReason && (
            <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/50 p-5 text-sm font-medium leading-relaxed text-orange-900 shadow-sm">
              <div className="mb-2 flex items-center gap-2 font-bold text-orange-800">
                <span className="text-xl" aria-hidden>
                  💬
                </span>
                Reviewer Feedback
              </div>
              <p className="[overflow-wrap:anywhere]">{aiReason}</p>
            </div>
          )}

          <ValidProofTips />
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
