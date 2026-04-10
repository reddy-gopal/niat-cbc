import { motion } from "framer-motion";

export default function ProgressHeader({ completed, total }: { completed: number; total: number }) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  return (
    <div className="w-full mb-10 max-w-lg mx-auto">
      <div className="text-center text-[#991b1b] font-black text-xl mb-3 tracking-[0.2em] uppercase">
        {completed} OF {total} MISSIONS COMPLETED
      </div>
      <div className="w-full h-5 bg-[#ffffff] rounded-full overflow-hidden shadow-[inset_0_4px_6px_rgba(153,27,27,0.2)] border-2 border-[#991b1b]">
        <motion.div 
          className="h-full bg-[#f7b801] shadow-[inset_0_0_10px_#f18701]"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
