"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Challenge, StudentSession } from "@/types/app";
import type { Submission } from "@/types/database";
import { useSubmissionPolling } from "@/hooks/useSubmissionPolling";
import ChallengeCard, { type BoardStatus } from "./ChallengeCard";
import MissionModal from "./MissionModal";
import XPToast from "./XPToast";
import RejectToast from "./RejectToast";

type ChallengeBoardProps = {
  challenges: Challenge[];
  submissions: Submission[];
  setSubmissions: Dispatch<SetStateAction<Submission[]>>;
  session: StudentSession;
  onSubmissionsUpdate?: (submissions: Submission[]) => void;
};

export default function ChallengeBoard({
  challenges,
  submissions,
  setSubmissions,
  session,
  onSubmissionsUpdate,
}: ChallengeBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [toastData, setToastData] = useState<{ id: number; points: number } | null>(null);
  const [rejectToastMessage, setRejectToastMessage] = useState<string | null>(null);

  useSubmissionPolling(submissions, setSubmissions, {
    onAccepted: ({ taskId, pointsXp }) => {
      setToastData({ id: taskId, points: pointsXp });
    },
    onRejected: (message) => setRejectToastMessage(message),
    onUpdate: (next) => onSubmissionsUpdate?.(next),
  });

  const submissionByTask = useMemo(
    () => new Map(submissions.map((s) => [s.task_id, s])),
    [submissions]
  );

  const activeChallenge = useMemo(
    () => challenges.find((c) => c.id === activeTaskId) ?? null,
    [activeTaskId, challenges]
  );

  const getCardStatus = (submission: Submission): BoardStatus => {
    if (submission.status === "accepted") return "completed";
    if (submission.status === "pending") return "in_review";
    if (submission.status === "rejected" && submission.resubmit_count >= 3) return "locked";
    return "available";
  };

  const handleSubmitted = (taskId: number) => {
    setSubmissions((prev) => {
      const next = prev.map((item) =>
        item.task_id === taskId
          ? { ...item, status: "pending" as const, resubmit_count: item.resubmit_count + 1 }
          : item
      );
      onSubmissionsUpdate?.(next);
      return next;
    });
    setActiveTaskId(null);
  };

  return (
    <div
      className="w-full max-w-6xl mx-auto py-6 md:py-8 relative text-sm sm:text-base"
      style={{ fontFamily: "var(--font-body), sans-serif" }}
    >
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 justify-items-center max-w-5xl mx-auto">
        {challenges.map((challenge, i) => {
          const submission = submissionByTask.get(challenge.id);
          if (!submission) return null;

          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
              className="w-full min-w-0 flex justify-center perspective-1000"
            >
              <ChallengeCard
                challenge={challenge}
                status={getCardStatus(submission)}
                submissionId={submission.id}
                aiReason={submission.ai_reason ?? undefined}
                fileUrl={submission.file_url}
                submissionStatus={submission.status}
                verifiedAt={submission.verified_at ?? undefined}
                points={submission.points}
                onOpen={() => {
                  if (getCardStatus(submission) !== "locked") {
                    setActiveTaskId(challenge.id);
                  }
                }}
              />
            </motion.div>
          );
        })}
      </div>

      <MissionModal
        isOpen={Boolean(activeTaskId)}
        challenge={activeChallenge}
        session={session}
        onClose={() => setActiveTaskId(null)}
        onSubmitSuccess={handleSubmitted}
      />
    </div>
  );
}
