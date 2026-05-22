import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Challenge, StudentSession } from "@/types/app";
import { CHALLENGE_ID_MAP } from "@/lib/challenges";
import UploadZone from "./UploadZone";
import DailyPostChallenge from "./DailyPostChallenge";
import { isDateScheduleLockMessage } from "@/lib/challenge-unlock";
import { fetchApiJson } from "@/lib/fetch-api-error";
import { buildChallenge8ReferralUrl } from "@/lib/utils";
import type { StudentChallengeStatus } from "@/types/database";

type UploadState = "idle" | "uploading" | "received";
const REFERRAL_STATS_URL = "https://nxtrewards.ccbp.in/";

export default function MissionModal({
  isOpen,
  onClose,
  challenge,
  session,
  onSubmitSuccess,
  isSubmissionLocked,
  submissionLockMessage,
  stoneColor,
  challengeStatuses,
  instagramHandle,
  onInstagramHandleSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  challenge: Challenge | null;
  session: StudentSession;
  challengeStatuses: StudentChallengeStatus[];
  instagramHandle: string | null;
  onInstagramHandleSaved: (handle: string) => void;
  onSubmitSuccess: (payload: { taskId: number; submissionId?: string }) => void;
  isSubmissionLocked: boolean;
  submissionLockMessage?: string | null;
  stoneColor?: string;
}) {
  const [accepted, setAccepted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [textResponse, setTextResponse] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{
    kind: "success" | "info" | "error";
    text: string;
  } | null>(null);
  const [copyLabel, setCopyLabel] = useState("COPY");

  const referralUrl = useMemo(
    () => buildChallenge8ReferralUrl(session),
    [session]
  );
  const referralFirstOpenKey = useMemo(
    () => `cbc:referral-form-opened:${session.studentId}:${challenge?.id ?? "unknown"}`,
    [session.studentId, challenge?.id]
  );

  const wordCount = useMemo(() => {
    if (!textResponse.trim()) return 0;
    return textResponse.trim().split(/\s+/).length;
  }, [textResponse]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (!isOpen) {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      setAccepted(false);
      setSelectedFile(null);
      setPreview(null);
      setTextResponse("");
      setError(null);
      setUploadState("idle");
      setClaimLoading(false);
      setClaimMessage(null);
      setCopyLabel("COPY");
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  if (!challenge || typeof window === "undefined") return null;

  const modalStoneColor = stoneColor ?? "var(--hero-from)";
  const modalStoneDeep = `color-mix(in srgb, ${modalStoneColor} 55%, black)`;
  const modalStoneSoft = `color-mix(in srgb, ${modalStoneColor} 18%, white)`;
  const modalStoneBorder = `color-mix(in srgb, ${modalStoneColor} 82%, white)`;
  const modalStoneGlow = `color-mix(in srgb, ${modalStoneColor} 45%, transparent)`;
  const isDateScheduleLocked =
    isSubmissionLocked && isDateScheduleLockMessage(submissionLockMessage);

  const handleSubmit = async () => {
    if (isSubmissionLocked) {
      setError(submissionLockMessage ?? "This challenge cannot be submitted right now.");
      return;
    }
    if (challenge.requiresUpload && !selectedFile) return;
    if (challenge.requiresText && !textResponse.trim()) return;
    
    setUploadState("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("taskId", String(challenge.id));
    if (selectedFile) formData.append("file", selectedFile);
    if (textResponse) formData.append("textResponse", textResponse);

    const result = await fetchApiJson<{
      success?: boolean;
      error?: string;
      message?: string;
      data?: { submissionId?: string; attemptId?: string };
    }>("/api/submissions/upload", { method: "POST", body: formData });

    if (!result.ok) {
      setError(result.message);
      setUploadState("idle");
      return;
    }

    setUploadState("received");
    onSubmitSuccess({
      taskId: challenge.id,
      submissionId: result.body.data?.submissionId,
    });
    window.setTimeout(() => {
      onClose();
    }, 2500);
  };

  const handleClaimChallenge5 = async () => {
    setClaimLoading(true);
    setClaimMessage(null);
    const result = await fetchApiJson<{
      success?: boolean;
      message?: string;
      referralCount?: number;
      pointsAwarded?: number;
      status?: "accepted" | "rejected";
    }>("/api/submissions/claim-challenge5", { method: "POST" });

    if (!result.ok) {
      setClaimMessage({ kind: "error", text: result.message });
    } else if (result.body.message === "No referrals found yet.") {
      setClaimMessage({
        kind: "info",
        text: "No referrals verified yet. Share your link and try again.",
      });
    } else if ((result.body.pointsAwarded ?? 0) === 0 || result.body.status === "rejected") {
      setClaimMessage({
        kind: "info",
        text: "No referrals verified yet. Challenge is currently marked as rejected.",
      });
    } else {
      setClaimMessage({
        kind: "success",
        text: `🎉 ${result.body.referralCount ?? 0} referrals found! ${result.body.pointsAwarded ?? 0} points awarded.`,
      });
      window.setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1400);
    }
    setClaimLoading(false);
  };

  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopyLabel("COPIED");
      window.setTimeout(() => setCopyLabel("COPY"), 1200);
    } catch {
      setCopyLabel("FAILED");
      window.setTimeout(() => setCopyLabel("COPY"), 1200);
    }
  };

  const handleAcceptMission = () => {
    setAccepted(true);
    if (!challenge?.isReferral) return;

    try {
      const openedOnce = window.localStorage.getItem(referralFirstOpenKey);
      if (!openedOnce) {
        window.localStorage.setItem(referralFirstOpenKey, "1");
        window.open(referralUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      // If localStorage is blocked, keep old behavior to avoid blocking user flow.
      window.open(referralUrl, "_blank", "noopener,noreferrer");
    }
  };

  const displayId = CHALLENGE_ID_MAP[challenge.id] ?? challenge.id;
  const formattedId = String(displayId).padStart(2, "0");
  const formLocked = uploadState === "uploading" || uploadState === "received";

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={uploadState === "uploading" ? undefined : handleClose}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative flex w-full min-w-0 max-w-lg max-h-[90vh] flex-col border-[4px] sm:border-[6px] rounded-2xl z-10 p-2 overflow-hidden"
        style={{
          background: modalStoneDeep,
          borderColor: modalStoneBorder,
          boxShadow: `0 20px 50px ${modalStoneGlow}`,
        }}
      >
        <div
          className="bg-[#ffffff] min-h-0 flex-1 w-full min-w-0 rounded-xl p-3 sm:p-5 md:p-6 relative flex flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain"
          style={{ fontFamily: "var(--font-body), sans-serif" }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={uploadState === "uploading"}
            className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 font-black text-base sm:text-lg hover:scale-110 transition-transform disabled:opacity-40 disabled:pointer-events-none"
            style={{ color: modalStoneDeep }}
          >
            ✕
          </button>

          {/* Top UNO Oval */}
          <div
            className="w-[5.25rem] h-12 sm:w-28 sm:h-16 md:w-32 md:h-20 rounded-[50%] flex items-center justify-center mb-3 sm:mb-5"
            style={{ transform: "rotate(-5deg)" }}
          >
            <div
              className="w-[85%] h-[80%] border-[3px] sm:border-4 border-[#ffffff] rounded-[50%] flex flex-col items-center justify-center p-1 min-w-0"
              style={{
                transform: "rotate(5deg)",
                background: modalStoneColor,
                boxShadow: `inset 0 0 0 4px ${modalStoneDeep}`,
              }}
            >
              <span
                className="text-[#ffffff] text-xl sm:text-3xl font-black"
                style={{ textShadow: `2px 2px 0px ${modalStoneDeep}` }}
              >
                {formattedId}
              </span>
            </div>
          </div>

          <div className="text-center mb-6 sm:mb-8 flex-1 w-full min-w-0 max-w-sm px-0.5">
            <h2
              className="font-heading font-bold text-base sm:text-lg md:text-xl uppercase mb-2 sm:mb-3 drop-shadow-sm break-words [overflow-wrap:anywhere] leading-tight"
              style={{ color: modalStoneDeep }}
            >
              {challenge.title}
            </h2>
            {!isDateScheduleLocked && (
              <>
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  <span
                    className="text-[#ffffff] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded shadow-sm text-[10px] sm:text-xs border"
                    style={{ background: modalStoneColor, borderColor: modalStoneDeep }}
                  >
                    {challenge.id === 6
                      ? `+${challenge.points} Points Daily`
                      : `+${challenge.points} Points`}
                  </span>
                  {challenge.id === 6 && (
                    <span className="bg-[#991b1b] text-[#ffffff] font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded shadow-sm text-[9px] sm:text-[10px] uppercase border border-[#991b1b] max-w-full">
                      DEADLINE: {challenge.day}
                    </span>
                  )}
                </div>
                <p
                  className="font-medium text-[11px] sm:text-xs p-2.5 sm:p-3 md:p-4 rounded-xl border shadow-sm tracking-normal sm:tracking-wide leading-relaxed text-center break-words [overflow-wrap:anywhere]"
                  style={{
                    color: modalStoneDeep,
                    background: modalStoneSoft,
                    borderColor: modalStoneBorder,
                  }}
                >
                  {challenge.description}
                </p>
              </>
            )}
          </div>

          <div className="w-full">
            {isSubmissionLocked ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border-2 px-4 py-5 text-center shadow-inner ${
                  isDateScheduleLockMessage(submissionLockMessage)
                    ? "border-slate-300 bg-slate-50"
                    : "border-emerald-600 bg-emerald-50"
                }`}
              >
                <div className="text-2xl mb-2" aria-hidden>
                  {isDateScheduleLockMessage(submissionLockMessage) ? "🔒" : "✅"}
                </div>
                <p
                  className={`font-heading font-bold text-base sm:text-lg leading-snug ${
                    isDateScheduleLockMessage(submissionLockMessage)
                      ? "text-slate-800"
                      : "text-[#065f46]"
                  }`}
                >
                  {submissionLockMessage ??
                    (isDateScheduleLockMessage(submissionLockMessage)
                      ? "Not available yet."
                      : "Already completed.")}
                </p>
              </motion.div>
            ) : !accepted ? (
              <button
                type="button"
                onClick={handleAcceptMission}
                className="w-full bg-[#f7b801] text-[#991b1b] font-black text-xs sm:text-sm md:text-base tracking-[0.05em] sm:tracking-[0.08em] py-2.5 sm:py-3.5 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(247,184,1,0.5)] border-2 border-[#f18701]"
                style={{
                  background: modalStoneColor,
                  color: "white",
                  borderColor: modalStoneDeep,
                  boxShadow: `0 4px 15px ${modalStoneGlow}`,
                }}
              >
                ACCEPT MISSION
              </button>
            ) : uploadState === "received" ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="rounded-xl border-2 border-emerald-600 bg-emerald-50 px-4 py-5 text-center shadow-inner"
              >
                <div className="text-2xl mb-2" aria-hidden>
                  ✅
                </div>
                <p className="text-[#065f46] font-heading font-bold text-base sm:text-lg">
                  Proof received!
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-900/90">
                  We are reviewing your submission — results will appear on your dashboard shortly.
                </p>
              </motion.div>
            ) : challenge.isReferral ? (
              <div className="space-y-4">
                <div className="bg-orange-50 border-2 border-dashed border-orange-200 p-4 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-orange-800 mb-2 tracking-wider">
                    Onboarding Form 
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={referralUrl}
                      className="flex-1 bg-white border border-orange-200 px-3 py-2 rounded text-xs text-orange-900 outline-none"
                    />
                    <button
                      type="button"
                      className="bg-orange-500 text-white px-4 py-2 rounded text-xs font-bold hover:bg-orange-600 transition-colors"
                      onClick={handleCopyReferralLink}
                    >
                      {copyLabel}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleClaimChallenge5();
                  }}
                  disabled={claimLoading}
                  className="w-full border-[2px] text-white font-black tracking-wide text-xs sm:text-sm py-2.5 rounded-xl active:scale-[0.99] transition-all disabled:opacity-60 disabled:pointer-events-none"
                  style={{
                    background: modalStoneDeep,
                    borderColor: modalStoneBorder,
                  }}
                >
                  {claimLoading
                    ? "CHECKING REFERRALS..."
                    : "Check My Referrals & Claim Points"}
                </button>
                <div className="bg-orange-50 border-2 border-dashed border-orange-200 p-4 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-orange-800 mb-2 tracking-wider">
                    Referral Portal
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={REFERRAL_STATS_URL}
                      className="flex-1 bg-white border border-orange-200 px-3 py-2 rounded text-xs text-orange-900 outline-none"
                    />
                    <a
                      href={REFERRAL_STATS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-orange-500 text-white px-4 py-2 rounded text-xs font-bold hover:bg-orange-600 transition-colors inline-flex items-center"
                    >
                      OPEN
                    </a>
                  </div>
                </div>
                {claimMessage ? (
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                      claimMessage.kind === "success"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : claimMessage.kind === "info"
                          ? "border-orange-300 bg-orange-50 text-orange-800"
                          : "border-red-300 bg-red-50 text-red-800"
                    }`}
                  >
                    {claimMessage.text}
                  </div>
                ) : (
                  <p className="text-[10px] text-center text-orange-700 font-medium">
                    Share your link, then use the button above to claim your referral points.
                  </p>
                )}
              </div>
            ) : challenge.id === 6 ? (
              <DailyPostChallenge
                status={challengeStatuses.find((s) => s.task_id === 6) ?? null}
                instagramHandle={instagramHandle}
                onInstagramHandleSaved={onInstagramHandleSaved}
                onSuccess={onSubmitSuccess}
                stoneColor={modalStoneColor}
              />
            ) : (
              <div className="space-y-4 animate-in fade-in">
                {challenge.requiresText ? (
                  <div className="space-y-2">
                    <textarea 
                      className="w-full min-h-[120px] p-4 rounded-xl border-2 text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder:opacity-60"
                      placeholder={challenge.placeholder}
                      value={textResponse}
                      onChange={(e) => setTextResponse(e.target.value)}
                      disabled={formLocked}
                      style={{
                        borderColor: modalStoneBorder,
                        color: modalStoneDeep,
                        background: modalStoneSoft,
                        caretColor: modalStoneDeep,
                      }}
                    />
                    {challenge.maxWords && (
                      <div className="flex justify-between items-center px-1">
                        <span className={`text-[10px] font-bold ${wordCount > challenge.maxWords ? 'text-red-500' : 'text-[#991b1b]/60'}`}>
                          {wordCount} / {challenge.maxWords} words
                        </span>
                        {wordCount > challenge.maxWords && (
                          <span className="text-[10px] font-bold text-red-500">Too long!</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <UploadZone
                    onFileSelect={(f) => {
                      setSelectedFile(f);
                      setPreview((prev) => {
                        if (prev) {
                          URL.revokeObjectURL(prev);
                        }
                        return URL.createObjectURL(f);
                      });
                      setError(null);
                    }}
                    preview={preview}
                    disabled={formLocked}
                  />
                )}
                
                {error && (
                  <div className="text-[#ffffff] bg-[#991b1b] text-xs font-bold text-center px-4 py-3 rounded-lg border border-[#f7b801]">
                    {error}
                  </div>
                )}

                {(preview || (challenge.requiresText && textResponse.trim())) && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={formLocked || (challenge.maxWords ? wordCount > challenge.maxWords : false)}
                    className="w-full border-[3px] text-white font-black tracking-[0.08em] sm:tracking-widest text-xs sm:text-sm md:text-base py-2.5 sm:py-3.5 rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
                    style={{
                      background: modalStoneDeep,
                      borderColor: modalStoneBorder,
                      boxShadow: `0 4px 15px ${modalStoneGlow}`,
                    }}
                  >
                    {uploadState === "uploading" ? (
                      <>
                        <span
                          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#f7b801] border-t-transparent"
                          aria-hidden
                        />
                        <span>UPLOADING...</span>
                      </>
                    ) : (
                      "SUBMIT PROOF"
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(
    <AnimatePresence>{isOpen && modalContent}</AnimatePresence>,
    document.body
  );
}
