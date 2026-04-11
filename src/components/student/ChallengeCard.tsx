"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Challenge, StudentSession } from "@/types/app";
import type { Submission } from "@/types/database";
import { buildChallenge8ReferralUrl } from "@/lib/utils";

type ChallengeCardProps = {
  challenge: Challenge;
  submission: Submission;
  studentSession: StudentSession;
};

export default function ChallengeCard({
  challenge,
  submission,
  studentSession,
}: ChallengeCardProps) {
  const [localSubmission, setLocalSubmission] = useState(submission);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [missionAccepted, setMissionAccepted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const referralUrl = useMemo(
    () => buildChallenge8ReferralUrl(studentSession),
    [studentSession]
  );

  useEffect(() => {
    setLocalSubmission(submission);
  }, [submission]);

  useEffect(() => {
    if (localSubmission.status !== "pending") return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/submissions/status?submissionId=${localSubmission.id}`,
          { cache: "no-store" }
        );
        const result = await response.json();
        if (response.ok && result.success && result.data) {
          setLocalSubmission((prev) => ({
            ...prev,
            status: result.data!.status,
            points: result.data!.points,
            ai_reason: result.data!.aiReason,
          }));
        }
      } catch {
        // Silent poll failure
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [localSubmission.id, localSubmission.status]);

  const isLocked = localSubmission.status === "rejected" && localSubmission.resubmit_count >= 3;
  const canUpload = (localSubmission.status === "not_started" || localSubmission.status === "rejected") && !isLocked;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
       setError("ONLY SECURE PNG/JPG FORMATS ACCEPTED.");
       return;
    }
    if (file.size > 10 * 1024 * 1024) {
       setError("FILE SIZE EXCEEDS LIMIT (10MB).");
       return;
    }
    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmitProof = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("taskId", String(challenge.id));
      formData.append("file", selectedFile);

      const response = await fetch("/api/submissions/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error ?? "UPLOAD FAILED. RETRY SEQUENCE INITIATED.");
        setUploading(false);
        return;
      }

      setUploadSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setUploadSuccess(false);
        setMissionAccepted(false);
        setPreviewUrl(null);
        setSelectedFile(null);
        setLocalSubmission((prev) => ({ ...prev, status: "pending" }));
        setUploading(false);
      }, 1500);

    } catch {
      setError("UPLOAD TERMINATED. CONNECTION LOST.");
      setUploading(false);
    }
  };

  const handleCardClick = () => {
    if (canUpload) {
      if (!challenge.requiresUpload) {
        window.open(referralUrl, "_blank", "noopener,noreferrer");
      } else {
        setIsModalOpen(true);
      }
    }
  };

  return (
    <>
      <div 
        className="group perspective-1000 relative h-72 w-full cursor-pointer" 
        onClick={handleCardClick}
      >
        <div className="w-full h-full preserve-3d transition-transform duration-700 ease-out group-hover:[transform:rotateY(180deg)] relative">
          
          {/* FRONT OF CARD (HUD STYLED) */}
          <div className="absolute inset-0 backface-hidden bg-zinc-950 border-2 border-red-900/50 rounded-xl flex flex-col items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(220,38,38,0.15)] scanlines">
             <div className="absolute inset-0 border border-red-500/30 rounded-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-80" />
             
             <div className="z-20 text-center flex flex-col items-center justify-center relative">
                <span className="text-red-500 font-heading font-black tracking-[0.3em] text-sm opacity-80 mb-2">MISSION</span>
                <span className="text-white font-heading font-black tracking-widest text-6xl mb-6 neon-text">
                  {challenge.id < 10 ? `0${challenge.id}` : challenge.id}
                </span>

                <div className={`px-4 py-1 border rounded-sm tracking-widest text-[10px] uppercase font-bold shadow-sm ${
                   localSubmission.status === 'not_started' ? 'bg-red-950/50 text-red-400 border-red-500/50 animate-pulse' :
                   localSubmission.status === 'pending' ? 'bg-amber-900/50 text-amber-400 border-amber-500/50 animate-pulse' :
                   localSubmission.status === 'accepted' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/50' :
                   isLocked ? 'bg-zinc-800 text-zinc-400 border-zinc-600' : 'bg-red-950/50 text-red-400 border-red-500/50 animate-pulse'
                }`}>
                   {localSubmission.status === 'not_started' ? 'AVAILABLE' :
                    localSubmission.status === 'pending' ? 'VERIFYING' :
                    localSubmission.status === 'accepted' ? 'COMPLETED' : 
                    isLocked ? 'LOCKED' : 'AVAILABLE'}
                </div>
             </div>
             
             {/* HUD UI Elements */}
             <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-red-600/50"></div>
             <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-red-600/50"></div>
             <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-red-600/50"></div>
             <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-red-600/50"></div>
          </div>

          {/* BACK OF CARD */}
          <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-zinc-900 border-2 border-red-800/60 rounded-xl p-5 flex flex-col text-slate-300 overflow-hidden shadow-[0_0_25px_rgba(220,38,38,0.2)]">
             <div className="relative z-20 flex flex-col h-full">
               <div className="flex justify-between items-start mb-4">
                 <span className="text-red-400 text-[10px] font-bold font-mono border border-red-400/30 px-2 py-0.5 rounded-sm bg-red-950/30">
                   {challenge.points} XP
                 </span>
                 <span className="text-zinc-400 text-[10px] font-mono tracking-widest uppercase">
                   {challenge.day}
                 </span>
               </div>
               
               <h3 className="text-white font-heading font-bold text-lg leading-tight mb-2 uppercase tracking-wide shrink-0">
                  {challenge.title}
               </h3>
               
               <p className="text-xs font-mono text-slate-400 flex-grow leading-relaxed line-clamp-4">
                  {challenge.description}
               </p>
               
               <div className="mt-auto text-center border-t border-red-900/30 pt-3">
                 {canUpload && (
                   <span className="text-red-500 font-mono text-[10px] font-bold animate-pulse uppercase tracking-widest">
                     {challenge.requiresUpload ? '>>> CLICK TO ACCEPT <<<' : '>>> INITIATE REFERRAL <<<'}
                   </span>
                 )}
                 {isLocked && <span className="text-zinc-500 font-mono text-[10px] font-bold tracking-widest uppercase">{">>> MAX ATTEMPTS REACHED <<<"}</span>}
                 {localSubmission.status === 'pending' && <span className="text-amber-500 font-mono text-[10px] font-bold tracking-widest uppercase animate-pulse">{">>> VERIFYING DATA ... <<<"}</span>}
                 {localSubmission.status === 'accepted' && <span className="text-emerald-500 font-mono text-[10px] font-bold tracking-widest uppercase">{">>> MISSION SUCCESS <<<"}</span>}
               </div>

               {localSubmission.status === 'rejected' && !isLocked && (
                 <div className="absolute inset-x-0 bottom-8 bg-red-950/90 text-[10px] font-mono text-red-400 text-center py-1 border border-red-900/50 rounded pointer-events-none">
                    PREVIOUS ATTEMPT FAILED. RE-ENGAGE.
                 </div>
               )}
             </div>
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-zinc-900/0 to-zinc-900/0 pointer-events-none"></div>
          </div>
        </div>
      </div>

      {/* MISSION BRIEFING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
           <div className="bg-zinc-950 border border-red-600/50 shadow-[0_0_40px_rgba(220,38,38,0.3)] w-full max-w-lg rounded-none relative p-8 scanlines text-slate-200" onClick={e => e.stopPropagation()}>
               {/* HUD Corners */}
               <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-red-500"></div>
               <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-red-500"></div>
               <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-red-500"></div>
               <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-red-500"></div>
               
               <button className="absolute top-3 right-4 text-red-500 font-mono text-xl hover:text-white transition-colors z-20" onClick={() => setIsModalOpen(false)}>
                 [X]
               </button>

               <div className="mb-8 border-b border-red-900/50 pb-5 relative z-20">
                 <h2 className="text-red-500 font-heading font-black tracking-widest uppercase text-[10px] mb-2 opacity-80">Mission Briefing // SECURE LINE</h2>
                 <h3 className="text-2xl font-bold text-white uppercase tracking-wider">{challenge.title}</h3>
                 <p className="mt-4 font-mono text-sm leading-relaxed text-slate-400">
                   {challenge.description}
                 </p>
                 {localSubmission.ai_reason && localSubmission.status === 'rejected' && (
                    <div className="mt-4 p-2 bg-red-950/50 border border-red-900/50 text-red-400 font-mono text-xs">
                      <span className="font-bold text-red-500">AI FEEDBACK:</span> {localSubmission.ai_reason}
                    </div>
                 )}
               </div>

               <div className="relative z-20">
                 {!missionAccepted ? (
                    <button 
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-heading font-black tracking-[0.2em] text-lg uppercase py-4 border-2 border-red-400/50 shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.02]"
                      onClick={() => setMissionAccepted(true)}
                    >
                      ACCEPT MISSION
                    </button>
                 ) : (
                    <div className="space-y-6 animate-[fadeSlideUp_0.3s_ease-out]">
                       <input
                          ref={fileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          className="hidden"
                          onChange={handleFileSelect}
                       />
                       <div 
                         className={`relative w-full h-48 border-2 border-dashed ${uploading ? 'border-red-500' : 'border-zinc-700 hover:border-red-500'} bg-black/50 flex flex-col items-center justify-center cursor-pointer transition-colors group`}
                         onClick={() => { if (!uploading) fileRef.current?.click(); }}
                       >
                         {previewUrl ? (
                            <img src={previewUrl} alt="Proof" className="absolute inset-0 w-full h-full object-contain bg-black/40 opacity-80" />
                         ) : (
                            <>
                               <div className="text-3xl text-red-500 mb-3 group-hover:scale-110 transition-transform tracking-tighter">⚠️</div>
                               <div className="font-mono text-red-500 tracking-widest text-sm font-bold uppercase">DROP PROOF HERE</div>
                               <div className="font-mono text-zinc-500 text-[10px] mt-2 uppercase tracking-widest text-center px-4">OR CLICK TO BROWSE<br/>(PNG / JPG · MAX 10MB)</div>
                            </>
                         )}
                         {uploading && <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center font-mono text-white text-sm tracking-widest backdrop-blur-sm"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3"></div>UPLOADING_DATA...</div>}
                       </div>

                       {error && (
                         <div className="text-red-500 text-xs font-mono font-bold text-center border border-red-900/50 bg-red-950/30 py-2">
                           {error}
                         </div>
                       )}

                       {previewUrl && (
                         <button
                           className={`w-full py-4 font-heading font-black tracking-[0.2em] text-lg uppercase transition-all ${
                             uploadSuccess 
                               ? 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.6)] glitch-flash' 
                               : 'bg-zinc-800 hover:bg-zinc-700 text-white border-2 border-zinc-600'
                           }`}
                           onClick={handleSubmitProof}
                           disabled={uploading || uploadSuccess}
                         >
                           {uploadSuccess ? '>>> PROOF SECURED <<<' : 'SUBMIT PROOF'}
                         </button>
                       )}
                    </div>
                 )}
               </div>
           </div>
        </div>
      )}
    </>
  );
}
