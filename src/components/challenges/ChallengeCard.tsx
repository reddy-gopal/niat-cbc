"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Challenge } from "@/types/app";
import type { SubmissionStatus } from "@/types/database";
import ProofLightbox from "./ProofLightbox";

export type BoardStatus = "available" | "locked" | "in_review" | "completed";

export default function ChallengeCard({
  challenge,
  status,
  onOpen,
  submissionId,
  aiReason,
  fileUrl,
  submissionStatus,
  verifiedAt,
  points,
}: {
  challenge: Challenge;
  status: BoardStatus;
  onOpen: () => void;
  submissionId?: string;
  aiReason?: string;
  fileUrl?: string | null;
  submissionStatus?: SubmissionStatus;
  verifiedAt?: string;
  points?: number;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isLocked = status === "locked";

  const getDifficulty = () => {
    if (challenge.id >= 8) return "LEGENDARY";
    if (challenge.id >= 6) return "HARD";
    if (challenge.id >= 3) return "MEDIUM";
    return "EASY";
  };

  const getStatusShadow = () => {
    if (status === "completed") return "0 0 20px #f7b801, 0 8px 16px rgba(153,27,27,0.4)";
    if (status === "in_review") return "0 0 15px #f18701, 0 8px 16px rgba(153,27,27,0.4)";
    return "0 8px 16px rgba(153,27,27,0.4)";
  };

  const isFlippedAllowed = !isLocked;

  const showRejection =
    submissionStatus === "rejected" && typeof aiReason === "string" && aiReason.length > 0;

  const showViewProof =
    Boolean(fileUrl) &&
    submissionStatus !== undefined &&
    submissionStatus !== "not_started" &&
    Boolean(submissionId);

  return (
    <div className="flex w-full max-w-[min(100%,280px)] sm:max-w-[260px] md:max-w-[280px] flex-col items-center gap-2">
      <motion.button
        type="button"
        onClick={isLocked ? undefined : onOpen}
        disabled={isLocked}
        aria-disabled={isLocked}
        initial={{ scale: 1, y: 0, rotateZ: 0 }}
        whileHover={isLocked ? {} : { y: -12, rotateZ: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`group perspective-1000 w-full min-w-0 aspect-[2/3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 ${
          isLocked ? "cursor-not-allowed" : "cursor-pointer"
        }`}
        style={{
          boxShadow: getStatusShadow(),
          borderRadius: "16px",
          fontFamily: "var(--font-body), sans-serif",
        }}
      >
        <div
          className={`relative w-full h-full preserve-3d transition-transform duration-[600ms] ${isFlippedAllowed ? "group-hover:[transform:rotateY(180deg)]" : ""}`}
        >
          {/* FRONT FACE */}
          <div
            className="absolute inset-0 backface-hidden bg-[#991b1b] border-[3px] border-[#f7b801] rounded-[16px] overflow-hidden flex flex-col items-center justify-center p-2"
            style={{ filter: isLocked ? "brightness(0.6) blur(1px)" : "none" }}
          >
            <div className="absolute top-3 left-3 text-white font-bold text-sm sm:text-base leading-none">
              {String(challenge.id).padStart(2, "0")}
            </div>

            <div className="absolute top-3 right-3 text-[#f7b801] font-bold text-[9px] sm:text-[10px] uppercase border border-[#f7b801] px-1.5 py-0.5 rounded-sm">
              {status.replace("_", " ")}
            </div>

            <div className="absolute bottom-3 right-3 text-white font-bold text-sm sm:text-base leading-none rotate-180">
              {String(challenge.id).padStart(2, "0")}
            </div>

            {status === "completed" && (
              <div className="absolute bottom-3 left-3 text-[#f7b801] font-bold text-lg leading-none">
                ✓
              </div>
            )}

            <div
              className="w-[85%] h-[55%] bg-[#f7b801] rounded-[50%] flex items-center justify-center shadow-[inset_0_0_0_4px_#f18701]"
              style={{ transform: "rotate(-15deg)" }}
            >
              <div
                className="w-[88%] h-[80%] border-[3px] border-white rounded-[50%] flex flex-col items-center justify-center px-1"
                style={{ transform: "rotate(15deg)" }}
              >
                {isLocked ? (
                  <span className="text-[#991b1b] text-5xl font-black">🔒</span>
                ) : (
                  <>
                    <span
                      className="text-white font-black tracking-[0.16em] text-[9px] sm:text-[10px]"
                      style={{ textShadow: "1px 1px 0px #f18701" }}
                    >
                      MISSION
                    </span>
                    <span
                      className="text-white font-extrabold text-[10px] sm:text-xs md:text-sm text-center px-1.5 sm:px-2 leading-tight drop-shadow-md line-clamp-3 break-words max-w-full min-w-0"
                      style={{
                        textShadow: "1px 1px 0px #f18701, -1px -1px 0 #991b1b",
                      }}
                    >
                      {challenge.title}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* BACK FACE */}
          <div className="absolute inset-0 backface-hidden bg-[#fff8eb] border-[3px] border-[#f7b801] rounded-[16px] [transform:rotateY(180deg)] p-3 sm:p-4 md:p-5 flex flex-col justify-between shadow-inner min-w-0 overflow-hidden">
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-4 border-b-2 border-[#f7b801]/30 pb-3">
                <span className="text-[#ffffff] font-black text-[10px] bg-[#f7b801] px-2 py-1 flex items-center rounded-md tracking-wider">
                  MISSION {String(challenge.id).padStart(2, "0")}
                </span>
                <span className="text-[#ffffff] font-bold text-[10px] bg-[#991b1b] px-2 py-1 rounded-md uppercase">
                  {getDifficulty()}
                </span>
              </div>

              <h3 className="text-[#991b1b] font-heading font-bold text-base sm:text-lg md:text-xl leading-[1.1] mb-2 sm:mb-3 uppercase drop-shadow-[0px_1px_1px_rgba(153,27,27,0.2)] break-words [overflow-wrap:anywhere] line-clamp-3">
                {challenge.title}
              </h3>

              <p className="text-[#991b1b]/90 font-semibold text-[11px] sm:text-xs leading-snug line-clamp-4">
                {challenge.description}
              </p>
            </div>

            <div className="mt-auto pt-3 shrink-0">
              <div className="w-full bg-[#f18701] text-white font-black text-xs sm:text-sm text-center py-2 sm:py-2.5 rounded-lg shadow-sm border border-[#f7b801]">
                +{challenge.points} Points
              </div>
            </div>
          </div>
        </div>
      </motion.button>

      {showRejection && (
        <div className="w-full rounded-lg border border-orange-400/80 bg-orange-50 px-3 py-2 text-left text-[11px] sm:text-xs font-semibold leading-snug text-orange-950 shadow-sm">
          <span className="font-black text-orange-800">❌ Reason:</span> {aiReason}
        </div>
      )}

      {showViewProof && submissionId && submissionStatus && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
            className="w-full rounded-lg border-2 border-[#f7b801] bg-[#fff8eb] px-3 py-2 text-center text-xs font-bold text-[#991b1b] shadow-sm transition hover:bg-[#f7b801]/20"
          >
            View Proof →
          </button>
          <ProofLightbox
            submissionId={submissionId}
            taskName={challenge.title}
            status={submissionStatus}
            aiReason={aiReason}
            verifiedAt={verifiedAt}
            points={points}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
        </>
      )}
    </div>
  );
}
