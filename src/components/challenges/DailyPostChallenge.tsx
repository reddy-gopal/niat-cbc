"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import UploadZone from "./UploadZone";
import type { StudentChallengeStatus } from "@/types/database";
import { isDailyPostAcceptedToday } from "@/lib/daily-post";
import { fetchApiJson } from "@/lib/fetch-api-error";
import {
  INSTAGRAM_PROFILE_URL_EXAMPLE,
  normalizeInstagramHandleInput,
  parseInstagramProfileInput,
} from "@/lib/instagram-handle";

type DailyPostChallengeProps = {
  status: StudentChallengeStatus | null;
  instagramHandle: string | null;
  onInstagramHandleSaved: (handle: string) => void;
  onSuccess: (payload: { taskId: number; submissionId?: string }) => void;
  stoneColor: string;
};

export default function DailyPostChallenge({
  status,
  instagramHandle,
  onInstagramHandleSaved,
  onSuccess,
  stoneColor,
}: DailyPostChallengeProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "received">("idle");
  const [error, setError] = useState<string | null>(null);

  const [savedHandle, setSavedHandle] = useState<string | null>(
    instagramHandle?.trim() ? instagramHandle.trim().toLowerCase() : null
  );
  const [inputValue, setInputValue] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const TASK_ID = 6;
  const stoneDeep = `color-mix(in srgb, ${stoneColor} 55%, black)`;
  const stoneGlow = `color-mix(in srgb, ${stoneColor} 45%, transparent)`;
  const stoneSoft = `color-mix(in srgb, ${stoneColor} 18%, white)`;
  const stoneBorder = `color-mix(in srgb, ${stoneColor} 82%, white)`;

  const acceptedToday = useMemo(() => isDailyPostAcceptedToday(status), [status]);

  useEffect(() => {
    const next = instagramHandle?.trim() ? instagramHandle.trim().toLowerCase() : null;
    setSavedHandle(next);
  }, [instagramHandle]);

  const hasProfile = Boolean(savedHandle);
  const canShowUpload = hasProfile;

  const handleSaveInstagram = async () => {
    const parsed = parseInstagramProfileInput(inputValue);
    setSaveError(null);

    if (!parsed.ok) {
      setSaveError(parsed.error);
      return;
    }

    setSaveLoading(true);
    const result = await fetchApiJson<{
      success?: boolean;
      error?: string;
      data?: { student?: { instagram_handle?: string | null } };
    }>("/api/students/me/instagram-handle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instagram_handle: parsed.username }),
    });

    if (!result.ok) {
      setSaveError(result.message);
    } else {
      const fromApi = result.body.data?.student?.instagram_handle;
      const finalHandle = fromApi
        ? normalizeInstagramHandleInput(fromApi)
        : parsed.username;
      setSavedHandle(finalHandle);
      onInstagramHandleSaved(finalHandle);
      setInputValue("");
    }
    setSaveLoading(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || !canShowUpload) return;

    setUploadState("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    const result = await fetchApiJson<{
      success?: boolean;
      error?: string;
      message?: string;
    }>("/api/submissions/upload-daily", {
      method: "POST",
      body: formData,
    });

    if (!result.ok) {
      setError(result.message);
      setUploadState("idle");
      return;
    }

    setUploadState("received");
    onSuccess({ taskId: TASK_ID });
  };

  return (
    <div className="space-y-4">
      {acceptedToday ? (
        <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50 px-4 py-5 text-center shadow-inner">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-[#065f46] font-heading font-bold text-base">Accepted today!</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-900/90">
            Great job! Come back tomorrow for your next post.
          </p>
        </div>
      ) : (
        <>
          {!hasProfile && (
            <div
              className="rounded-xl border-2 px-3 py-3 space-y-2"
              style={{ borderColor: stoneBorder, background: stoneSoft }}
            >
              <label className="block text-[11px] font-bold text-slate-700" htmlFor="ig-profile-url">
                Instagram profile URL
              </label>
              <input
                id="ig-profile-url"
                type="text"
                inputMode="url"
                autoComplete="url"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={saveLoading}
                placeholder={INSTAGRAM_PROFILE_URL_EXAMPLE}
                className="w-full rounded-lg border-2 px-3 py-2 text-xs sm:text-sm font-medium outline-none focus:ring-2"
                style={{
                  borderColor: stoneBorder,
                  color: stoneDeep,
                  background: "white",
                  caretColor: stoneDeep,
                }}
              />
              {saveError && (
                <p className="text-[11px] font-bold text-red-700 text-center">{saveError}</p>
              )}
              <button
                type="button"
                onClick={() => void handleSaveInstagram()}
                disabled={saveLoading}
                className="w-full px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide text-white disabled:opacity-50"
                style={{ background: stoneDeep, border: `2px solid ${stoneBorder}` }}
              >
                {saveLoading ? "Saving…" : "Save"}
              </button>
            </div>
          )}

          {canShowUpload && (
            <>
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
                  <p className="text-[#065f46] font-heading font-bold text-base">Accepted!</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-900/90">
                    Come back tomorrow for your next post.
                  </p>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleUpload()}
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
            </>
          )}
        </>
      )}
    </div>
  );
}
