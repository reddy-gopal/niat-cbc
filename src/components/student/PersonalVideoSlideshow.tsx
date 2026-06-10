"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Download, Loader2, RefreshCw } from "lucide-react";
import { Outfit } from "next/font/google";
import {
  CROSSFADE_MS,
  FRAME_DURATION_MS,
  FRAME_HEIGHT,
  FRAME_ORDER,
  FRAME_WIDTH,
} from "@/lib/personal-video/frameManifest";
import { composeAllFrames } from "@/lib/personal-video/composeFrame";
import type { PersonalizationCopy, PersonalizationPhotos } from "@/lib/personal-video/personalization";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "700"] });

interface Props {
  copy: PersonalizationCopy;
  photos: PersonalizationPhotos;
  isMockData?: boolean;
  firstName: string;
}

export default function PersonalVideoSlideshow({
  copy,
  photos,
  isMockData = true,
  firstName,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapsRef = useRef<ImageBitmap[]>([]);
  const frameIndexRef = useRef(0);
  const frameStartRef = useRef(0);
  const rafRef = useRef<number>(0);
  const playingRef = useRef(false);

  const [isComposing, setIsComposing] = useState(true);
  const [composeProgress, setComposeProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const totalDurationMs = FRAME_ORDER.length * FRAME_DURATION_MS;

  const compose = useCallback(async () => {
    setIsComposing(true);
    setComposeProgress(0);
    bitmapsRef.current.forEach((b) => b.close());
    bitmapsRef.current = [];

    const canvases = await composeAllFrames(copy, photos, FRAME_ORDER, (done, total) => {
      setComposeProgress(Math.round((done / total) * 100));
    });

    bitmapsRef.current = await Promise.all(canvases.map((c) => createImageBitmap(c)));
    setIsComposing(false);
    setIsReady(bitmapsRef.current.length > 0);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx && bitmapsRef.current[0]) {
      ctx.drawImage(bitmapsRef.current[0], 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    }
  }, [copy, photos]);

  useEffect(() => {
    compose();
    return () => {
      cancelAnimationFrame(rafRef.current);
      bitmapsRef.current.forEach((b) => b.close());
    };
  }, [compose]);

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, index: number, alpha: number) => {
      const bitmap = bitmapsRef.current[index];
      if (!bitmap) return;
      ctx.globalAlpha = alpha;
      ctx.drawImage(bitmap, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      ctx.globalAlpha = 1;
    },
    []
  );

  const tick = useCallback(
    (now: number) => {
      const bitmaps = bitmapsRef.current;
      if (!bitmaps.length || !playingRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      if (!frameStartRef.current) frameStartRef.current = now;
      const elapsed = now - frameStartRef.current;
      const frameDuration = FRAME_DURATION_MS;
      const idx = Math.floor(elapsed / frameDuration) % FRAME_ORDER.length;
      const frameElapsed = elapsed % frameDuration;
      const crossfadeStart = frameDuration - CROSSFADE_MS;

      frameIndexRef.current = idx;
      setCurrentFrame(idx);

      ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

      if (frameElapsed >= crossfadeStart && CROSSFADE_MS > 0) {
        const t = (frameElapsed - crossfadeStart) / CROSSFADE_MS;
        const nextIdx = (idx + 1) % FRAME_ORDER.length;
        drawFrame(ctx, idx, 1 - t);
        drawFrame(ctx, nextIdx, t);
      } else {
        drawFrame(ctx, idx, 1);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [drawFrame]
  );

  const startPlayback = useCallback(() => {
    if (!bitmapsRef.current.length) return;
    playingRef.current = true;
    setIsPlaying(true);
    frameStartRef.current = 0;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const togglePlay = () => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  };

  const recordAndDownload = async () => {
    const canvas = canvasRef.current;
    const bitmaps = bitmapsRef.current;
    if (!canvas || !bitmaps.length || isRecording) return;

    stopPlayback();
    setIsRecording(true);
    setRecordProgress(0);

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const done = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start(100);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsRecording(false);
      return;
    }

    const start = performance.now();
    const totalMs = totalDurationMs;

    await new Promise<void>((resolve) => {
      const recordTick = (now: number) => {
        const elapsed = now - start;
        setRecordProgress(Math.min(100, Math.round((elapsed / totalMs) * 100)));

        const idx = Math.min(
          FRAME_ORDER.length - 1,
          Math.floor(elapsed / FRAME_DURATION_MS)
        );
        const frameElapsed = elapsed % FRAME_DURATION_MS;
        const crossfadeStart = FRAME_DURATION_MS - CROSSFADE_MS;

        ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        if (frameElapsed >= crossfadeStart && idx < FRAME_ORDER.length - 1) {
          const t = (frameElapsed - crossfadeStart) / CROSSFADE_MS;
          drawFrame(ctx, idx, 1 - t);
          drawFrame(ctx, idx + 1, t);
        } else {
          drawFrame(ctx, idx, 1);
        }

        if (elapsed < totalMs) {
          requestAnimationFrame(recordTick);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(recordTick);
    });

    recorder.stop();
    await done;

    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NIAT_Bootcamp_${firstName}.webm`;
    a.click();
    URL.revokeObjectURL(url);

    setIsRecording(false);
    setRecordProgress(0);
    drawFrame(ctx, 0, 1);
  };

  return (
    <div className={`flex flex-col items-center gap-8 w-full ${outfit.className}`}>
      {isMockData && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full">
          Preview copy uses sample data — Sheets integration coming soon
        </p>
      )}

      <div className="relative aspect-[9/16] max-w-[400px] w-full mx-auto rounded-[40px] overflow-hidden shadow-2xl shadow-black/50 border-[12px] border-slate-800 bg-[#050810]">
        <canvas
          ref={canvasRef}
          width={FRAME_WIDTH}
          height={FRAME_HEIGHT}
          className="w-full h-full object-cover"
        />

        <AnimatePresence>
          {(isComposing || isRecording) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm"
            >
              <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-6" />
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">
                {isRecording ? "Generating Your Reel" : "Composing Frames"}
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                {isRecording
                  ? "Capturing all 12 frames in HD…"
                  : "Personalizing your bootcamp story…"}
              </p>
              <div className="w-full max-w-[200px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-yellow-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${isRecording ? recordProgress : composeProgress}%`,
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isComposing && !isRecording && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <span className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-black shadow-xl">
              {isPlaying ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </span>
          </button>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-yellow-500 transition-all duration-300"
            style={{
              width: `${((currentFrame + 1) / FRAME_ORDER.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => {
            stopPlayback();
            compose();
          }}
          disabled={isComposing || isRecording}
          className="px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 flex items-center gap-3 font-bold uppercase text-xs tracking-widest transition-all border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" /> Rebuild
        </button>
        <button
          type="button"
          onClick={recordAndDownload}
          disabled={isComposing || isRecording || !isReady}
          className="px-10 py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 flex items-center gap-3 font-bold uppercase text-xs tracking-widest text-black shadow-xl shadow-yellow-500/20 transition-all hover:scale-105 disabled:opacity-50"
        >
          {isRecording ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isRecording ? "Generating…" : "Download Reel"}
        </button>
      </div>
    </div>
  );
}
