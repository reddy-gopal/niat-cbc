"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { StudentChallengeStatus } from "@/types/database";
import { createClient } from "../../utils/supabase/client";

export type ChallengeStatusPollingOptions = {
  onAccepted?: (payload: { taskId: number; points: number }) => void;
  onRejected?: (message: string) => void;
  onUpdate?: (next: StudentChallengeStatus[]) => void;
};

/**
 * Polls student_challenge_status view for updates while any challenge is pending.
 */
export function useSubmissionPolling(
  challengeStatuses: StudentChallengeStatus[],
  setChallengeStatuses: Dispatch<SetStateAction<StudentChallengeStatus[]>>,
  options?: ChallengeStatusPollingOptions
): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const statusesRef = useRef(challengeStatuses);
  useEffect(() => {
    statusesRef.current = challengeStatuses;
  }, [challengeStatuses]);

  const hasPending = useMemo(
    () => challengeStatuses?.some((s) => s.latest_status === "pending") ?? false,
    [challengeStatuses]
  );

  useEffect(() => {
    if (!hasPending) return;

    const supabase = createClient();

    const tick = async () => {
      const current = statusesRef.current;
      const studentId = current[0]?.student_id;
      const bootcampId = current[0]?.bootcamp_id;

      if (!studentId || !bootcampId) return;

      const { data, error } = await supabase
        .from("student_challenge_status")
        .select("*")
        .eq("student_id", studentId)
        .eq("bootcamp_id", bootcampId);

      if (error || !data) return;

      const next = data as StudentChallengeStatus[];

      for (const row of next) {
        const was = current.find((c) => c.task_id === row.task_id);
        if (was && was.latest_status === "pending" && row.latest_status === "accepted") {
          optionsRef.current?.onAccepted?.({
            taskId: row.task_id,
            points: row.points_earned,
          });
        }
        if (was && was.latest_status === "pending" && row.latest_status === "rejected") {
          optionsRef.current?.onRejected?.(`❌ Challenge rejected. Try again!`);
        }
      }

      // We use stringify for a simple deep comparison to detect changes
      if (JSON.stringify(current) !== JSON.stringify(next)) {
        setChallengeStatuses(next);
        optionsRef.current?.onUpdate?.(next);
      }
    };

    const timer = window.setInterval(() => {
      void tick();
    }, 4000);

    return () => window.clearInterval(timer);
  }, [hasPending, setChallengeStatuses]);
}
