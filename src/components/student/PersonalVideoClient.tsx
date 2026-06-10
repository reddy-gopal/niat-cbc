"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Upload,
  CheckCircle2,
  User,
  Users,
  Camera,
  RefreshCw,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useToast } from "../ui/Toast";
import { StudentAppShell } from "./StudentAppShell";
import { studentMainTopPaddingClass } from "./StudentNavbar";
import BootcampReelGenerator from "./BootcampReelGenerator";
import type { PersonalizationCopy, PersonalizationPhotos, PhotoKey } from "@/lib/personal-video/personalization";

interface Props {
  session: { fullName?: string; studentId?: string };
  initialPhotos: PersonalizationPhotos;
  copy: PersonalizationCopy;
  isMockData?: boolean;
}

const UPLOAD_SLOTS: {
  key: PhotoKey;
  label: string;
  hint: string;
  icon: typeof User;
}[] = [
  {
    key: "photo1",
    label: "Portrait",
    hint: "Screen 3 — your hero shot",
    icon: User,
  },
  {
    key: "photo2",
    label: "Tribe",
    hint: "Screen 7 — your tribe moment",
    icon: Users,
  },
  {
    key: "photo3",
    label: "Moment",
    hint: "Screen 10 — a bootcamp highlight",
    icon: Camera,
  },
];

export default function PersonalVideoClient({
  session,
  initialPhotos,
  copy,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [photos, setPhotos] = useState<PersonalizationPhotos>(initialPhotos);

  useEffect(() => {
    fetch("/api/video-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "visit" }) }).catch(() => {});
  }, []);
  const [uploadingSlot, setUploadingSlot] = useState<PhotoKey | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showReel, setShowReel] = useState(false);

  const firstName = session.fullName?.split(" ")[0] ?? "Student";
  const allPhotosUploaded = Boolean(photos.photo1 && photos.photo2 && photos.photo3);

  const runProcessingSimulation = async () => {
    setIsProcessing(true);
    setLogs([]);
    const steps = [
      "Initializing frame compositor v1.0…",
      "Loading 12 bootcamp frames (1080×1920)…",
      "Injecting portrait into Screen 3…",
      "Injecting tribe photo into Screen 7…",
      "Injecting moment into Screen 10…",
      "Applying personalized copy to Screens 6, 9, 11, 12…",
      "Building 30s cinematic slideshow…",
      "Ready!",
    ];

    for (let i = 0; i < steps.length; i++) {
      setLogs((prev) => [...prev, steps[i]]);
      await new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180));
    }

    setIsProcessing(false);
    setShowReel(true);
  };

  const handleUpload = async (slot: PhotoKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file.", "error");
      return;
    }

    setUploadingSlot(slot);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("slot", slot);

    try {
      const res = await fetch("/api/submissions/upload-personal", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        fetch("/api/video-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "photo_upload" }) }).catch(() => {});
        showToast(`${UPLOAD_SLOTS.find((s) => s.key === slot)?.label} uploaded!`, "success");
        const reader = new FileReader();
        reader.onload = (ev) => {
          const url = ev.target?.result as string;
          setPhotos((prev) => {
            const next = { ...prev, [slot]: url };
            if (next.photo1 && next.photo2 && next.photo3 && !showReel) {
              runProcessingSimulation();
            }
            return next;
          });
        };
        reader.readAsDataURL(file);
        router.refresh();
      } else {
        showToast(data.error || "Upload failed.", "error");
      }
    } catch {
      showToast("An error occurred during upload.", "error");
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleGenerateReel = useCallback(() => {
    if (!allPhotosUploaded) {
      showToast("Upload all 3 photos first.", "error");
      return;
    }
    runProcessingSimulation();
  }, [allPhotosUploaded, showToast]);

  return (
    <StudentAppShell firstName={firstName}>
      <main className="min-h-screen bg-[#050810] text-white pb-20">
        <div className={`mx-auto max-w-4xl px-4 ${studentMainTopPaddingClass}`}>
          <header className="mb-12 text-center pt-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-6"
            >
              <Sparkles className="w-3 h-3" /> Cinematic Personalization
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-heading font-black mb-6 tracking-tighter"
            >
              See Yourself in{" "}
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent italic">
                Action
              </span>
            </motion.h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto font-medium">
              Upload three photos to star in your personalized NIAT Bootcamp 2026 reel —
              30 seconds, ready to share.
            </p>
          </header>

          {isProcessing ? (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto bg-slate-900/50 backdrop-blur-3xl border border-white/5 rounded-[40px] p-10 shadow-2xl font-mono text-sm overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                <motion.div
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5, ease: "linear" }}
                />
              </div>
              <div className="space-y-3 h-72 overflow-y-auto flex flex-col-reverse">
                <div className="flex flex-col gap-3">
                  {logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-4 items-start"
                    >
                      <span className="text-white/20 shrink-0 font-bold">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={
                          log === "Ready!" ? "text-yellow-400 font-black" : "text-slate-300"
                        }
                      >
                        {log}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="mt-10 flex items-center justify-center gap-4 text-yellow-500 font-bold italic uppercase tracking-widest text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Composing frames…</span>
              </div>
            </motion.div>
          ) : showReel && allPhotosUploaded ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
              <BootcampReelGenerator copy={copy} photos={photos} />
              <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {UPLOAD_SLOTS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 font-bold uppercase text-[10px] tracking-widest cursor-pointer border border-white/10"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {label}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleUpload(key, e)}
                      disabled={uploadingSlot === key}
                    />
                    {photos[key] && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                  </label>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="grid sm:grid-cols-3 gap-6">
                {UPLOAD_SLOTS.map(({ key, label, hint, icon: Icon }) => (
                  <div
                    key={key}
                    className="bg-slate-900/50 backdrop-blur-2xl border border-white/5 rounded-[32px] p-6 text-center relative overflow-hidden group hover:border-yellow-500/30 transition-all"
                  >
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                      {photos[key] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photos[key]!}
                          alt={label}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <Icon className="w-7 h-7 text-slate-500" />
                      )}
                    </div>
                    <h3 className="text-lg font-black mb-1">{label}</h3>
                    <p className="text-slate-500 text-xs mb-4">{hint}</p>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-yellow-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                      {uploadingSlot === key ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      {photos[key] ? "Replace" : "Upload"}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleUpload(key, e)}
                        disabled={uploadingSlot !== null}
                      />
                    </label>
                    {photos[key] && (
                      <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-green-400" />
                    )}
                  </div>
                ))}
              </div>

              {allPhotosUploaded && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleGenerateReel}
                    className="px-12 py-5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl text-black font-black uppercase tracking-widest text-xs shadow-xl shadow-yellow-500/20 hover:scale-105 transition-transform"
                  >
                    Generate My Reel
                  </button>
                </div>
              )}

              {!allPhotosUploaded && (
                <p className="text-center text-slate-500 text-sm">
                  {[
                    photos.photo1,
                    photos.photo2,
                    photos.photo3,
                  ].filter(Boolean).length}
                  /3 photos uploaded
                </p>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </StudentAppShell>
  );
}
