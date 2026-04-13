"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Challenge, StudentSession } from "@/types/app";
import type { Submission } from "@/types/database";
import { useSubmissionPolling } from "@/hooks/useSubmissionPolling";
import { buildChallenge8ReferralUrl } from "@/lib/utils";
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

type CellStatus = "locked" | "pending" | "completed";
const STORY_IMAGE_URL = "/api/story-image";

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
  const challenge5FormUrl = useMemo(() => buildChallenge8ReferralUrl(session), [session]);

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

  const getCellStatus = (submission?: Submission): CellStatus => {
    if (!submission) return "locked";
    if (submission.status === "accepted") return "completed";
    if (submission.status === "pending") return "pending";
    return "locked";
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
    <div className="w-full max-w-4xl mx-auto py-8">
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

      <div className="grid grid-cols-3 gap-1 bg-[#f7b801]/30 border-2 border-[#f7b801]/40 rounded-2xl overflow-hidden shadow-2xl aspect-square">
        {challenges.slice(0, 9).map((challenge, i) => {
          const submission = submissionByTask.get(challenge.id);
          const status = getCellStatus(submission);
          const row = Math.floor(i / 3);
          const col = i % 3;

          return (
            <motion.div
              key={challenge.id}
              whileHover={{ scale: status !== "completed" ? 1.02 : 1 }}
              whileTap={{ scale: 0.98 }}
              className="relative cursor-pointer group overflow-hidden"
              onClick={() => {
                if (challenge.id === 5) {
                  window.location.assign(challenge5FormUrl);
                  return;
                }
                setActiveTaskId(challenge.id);
              }}
              onDragStart={(event) => event.preventDefault()}
              onContextMenu={(event) => event.preventDefault()}
            >
              {/* Background Piece */}
              <div 
                className="absolute inset-0 transition-all duration-700 ease-out"
                style={{
                  backgroundImage: `url(${STORY_IMAGE_URL})`,
                  backgroundSize: "300% 300%",
                  backgroundPosition: `${col * 50}% ${row * 50}%`,
                  filter:
                    status === "completed"
                      ? "none"
                      : status === "pending"
                        ? "blur(10px) brightness(0.7)"
                        : "blur(16px) brightness(0.45)",
                }}
              />

              {/* Overlays */}
              <motion.div 
                className="absolute inset-0 transition-colors duration-500"
                animate={{
                  backgroundColor:
                    status === "completed"
                      ? "rgba(0,0,0,0)"
                      : status === "pending"
                        ? "rgba(0,0,0,0.72)"
                        : "rgba(0,0,0,0.88)",
                }}
              />

              {/* Progress Glow for Pending */}
              {status === "pending" && (
                <motion.div 
                  className="absolute inset-0 bg-[#f7b801]/20"
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Content */}
              <div className="absolute inset-0 p-3 sm:p-5 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] sm:text-xs font-black text-white/40 tracking-tighter">
                    {String(challenge.id).padStart(2, "0")}
                  </span>
                  {status === "completed" && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-[#f7b801] text-[#991b1b] rounded-full p-1 shadow-lg"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </motion.div>
                  )}
                </div>

                {status !== "completed" && (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <h3 className="text-[10px] sm:text-xs md:text-sm font-black text-white leading-tight uppercase drop-shadow-md">
                      {challenge.title}
                    </h3>
                    {status === "pending" && (
                      <span className="text-[8px] sm:text-[10px] font-bold text-[#f7b801] mt-1 animate-pulse italic">
                        PENDING...
                      </span>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                   <div className={`
                    text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm
                    ${status === "completed" ? "bg-[#f7b801] text-[#991b1b]" : "bg-white/10 text-white/60"}
                   `}>
                     +{challenge.points * 50} XP
                   </div>
                </div>
              </div>

              {/* Completed Border Glow */}
              {status === "completed" && (
                <div className="absolute inset-0 border-2 border-[#f7b801] shadow-[inset_0_0_20px_rgba(247,184,1,0.4)] z-20 pointer-events-none" />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 text-center text-[#991b1b]/60 text-xs font-bold uppercase tracking-[0.2em]">
        Reveal the Story: Complete challenges to uncover each puzzle piece
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
