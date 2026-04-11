import { motion } from "framer-motion";

export default function RejectToast({
  message,
  onComplete,
}: {
  message: string;
  onComplete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.9 }}
      animate={{ opacity: [0, 1, 1, 0], y: -40, scale: 1 }}
      transition={{ duration: 3.2, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 m-auto w-[min(100%,24rem)] h-fit z-[100] pointer-events-none px-4"
    >
      <div
        className="rounded-xl border-2 border-red-700 bg-red-950/95 px-4 py-3 text-center text-sm font-semibold leading-snug text-red-100 shadow-[0_8px_30px_rgba(127,29,29,0.6)]"
        style={{ fontFamily: "var(--font-body), sans-serif" }}
      >
        {message}
      </div>
    </motion.div>
  );
}
