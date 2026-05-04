"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import UploadZone from "./UploadZone";
import type { Submission } from "@/types/database";

type DailyPostChallengeProps = {
  submissions: Submission[];
  onSuccess: (payload: { taskId: number; submissionId?: string }) => void;
  stoneColor: string;
};

export default function DailyPostChallenge({
  submissions,
  onSuccess,
  stoneColor,
}: DailyPostChallengeProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "received">("idle");
  const [error, setError] = useState<string | null>(null);

  const TASK_ID = 6;
  const stoneDeep = `color-mix(in srgb, ${stoneColor} 55%, black)`;
  const stoneGlow = `color-mix(in srgb, ${stoneColor} 45%, transparent)`;
  const stoneSoft = `color-mix(in srgb, ${stoneColor} 18%, white)`;
  const stoneBorder = `color-mix(in srgb, ${stoneColor} 82%, white)`;

  const latestSubmission = useMemo(() => {
    return submissions
      .filter((s) => s.task_id === TASK_ID)
      .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())[0];
  }, [submissions]);

  const isAcceptedToday = useMemo(() => {
    if (!latestSubmission || latestSubmission.status !== "accepted" || !latestSubmission.verified_at) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(latestSubmission.verified_at).getTime() >= startOfToday.getTime();
  }, [latestSubmission]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/submissions/upload-daily", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error || "Upload failed.");
        setUploadState("idle");
        return;
      }

      setUploadState("received");
      onSuccess({ taskId: TASK_ID, submissionId: latestSubmission?.id });
    } catch (err) {
      setError("Network error. Please try again.");
      setUploadState("idle");
    }
  };

  if (isAcceptedToday) {
    return (
      <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50 px-4 py-5 text-center shadow-inner">
        <div className="text-2xl mb-2">✅</div>
        <p className="text-[#065f46] font-heading font-bold text-base">
          Accepted Today!
        </p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-900/90">
          Come back tomorrow for your next post.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <UploadZone
        onFileSelect={(f) => {
          setSelectedFile(f);
          if (preview) URL.revokeObjectURL(preview);
          setPreview(URL.createObjectURL(f));
          setError(null);
        }}
        preview={preview}
        disabled={uploadState === "uploading"}
      />

      {error && (
        <div className="text-[#ffffff] bg-[#991b1b] text-xs font-bold text-center px-4 py-3 rounded-lg border border-[#f7b801]">
          {error}
        </div>
      )}

      {uploadState === "received" ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-emerald-600 bg-emerald-50 px-4 py-5 text-center shadow-inner"
        >
          <div className="text-2xl mb-2">✅</div>
          <p className="text-[#065f46] font-heading font-bold text-base">
            Accepted!
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-900/90">
            Come back tomorrow for your next post.
          </p>
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploadState === "uploading"}
          className="w-full border-[3px] text-white font-black tracking-[0.08em] text-xs sm:text-sm md:text-base py-2.5 sm:py-3.5 rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
          style={{
            background: stoneDeep,
            borderColor: stoneBorder,
            boxShadow: `0 4px 15px ${stoneGlow}`,
          }}
        >
          {uploadState === "uploading" ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#f7b801] border-t-transparent" />
              <span>VERIFYING...</span>
            </>
          ) : (
            "SUBMIT DAILY POST"
          )}
        </button>
      )}

      <p className="text-[10px] text-center opacity-70 font-medium italic">
        Upload a screenshot of your Instagram post tagging #niatbootcamp2026
      </p>
    </div>
  );
}
