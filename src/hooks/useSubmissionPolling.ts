"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Submission } from "@/types/database";

export type SubmissionPollingOptions = {
  onAccepted?: (payload: { taskId: number; pointsXp: number }) => void;
  onRejected?: (message: string) => void;
  onUpdate?: (next: Submission[]) => void;
};

/**
 * Polls /api/submissions/status for pending rows every 4s.
 * Interval is stable while any submission is pending (does not reset on each poll update).
 */
export function useSubmissionPolling(
  submissions: Submission[],
  setSubmissions: Dispatch<SetStateAction<Submission[]>>,
  options?: SubmissionPollingOptions
): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const submissionsRef = useRef(submissions);
  useEffect(() => {
    submissionsRef.current = submissions;
  }, [submissions]);

  const hasPending = useMemo(
    () => submissions.some((s) => s.status === "pending"),
    [submissions]
  );

  useEffect(() => {
    if (!hasPending) return;

    const tick = async () => {
      const current = submissionsRef.current;
      const pendingIds = current.filter((s) => s.status === "pending").map((s) => s.id);
      if (pendingIds.length === 0) {
        return;
      }

      let updated = false;
      const newSubs = [...current];

      await Promise.all(
        pendingIds.map(async (id) => {
          try {
            const response = await fetch(`/api/submissions/status?submissionId=${id}`, {
              cache: "no-store",
            });
            const result = (await response.json()) as {
              success?: boolean;
              data?: {
                status: Submission["status"];
                points: number;
                aiReason: string | null;
                verifiedAt?: string | null;
              };
            };
            if (!response.ok || !result.success || !result.data || result.data.status === "pending")
              return;

            const index = newSubs.findIndex((s) => s.id === id);
            if (index !== -1) {
              const prevStatus = newSubs[index].status;
              const d = result.data;
              newSubs[index] = {
                ...newSubs[index],
                status: d.status,
                points: d.points,
                ai_reason: d.aiReason,
                verified_at:
                  d.verifiedAt !== undefined ? d.verifiedAt : newSubs[index].verified_at,
              };
              updated = true;
              if (d.status === "accepted") {
                optionsRef.current?.onAccepted?.({
                  taskId: newSubs[index].task_id,
                  pointsXp: d.points * 50,
                });
              }
              if (
                prevStatus === "pending" &&
                d.status === "rejected" &&
                typeof d.aiReason === "string" &&
                d.aiReason.length > 0
              ) {
                optionsRef.current?.onRejected?.(`❌ Challenge rejected: ${d.aiReason}`);
              }
            }
          } catch {
            /* ignore poll errors */
          }
        })
      );
      if (updated) {
        submissionsRef.current = newSubs;
        setSubmissions(newSubs);
        optionsRef.current?.onUpdate?.(newSubs);
      }
    };

    const timer = window.setInterval(() => {
      void tick();
    }, 4000);

    return () => window.clearInterval(timer);
  }, [hasPending, setSubmissions]);
}
