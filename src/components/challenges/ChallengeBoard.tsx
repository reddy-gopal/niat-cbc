"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Challenge, StudentSession } from "@/types/app";
import type { Submission } from "@/types/database";
import ChallengeCard, { type BoardStatus } from "./ChallengeCard";
import MissionModal from "./MissionModal";
import XPToast from "./XPToast";

type ChallengeBoardProps = {
  challenges: Challenge[];
  submissions: Submission[];
  session: StudentSession;
};

export default function ChallengeBoard({
  challenges,
  submissions,
  session,
}: ChallengeBoardProps) {
  const [localSubmissions, setLocalSubmissions] = useState(submissions);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [toastData, setToastData] = useState<{ id: number; points: number } | null>(null);

  useEffect(() => {
    setLocalSubmissions(submissions);
  }, [submissions]);

  useEffect(() => {
    const pendingIds = localSubmissions
      .filter((s) => s.status === "pending")
      .map((s) => s.id);
    if (pendingIds.length === 0) return;

    const timer = window.setInterval(async () => {
      let updated = false;
      const newSubs = [...localSubmissions];

      await Promise.all(
        pendingIds.map(async (id) => {
          try {
            const response = await fetch(`/api/submissions/status?submissionId=${id}`, {
              cache: "no-store",
            });
            const result = await response.json();
            if (!response.ok || !result.success || !result.data || result.data.status === "pending") return;
            
            const index = newSubs.findIndex(s => s.id === id);
            if (index !== -1) {
              newSubs[index] = {
                ...newSubs[index],
                status: result.data.status,
                points: result.data.points,
                ai_reason: result.data.aiReason,
              };
              updated = true;
              if (result.data.status === "accepted") {
                setToastData({ id: newSubs[index].task_id, points: result.data.points * 50 });
              }
            }
          } catch {}
        })
      );
      if (updated) setLocalSubmissions(newSubs);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [localSubmissions]);

  const submissionByTask = useMemo(
    () => new Map(localSubmissions.map((s) => [s.task_id, s])),
    [localSubmissions]
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
    setLocalSubmissions((prev) =>
      prev.map((item) =>
        item.task_id === taskId ? { ...item, status: "pending", resubmit_count: item.resubmit_count + 1 } : item
      )
    );
    setActiveTaskId(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 md:py-8 relative">
      <AnimatePresence>
        {toastData && <XPToast key="toast" points={toastData.points} onComplete={() => setToastData(null)} />}
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
              className="w-full flex justify-center perspective-1000"
            >
              <ChallengeCard
                challenge={challenge}
                status={getCardStatus(submission)}
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
