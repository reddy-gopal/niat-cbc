import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Challenge, StudentSession } from "@/types/app";
import UploadZone from "./UploadZone";
import { buildChallenge8ReferralUrl } from "@/lib/utils";

type UploadState = "idle" | "uploading" | "received";

export default function MissionModal({
  isOpen,
  onClose,
  challenge,
  session,
  onSubmitSuccess,
  isSubmissionLocked,
}: {
  isOpen: boolean;
  onClose: () => void;
  challenge: Challenge | null;
  session: StudentSession;
  onSubmitSuccess: (payload: { taskId: number; submissionId?: string }) => void;
  isSubmissionLocked: boolean;
}) {
  const [accepted, setAccepted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [textResponse, setTextResponse] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const referralUrl = useMemo(
    () => buildChallenge8ReferralUrl(session),
    [session]
  );

  const wordCount = useMemo(() => {
    if (!textResponse.trim()) return 0;
    return textResponse.trim().split(/\s+/).length;
  }, [textResponse]);

  useEffect(() => {
    if (!isOpen) {
      setAccepted(false);
      setSelectedFile(null);
      setPreview(null);
      setTextResponse("");
      setError(null);
      setUploadState("idle");
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  if (!challenge || typeof window === "undefined") return null;

  const handleSubmit = async () => {
    if (isSubmissionLocked) {
      setError("This challenge is already completed and cannot be submitted again.");
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

    try {
      const res = await fetch("/api/submissions/upload", { method: "POST", body: formData });
      const result = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
        data?: { submissionId?: string; attemptId?: string };
      };
      if (!res.ok || !result.success) {
        setError(result.error || "Submission failed. Try again.");
        setUploadState("idle");
        return;
      }
      setUploadState("received");
      onSubmitSuccess({ taskId: challenge.id, submissionId: result.data?.submissionId });
      window.setTimeout(() => {
        onClose();
      }, 2500);
    } catch {
      setError("Network error. Try again.");
      setUploadState("idle");
    }
  };

  const formattedId = String(challenge.id).padStart(2, "0");
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
        className="relative w-full min-w-0 max-w-lg max-h-[90vh] bg-[#991b1b] border-[4px] sm:border-[6px] border-[#f7b801] rounded-2xl shadow-[0px_20px_50px_rgba(153,27,27,0.8)] z-10 p-2 overflow-hidden"
      >
        <div
          className="bg-[#ffffff] h-full w-full min-w-0 rounded-xl p-3 sm:p-5 md:p-6 relative flex flex-col items-center overflow-y-auto overflow-x-hidden"
          style={{ fontFamily: "var(--font-body), sans-serif" }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={uploadState === "uploading"}
            className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 text-[#991b1b] font-black text-base sm:text-lg hover:scale-110 transition-transform disabled:opacity-40 disabled:pointer-events-none"
          >
            ✕
          </button>

          {/* Top UNO Oval */}
          <div
            className="w-[5.25rem] h-12 sm:w-28 sm:h-16 md:w-32 md:h-20 bg-[#f7b801] rounded-[50%] flex items-center justify-center shadow-[inset_0_0_0_4px_#f18701] mb-3 sm:mb-5"
            style={{ transform: "rotate(-5deg)" }}
          >
            <div
              className="w-[85%] h-[80%] border-[3px] sm:border-4 border-[#ffffff] rounded-[50%] flex flex-col items-center justify-center p-1 min-w-0"
              style={{ transform: "rotate(5deg)" }}
            >
              <span
                className="text-[#ffffff] text-xl sm:text-3xl font-black"
                style={{ textShadow: "2px 2px 0px #f18701" }}
              >
                {formattedId}
              </span>
            </div>
          </div>

          <div className="text-center mb-6 sm:mb-8 flex-1 w-full min-w-0 max-w-sm px-0.5">
            <h2 className="text-[#991b1b] font-heading font-bold text-base sm:text-lg md:text-xl uppercase mb-2 sm:mb-3 drop-shadow-sm break-words [overflow-wrap:anywhere] leading-tight">
              {challenge.title}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <span className="bg-[#f7b801] text-[#ffffff] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded shadow-sm text-[10px] sm:text-xs border border-[#f18701]">
                +{challenge.points} Points
              </span>
              {challenge.id === 9 && (
                <span className="bg-[#991b1b] text-[#ffffff] font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded shadow-sm text-[9px] sm:text-[10px] uppercase border border-[#991b1b] max-w-full">
                  DEADLINE: {challenge.day}
                </span>
              )}
            </div>
            <p className="text-[#991b1b] font-medium text-[11px] sm:text-xs bg-[#fff8eb] p-2.5 sm:p-3 md:p-4 rounded-xl border border-[#f7b801] shadow-sm tracking-normal sm:tracking-wide leading-relaxed text-center break-words [overflow-wrap:anywhere]">
              {challenge.description}
            </p>
          </div>

          <div className="w-full">
            {isSubmissionLocked ? (
              <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50 px-4 py-5 text-center shadow-inner">
                <div className="text-2xl mb-2" aria-hidden>
                  ✅
                </div>
                <p className="text-[#065f46] font-heading font-bold text-base sm:text-lg">
                  Challenge already completed
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-900/90">
                  This mission is one-time only, so you cannot submit it again.
                </p>
              </div>
            ) : !accepted ? (
              <button
                type="button"
                onClick={() => {
                  setAccepted(true);
                  if (challenge.isReferral) {
                    window.open(referralUrl, "_blank", "noopener,noreferrer");
                  }
                }}
                className="w-full bg-[#f7b801] text-[#991b1b] font-black text-xs sm:text-sm md:text-base tracking-[0.05em] sm:tracking-[0.08em] py-2.5 sm:py-3.5 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(247,184,1,0.5)] border-2 border-[#f18701]"
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
                    Community Form Opened In New Tab
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
                      onClick={() => {
                        window.open(referralUrl, "_blank", "noopener,noreferrer");
                      }}
                    >
                      OPEN
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-center text-orange-700 font-medium">
                  Points will be added automatically when someone joins using your link.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in">
                {challenge.requiresText ? (
                  <div className="space-y-2">
                    <textarea 
                      className="w-full min-h-[120px] p-4 rounded-xl border-2 border-[#f7b801] text-xs sm:text-sm text-[#991b1b] focus:outline-none focus:ring-2 focus:ring-[#f7b801]/50 placeholder:text-[#991b1b]/40 bg-[#fff8eb]"
                      placeholder={challenge.placeholder}
                      value={textResponse}
                      onChange={(e) => setTextResponse(e.target.value)}
                      disabled={formLocked}
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
                      setPreview(URL.createObjectURL(f));
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
                    className="w-full bg-[#991b1b] border-[3px] border-[#f7b801] text-[#f7b801] font-black tracking-[0.08em] sm:tracking-widest text-xs sm:text-sm md:text-base py-2.5 sm:py-3.5 rounded-xl hover:bg-[#b91c1c] active:scale-95 transition-all shadow-[0_4px_15px_rgba(153,27,27,0.4)] disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
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
