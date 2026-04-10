import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Challenge, StudentSession } from "@/types/app";
import UploadZone from "./UploadZone";

export default function MissionModal({
  isOpen,
  onClose,
  challenge,
  session,
  onSubmitSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  challenge: Challenge | null;
  session: StudentSession;
  onSubmitSuccess: (taskId: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);
  
  useEffect(() => {
    if (!isOpen) {
      setAccepted(false);
      setSelectedFile(null);
      setPreview(null);
      setError(null);
      setIsUploading(false);
    }
  }, [isOpen]);

  if (!mounted || !challenge) return null;

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("taskId", String(challenge.id));
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/submissions/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || "Upload failed. Try again.");
        setIsUploading(false);
        return;
      }
      onSubmitSuccess(challenge.id);
    } catch {
      setError("Network error. Try again.");
      setIsUploading(false);
    }
  };

  const formattedId = String(challenge.id).padStart(2, '0');

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-lg max-h-[90vh] bg-[#991b1b] border-[4px] sm:border-[6px] border-[#f7b801] rounded-2xl shadow-[0px_20px_50px_rgba(153,27,27,0.8)] z-10 p-2 overflow-hidden"
      >
        <div className="bg-[#ffffff] h-full w-full rounded-xl p-4 sm:p-6 relative flex flex-col items-center overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4 text-[#991b1b] font-black text-xl hover:scale-110 transition-transform">✕</button>

            {/* Top UNO Oval */}
            <div className="w-28 h-16 sm:w-32 sm:h-20 bg-[#f7b801] rounded-[50%] flex items-center justify-center shadow-[inset_0_0_0_4px_#f18701] mb-5 sm:mb-6" style={{ transform: "rotate(-5deg)" }}>
              <div className="w-[85%] h-[80%] border-4 border-[#ffffff] rounded-[50%] flex flex-col items-center justify-center p-1" style={{ transform: "rotate(5deg)" }}>
                 <span className="text-[#ffffff] text-3xl font-black" style={{ textShadow: "2px 2px 0px #f18701" }}>{formattedId}</span>
              </div>
            </div>

            <div className="text-center mb-8 flex-1 w-full max-w-sm">
                <h2 className="text-[#991b1b] font-black text-xl sm:text-2xl uppercase mb-3 drop-shadow-sm break-words [overflow-wrap:anywhere]">{challenge.title}</h2>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                  <span className="bg-[#f7b801] text-[#ffffff] font-black px-3 py-1 rounded shadow-sm text-xs sm:text-sm border border-[#f18701]">
                    +{challenge.points * 50} XP
                  </span>
                  <span className="bg-[#991b1b] text-[#ffffff] font-bold px-3 py-1 rounded shadow-sm text-[10px] sm:text-xs uppercase border border-[#991b1b]">
                    DEADLINE: {challenge.day}
                  </span>
                </div>
                <p className="text-[#991b1b] font-bold text-sm bg-[#fff8eb] p-4 rounded-xl border border-[#f7b801] shadow-sm tracking-wide leading-relaxed">
                  {challenge.description}
                </p>
            </div>

            <div className="w-full">
              {!accepted ? (
                <button
                   onClick={() => {
                     if (!challenge.requiresUpload) {
                       window.open(`https://niat.ac.in/refer?utm_source=cbc_bootcamp&utm_medium=magic_link&bc=${session.bootcampId}&sec=${session.sectionId}`, "_blank");
                     } else {
                       setAccepted(true);
                     }
                   }}
                   className="w-full bg-[#f7b801] text-[#991b1b] font-black text-base sm:text-xl tracking-[0.08em] sm:tracking-[0.1em] py-3 sm:py-4 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(247,184,1,0.5)] border-2 border-[#f18701]"
                >
                  {challenge.requiresUpload ? "ACCEPT MISSION" : "INITIATE REFERRAL"}
                </button>
              ) : (
                <div className="space-y-4 animate-in fade-in">
                  <UploadZone 
                    onFileSelect={(f) => { setSelectedFile(f); setPreview(URL.createObjectURL(f)); setError(null); }} 
                    preview={preview} 
                  />
                  {error && <div className="text-[#ffffff] bg-[#991b1b] text-xs font-bold text-center px-4 py-3 rounded-lg border border-[#f7b801]">{error}</div>}
                  {preview && (
                    <button 
                      onClick={handleSubmit}
                      disabled={isUploading}
                      className="w-full bg-[#991b1b] border-[3px] border-[#f7b801] text-[#f7b801] font-black tracking-widest text-base sm:text-lg py-3 sm:py-4 rounded-xl hover:bg-[#b91c1c] active:scale-95 transition-all shadow-[0_4px_15px_rgba(153,27,27,0.4)] disabled:opacity-50"
                    >
                      {isUploading ? "UPLOADING..." : "SUBMIT PROOF"}
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
