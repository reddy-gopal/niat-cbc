"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Challenge, StudentSession } from "@/types/app";
import type { Submission } from "@/types/database";
import { useSubmissionPolling } from "@/hooks/useSubmissionPolling";
import { SLOT_MAP } from "@/lib/challenges";
import MissionModal from "./MissionModal";
import XPToast from "./XPToast";
import RejectToast from "./RejectToast";

type ChallengeBoardProps = {
  challenges: Challenge[];
  submissions: Submission[];
  setSubmissions: Dispatch<SetStateAction<Submission[]>>;
  session: StudentSession;
  onSubmissionsUpdate?: (submissions: Submission[]) => void;
  completedCount?: number;
  hasRevealed?: boolean;
};

type CellStatus = "locked" | "pending" | "completed";
const STORY_IMAGE_URL = "/api/story-image";

export default function ChallengeBoard({
  challenges,
  submissions,
  setSubmissions,
  session,
  onSubmissionsUpdate,
  completedCount = 0,
  hasRevealed = false,
}: ChallengeBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [toastData, setToastData] = useState<{ id: number; points: number } | null>(null);
  const [rejectToastMessage, setRejectToastMessage] = useState<string | null>(null);
  const shouldRevealCompletedImage = hasRevealed;

  useSubmissionPolling(submissions, setSubmissions, {
    onAccepted: ({ taskId, points }) => setToastData({ id: taskId, points }),
    onRejected: (message) => setRejectToastMessage(message),
    onUpdate: (next) => onSubmissionsUpdate?.(next),
  });

  const submissionByTask = useMemo(() => {
    const map = new Map<number, Submission[]>();
    for (const row of submissions) {
      const list = map.get(row.task_id) ?? [];
      list.push(row);
      map.set(row.task_id, list);
    }
    return map;
  }, [submissions]);

  const activeChallenge = useMemo(() => challenges.find((c) => c.id === activeTaskId) ?? null, [activeTaskId, challenges]);

  const getCellStatus = (challenge: Challenge): CellStatus => {
    const rows = submissionByTask.get(challenge.id) ?? [];
    if (rows.length === 0) return "locked";
    if (challenge.id === 9) {
      const acceptedCount = rows.filter((row) => row.status === "accepted").length;
      if (acceptedCount >= (challenge.streakDays ?? 3)) return "completed";
      if (rows.some((row) => row.status === "pending")) return "pending";
      return "locked";
    }
    if (rows.some((row) => row.status === "accepted")) return "completed";
    if (rows.some((row) => row.status === "pending")) return "pending";
    return "locked";
  };

  const isSubmissionLocked = (challenge: Challenge) => {
    const status = getCellStatus(challenge);
    if (challenge.id === 5) return false;
    return status === "completed";
  };

  const handleSubmitted = ({ taskId, submissionId }: { taskId: number; submissionId?: string }) => {
    setSubmissions((prev) => {
      let next = prev;
      if (taskId === 9) {
        const existing = prev.filter((item) => item.task_id === 9);
        if (submissionId) {
          next = [
            ...prev,
            {
              id: submissionId,
              student_id: session.studentId,
              bootcamp_id: session.bootcampId,
              section_id: session.sectionId,
              region_id: session.regionId,
              task_id: 9,
              streak_day: Math.min(existing.length + 1, 3),
              file_url: null, file_hash: null, status: "pending", points: 0, ai_reason: null, text_response: null, resubmit_count: 1, verification_attempts: 0, last_attempted_at: null, verified_at: null, override_by: null, override_note: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            },
          ];
        }
      } else {
        if (submissionId) {
           next = [...prev.filter(r => r.id !== submissionId), {
              id: submissionId, student_id: session.studentId, bootcamp_id: session.bootcampId, section_id: session.sectionId, region_id: session.regionId, task_id: taskId, streak_day: null, file_url: null, file_hash: null, status: "pending", points: 0, ai_reason: null, text_response: null, resubmit_count: 1, verification_attempts: 0, last_attempted_at: null, verified_at: null, override_by: null, override_note: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
           }];
        }
      }
      onSubmissionsUpdate?.(next);
      return next;
    });
    setActiveTaskId(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 relative z-10">
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

      {/* Grid Container */}
      <div 
        className={`
          grid grid-cols-3
          bg-[#f7b801]/30 rounded-2xl overflow-hidden shadow-2xl aspect-square z-10
          ${shouldRevealCompletedImage ? 'gap-0 border-none' : 'gap-1 border-2 border-[#f7b801]/40'}
        `}
        style={{
          boxShadow: shouldRevealCompletedImage 
            ? '0 0 0px rgba(239,159,39,0), 0 0 40px rgba(239,159,39,0.5), 0 0 80px rgba(239,159,39,0.2)' 
            : undefined,
          transition: 'box-shadow 2s ease, gap 0.8s ease',
        }}
      >
        {challenges.slice(0, 9).map((challenge, i) => {
          const status = getCellStatus(challenge);
          const locked = isSubmissionLocked(challenge);
          
          const pieceIndex = shouldRevealCompletedImage ? i : SLOT_MAP[i];
          const row = Math.floor(pieceIndex / 3);
          const col = pieceIndex % 3;

          return (
            <motion.div
              key={challenge.id}
              whileHover={{ scale: status !== "completed" ? 1.02 : 1 }}
              whileTap={{ scale: 0.98 }}
              className={`relative group overflow-hidden ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
              onClick={() => { if (!locked) setActiveTaskId(challenge.id); }}
            >
              <div 
                className="absolute inset-0 transition-all duration-700 ease-out"
                style={{
                  backgroundImage: `url(${STORY_IMAGE_URL})`,
                  backgroundSize: "300% 300%",
                  backgroundPosition: `${col * 50}% ${row * 50}%`,
                  filter: shouldRevealCompletedImage || status === "completed" ? "none" : (status === "pending" ? "blur(10px) brightness(0.7)" : "blur(16px) brightness(0.45)"),
                }}
              />

              <div 
                className={`absolute inset-0 transition-all duration-1000 ${shouldRevealCompletedImage ? 'opacity-0' : 'opacity-100'}`}
                style={{
                  backgroundColor: status === "completed" ? "rgba(0,0,0,0)" : (status === "pending" ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.88)")
                }}
              />

              {status === "pending" && (
                <div className={`absolute inset-0 bg-[#f7b801]/20 animate-[pulse_2s_ease-in-out_infinite] ${shouldRevealCompletedImage ? 'hidden' : ''}`} />
              )}

              <div className={`absolute inset-0 p-3 sm:p-5 flex flex-col justify-between z-10 transition-opacity duration-1000 ${shouldRevealCompletedImage ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] sm:text-xs font-black text-white/40 tracking-tighter">
                    {String(challenge.id).padStart(2, "0")}
                  </span>
                  {status === "completed" && (
                    <div className="bg-[#f7b801] text-[#991b1b] rounded-full p-1 shadow-lg">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                  )}
                </div>

                {status !== "completed" && (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <h3 className="text-[10px] sm:text-xs md:text-sm font-black text-white leading-tight uppercase drop-shadow-md">{challenge.title}</h3>
                  </div>
                )}
                
                <div className="flex justify-end">
                   <div className={`text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm ${status === "completed" ? "bg-[#f7b801] text-[#991b1b]" : "bg-white/10 text-white/60"}`}>
                     +{challenge.points} Points
                   </div>
                </div>
              </div>

              {status === "completed" && (
                <div className={`absolute inset-0 border-2 border-[#f7b801] shadow-[inset_0_0_20px_rgba(247,184,1,0.4)] z-20 pointer-events-none transition-opacity duration-1000 ${shouldRevealCompletedImage ? 'opacity-0' : 'opacity-100'}`} />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 text-center text-[#991b1b]/60 text-xs font-bold uppercase tracking-[0.2em] relative z-20">
        Reveal the Story: Complete challenges to uncover each puzzle piece
      </div>

      {shouldRevealCompletedImage && (
         <div className="mt-4 text-center text-[#f7b801] text-lg font-black uppercase tracking-widest relative z-20 drop-shadow-lg">
           The Image is Complete
         </div>
      )}

      <MissionModal
        isOpen={Boolean(activeTaskId)}
        challenge={activeChallenge}
        session={session}
        onClose={() => setActiveTaskId(null)}
        onSubmitSuccess={handleSubmitted}
        isSubmissionLocked={activeChallenge ? isSubmissionLocked(activeChallenge) : false}
      />
    </div>
  );
}
