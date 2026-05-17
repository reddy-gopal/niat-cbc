"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RefreshCw, Download, Sparkles, Trophy, Star, Loader2 } from "lucide-react";

interface Props {
  fileUrl: string;
  firstName: string;
  totalPoints: number;
}

const SEGMENTS = {
  seg1: { start: 0.2, end: 4.5, label: "Hero Intro" },
  seg2: { start: 23.8, end: 25.5, label: "Mid Highlight" },
  seg3: { start: 46.0, end: 48.7, label: "Closing Finale" }
};

export default function PersonalVideoRenderer({ fileUrl, firstName, totalPoints }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSegKey, setActiveSegKey] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  
  const userImage = useMemo(() => {
    if (typeof window === "undefined") return null;
    const img = new Image();
    img.src = fileUrl;
    img.crossOrigin = "anonymous";
    return img;
  }, [fileUrl]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrame: number;

    const render = () => {
      setIsPlaying(!video.paused && !video.ended);
      setCurrentTime(video.currentTime);
      
      const time = video.currentTime;
      let currentSegKey: string | null = null;

      if (time >= SEGMENTS.seg1.start && time <= SEGMENTS.seg1.end) currentSegKey = "seg1";
      else if (time >= SEGMENTS.seg2.start && time <= SEGMENTS.seg2.end) currentSegKey = "seg2";
      else if (time >= SEGMENTS.seg3.start && time <= SEGMENTS.seg3.end) currentSegKey = "seg3";

      setActiveSegKey(currentSegKey);

      if (currentSegKey && userImage && userImage.complete) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.filter = "blur(60px) brightness(0.3) saturate(1.2)";
        ctx.globalAlpha = 0.5;
        ctx.drawImage(userImage, -200, -200, canvas.width + 400, canvas.height + 400);
        ctx.restore();
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      animationFrame = requestAnimationFrame(render);
    };

    const handleCanPlay = () => setIsVideoLoaded(true);
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        if (duration > 0) {
          setLoadProgress((bufferedEnd / duration) * 100);
        }
      }
    };

    // Check if already loaded
    if (video.readyState >= 3) setIsVideoLoaded(true);

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("progress", handleProgress);

    render();
    return () => {
      cancelAnimationFrame(animationFrame);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("progress", handleProgress);
    };
  }, [userImage]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
    }
  };

  const recordAndDownload = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || isRecording) return;

    setIsRecording(true);
    video.currentTime = 0;
    video.muted = false; // Capture audio
    
    const stream = canvas.captureStream(30);
    
    // Attempt to capture audio from video element
    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(video);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    source.connect(audioContext.destination);
    
    const combinedStream = new MediaStream([
      ...stream.getVideoTracks(),
      ...destination.stream.getAudioTracks()
    ]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: "video/webm;codecs=vp9" });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NIAT_Bootcamp_${firstName}.webm`;
      a.click();
      setIsRecording(false);
      video.muted = true;
    };

    recorder.start();
    video.loop = false; // Ensure it doesn't loop during recording
    video.play();

    video.onended = () => {
      recorder.stop();
      video.onended = null;
      if (videoRef.current) videoRef.current.loop = true; // Restore loop for preview
    };
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <div className="relative aspect-[9/16] max-w-[400px] w-full mx-auto rounded-[40px] overflow-hidden shadow-2xl shadow-black/50 border-[12px] border-slate-800 bg-[#050810] group">
        <video 
          ref={videoRef} 
          src="/bootcamp.mp4" 
          className="hidden" 
          playsInline 
          muted 
          preload="auto"
        />
        
        <canvas 
          ref={canvasRef}
          width={1080}
          height={1920}
          className="w-full h-full object-cover cursor-pointer"
          onClick={togglePlay}
        />

        {/* LOADING STATE */}
        <AnimatePresence>
          {!isVideoLoaded && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-[#050810] flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="relative w-20 h-20 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                <motion.div 
                  className="absolute inset-0 rounded-full border-4 border-yellow-500 border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-yellow-500" />
              </div>
              
              <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">Buffering Cinematic</h3>
              <p className="text-slate-500 text-xs font-medium mb-6 uppercase tracking-widest">Pre-loading high quality assets</p>
              
              <div className="w-full max-w-[140px] h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-yellow-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadProgress}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {activeSegKey && (
            <motion.div 
              key="photo-hijack"
              initial={{ opacity: 0, scale: 1.1, x: 100 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -100 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none"
            >
               <div className="relative w-full aspect-[4/5] rounded-[40px] overflow-hidden border-[10px] border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                  <img src={fileUrl} className="w-full h-full object-cover" alt="User Hero" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PERSONALIZED TEXT OVERLAYS */}
        <AnimatePresence>
          {activeSegKey === "seg1" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex flex-col items-center justify-end pb-32 pointer-events-none px-8"
            >
              <div className="bg-yellow-500 text-black px-6 py-2 rounded-full font-black uppercase tracking-[0.3em] text-[10px] mb-4 shadow-xl">
                NIAT HERO 2026
              </div>
              <h2 className="text-4xl font-heading font-black text-white text-center drop-shadow-2xl uppercase italic">
                {firstName}
              </h2>
            </motion.div>
          )}

          {activeSegKey === "seg2" && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute inset-0 flex flex-col items-center justify-end pb-32 pointer-events-none px-8 text-center"
            >
              <Sparkles className="text-yellow-400 w-10 h-10 mb-4 animate-pulse" />
              <h2 className="text-3xl font-heading font-black text-white mb-2 uppercase italic tracking-tighter">
                Game Changer
              </h2>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-2 rounded-2xl">
                 <span className="text-yellow-400 font-bold">72 HRS</span>
                 <span className="text-white/70 text-xs ml-2 font-medium">Of Hard Work</span>
              </div>
            </motion.div>
          )}

          {activeSegKey === "seg3" && (
            <motion.div 
              initial={{ opacity: 0, rotate: -10 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute inset-0 flex flex-col items-center justify-end pb-32 pointer-events-none px-8 text-center"
            >
              <Trophy className="text-yellow-500 w-12 h-12 mb-6 drop-shadow-lg" />
              <h2 className="text-xl font-heading font-black text-white mb-1 uppercase tracking-widest">
                Mission Score
              </h2>
              <div className="text-6xl font-heading font-black text-yellow-500">
                {totalPoints}
              </div>
              <div className="mt-4 flex items-center gap-2 text-white/50 text-[10px] font-bold uppercase tracking-widest">
                <Star className="w-3 h-3 fill-current" />
                NIAT CHAMPION
                <Star className="w-3 h-3 fill-current" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/Pause Button */}
        {!isPlaying && !isRecording && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
            <button onClick={togglePlay} className="w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center text-black pointer-events-auto hover:scale-110 transition-transform shadow-2xl">
              <Play className="w-8 h-8 fill-current ml-1" />
            </button>
          </div>
        )}

        {/* Recording Overlay */}
        {isRecording && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center z-50 backdrop-blur-md">
            <div className="relative w-24 h-24 mb-8">
              <Loader2 className="w-full h-full text-yellow-500 animate-spin opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center font-black text-yellow-500 text-xs">
                {Math.round(Math.min((currentTime / 48.7) * 100, 100))}%
              </div>
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">Generating Your Reel</h3>
            <p className="text-slate-400 text-sm max-w-[200px] mx-auto leading-relaxed mb-8">Capturing personalized frames in HD. Please wait...</p>
            
            <div className="w-full max-w-[200px] h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-yellow-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((currentTime / 48.7) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
          <motion.div className="h-full bg-yellow-500" style={{ width: `${(currentTime / 48.7) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button 
          onClick={() => { if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); } }}
          className="px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 flex items-center gap-3 font-black uppercase text-xs tracking-widest transition-all border border-slate-700"
        >
          <RefreshCw className="w-4 h-4" /> Replay
        </button>
        <button 
          onClick={recordAndDownload}
          disabled={isRecording}
          className="px-10 py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 flex items-center gap-3 font-black uppercase text-xs tracking-widest text-black shadow-xl shadow-yellow-500/20 transition-all hover:scale-105 disabled:opacity-50"
        >
          {isRecording ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
          {isRecording ? "Generating..." : "Download Personalized HD"}
        </button>
      </div>
    </div>
  );
}
