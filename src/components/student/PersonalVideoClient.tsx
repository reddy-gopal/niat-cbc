"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle2, User, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { useToast } from "../ui/Toast";
import { StudentAppShell } from "./StudentAppShell";
import { studentMainTopPaddingClass } from "./StudentNavbar";
import PersonalVideoRenderer from "./PersonalVideoRenderer";

interface Props {
  session: any;
  initialFileUrl: string | null;
  totalPoints: number;
}

export default function PersonalVideoClient({ session, initialFileUrl, totalPoints }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [fileUrl, setFileUrl] = useState<string | null>(initialFileUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Correctly derive firstName from fullName
  const firstName = session.fullName?.split(" ")[0] ?? "Student";

  const runProcessingSimulation = async (photoUrl: string) => {
    setIsProcessing(true);
    setLogs([]);
    const steps = [
      "Initializing Cinematic Engine v4.0...",
      "Loading source media: bootcamp.mp4",
      "Scanning for placeholder frames...",
      `Matched 3 appearance segments at 0.2s, 23.8s, and 46s.`,
      `Injecting ${firstName}'s profile into stream...`,
      "Applying smooth sliding transitions...",
      "Calibrating motion vectors...",
      "Enhancing cinematic lighting...",
      "Compiling personalized reel...",
      "Ready!"
    ];

    for (let i = 0; i < steps.length; i++) {
      setLogs(prev => [...prev, steps[i]]);
      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
    }
    
    setFileUrl(photoUrl);
    setIsProcessing(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file.", "error");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/submissions/upload-personal", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showToast("Portrait received!", "success");
        const reader = new FileReader();
        reader.onload = (e) => {
          runProcessingSimulation(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        router.refresh();
      } else {
        showToast(data.error || "Upload failed.", "error");
      }
    } catch (err) {
      showToast("An error occurred during upload.", "error");
    } finally {
      setIsUploading(false);
    }
  };

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
              See Yourself in <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent italic">Action</span>
            </motion.h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto font-medium">
              We've created a custom cinematic reel for you. Upload your portrait to claim your spot in the official NIAT Bootcamp 2026 highlights.
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
                  transition={{ duration: 3, ease: "linear" }}
                />
              </div>
              
              <div className="flex items-center justify-between mb-8">
                 <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                 </div>
                 <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Process Terminal v4.2</span>
              </div>

              <div className="space-y-3 h-72 overflow-y-auto scrollbar-hide flex flex-col-reverse">
                <div className="flex flex-col gap-3">
                  {logs.map((log, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-4 items-start"
                    >
                      <span className="text-white/20 shrink-0 font-bold tracking-tighter">0{i+1}</span>
                      <span className={log === "Ready!" ? "text-yellow-400 font-black" : "text-slate-300"}>
                        {log}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <div className="mt-10 flex items-center justify-center gap-4 text-yellow-500 font-bold italic uppercase tracking-widest text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Injecting Frames...</span>
              </div>
            </motion.div>
          ) : !fileUrl ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-slate-900/50 backdrop-blur-2xl border border-white/5 rounded-[40px] p-12 text-center relative overflow-hidden group hover:border-yellow-500/30 transition-all duration-700">
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700 border border-white/10">
                    <User className="w-10 h-10 text-slate-500 group-hover:text-yellow-400" />
                  </div>
                  
                  <h3 className="text-2xl font-black mb-3">Claim Your Fame</h3>
                  <p className="text-slate-500 mb-10 text-sm font-medium">
                    Upload a high-quality portrait. For best results, use a vertical photo with good lighting.
                  </p>

                  <label className="cursor-pointer inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 rounded-2xl text-black font-black uppercase tracking-widest text-xs shadow-2xl shadow-yellow-500/20 transition-all hover:scale-105 active:scale-95">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {isUploading ? "Uploading..." : "Select Portrait"}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <PersonalVideoRenderer 
                fileUrl={fileUrl} 
                firstName={firstName} 
                totalPoints={totalPoints}
              />
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <label className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center gap-3 font-black uppercase text-[10px] tracking-widest cursor-pointer transition-all border border-white/10 group">
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  Change Photo
                  <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                </label>

                <div className="flex items-center gap-3 text-green-400 font-black px-6 py-4 bg-green-400/5 rounded-2xl border border-green-400/10 text-[10px] uppercase tracking-widest">
                  <CheckCircle2 className="w-4 h-4" />
                  Portrait Verified
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </main>
    </StudentAppShell>
  );
}
