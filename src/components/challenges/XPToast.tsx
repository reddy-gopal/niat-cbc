import { motion } from "framer-motion";

export default function XPToast({ points, onComplete }: { points: number, onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.8 }}
      animate={{ opacity: [0, 1, 1, 0], y: -60, scale: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 m-auto w-fit h-fit z-[100] text-[#f7b801] font-black pointer-events-none drop-shadow-[0_0_10px_#f7b801] text-4xl sm:text-6xl px-4 text-center"
      style={{ WebkitTextStroke: "1.5px #991b1b", textShadow: "0px 4px 10px rgba(153,27,27,0.8)" }}
    >
      +{points} Points
    </motion.div>
  );
}
