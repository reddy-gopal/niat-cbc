"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Trophy, Star, Share2, Award, Download } from "lucide-react";
import confetti from "canvas-confetti";

type GrandFinaleProps = {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
};

export default function GrandFinale({ isOpen, onClose, studentName }: GrandFinaleProps) {
  const [phase, setPhase] = useState<"celebration" | "reveal">("celebration");
  
  useEffect(() => {
    if (isOpen) {
      // Fire confetti multiple times for the "Cinematic" start
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      // Sound effect (Try-catch to prevent browser block issues)
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3"); // Achievement sound
        audio.volume = 0.4;
        audio.play();
      } catch (e) { console.error("Audio blocked", e); }

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Cinematic Backdrop */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="absolute inset-0 bg-black/95 backdrop-blur-xl"
        >
            {/* Ambient Animated Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                <div className="absolute top-0 left-1/4 w-[30rem] h-[30rem] bg-[#f7b801]/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-[#991b1b]/20 rounded-full blur-[100px] animate-pulse delay-1000" />
            </div>
        </motion.div>

        {/* Content Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative w-full max-w-2xl bg-[#141414] border-2 border-[#f7b801]/30 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(247,184,1,0.3)]"
        >
          {/* Header Badge */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30">
             <motion.div 
               animate={{ y: [0, -5, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="bg-[#f7b801] text-[#991b1b] px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-2xl border-4 border-black"
             >
                <Award size={16} /> 2026 CBC LEGEND
             </motion.div>
          </div>

          {/* Epic Main Visual */}
          <div className="relative aspect-video overflow-hidden group">
             <motion.div 
               className="absolute inset-0 z-10 bg-gradient-to-t from-[#141414] via-transparent to-transparent opacity-80"
             />
             <motion.img 
                src="/api/story-image" 
                alt="The Story"
                className="w-full h-full object-cover grayscale-[0.2] transition-transform duration-[10s] ease-linear group-hover:scale-110"
                style={{ filter: "brightness(0.7) contrast(1.2)" }}
             />
             <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none z-20" />
          </div>

          {/* Narrative Content */}
          <div className="p-8 sm:p-12 text-center -mt-10 relative z-30">
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
             >
                <h2 className="font-heading font-black text-4xl sm:text-5xl text-white mb-4 italic tracking-tighter">
                   MISSION <span className="text-[#f7b801]">ACCOMPLISHED</span>
                </h2>
                <div className="h-1 w-24 bg-[#f7b801] mx-auto mb-8 rounded-full" />
                
                <p className="text-gray-400 text-lg leading-relaxed max-w-lg mx-auto mb-10 font-medium italic">
                   "You found the common ground, shared the real voice, and built the bond. {studentName}, you are no longer just a participant — you are a <span className="text-white font-black uppercase underline decoration-[#f7b801] decoration-4">Tribe Legacy</span>."
                </p>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                    <button 
                      className="bg-[#f7b801] text-[#991b1b] font-black h-14 rounded-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#f7b801]/20"
                      onClick={() => window.print()} // Mock download for now
                    >
                       <Download size={20} /> SAVE YOUR LEGACY
                    </button>
                    <button 
                      className="bg-white/5 border border-white/10 text-white font-black h-14 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all font-body uppercase text-sm tracking-widest"
                      onClick={onClose}
                    >
                       CONTINUE
                    </button>
                </div>
             </motion.div>
          </div>

          {/* Decorative Corner Stars */}
          <div className="absolute bottom-4 left-6 text-[#f7b801]/20"><Star size={32} /></div>
          <div className="absolute top-4 right-6 text-[#f7b801]/20"><Trophy size={32} /></div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
