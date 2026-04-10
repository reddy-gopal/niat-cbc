import { motion } from "framer-motion";
import type { Challenge } from "@/types/app";

export type BoardStatus = "available" | "locked" | "in_review" | "completed";

export default function ChallengeCard({
  challenge,
  status,
  onOpen,
}: {
  challenge: Challenge;
  status: BoardStatus;
  onOpen: () => void;
}) {
  const isLocked = status === "locked";
  
  const getDifficulty = () => {
    if (challenge.id >= 8) return "LEGENDARY";
    if (challenge.id >= 6) return "HARD";
    if (challenge.id >= 3) return "MEDIUM";
    return "EASY";
  };

  const getStatusShadow = () => {
    if (status === "completed") return "0 0 20px #f7b801, 0 8px 16px rgba(153,27,27,0.4)";
    if (status === "in_review") return "0 0 15px #f18701, 0 8px 16px rgba(153,27,27,0.4)";
    return "0 8px 16px rgba(153,27,27,0.4)"; // Default/Available maroon shadow
  };

  const isFlippedAllowed = !isLocked;

  return (
    <motion.button
      type="button"
      onClick={isLocked ? undefined : onOpen}
      disabled={isLocked}
      initial={{ scale: 1, y: 0, rotateZ: (Math.random() - 0.5) * 4 }}
      whileHover={isLocked ? {} : { y: -12, rotateZ: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group perspective-1000 w-full max-w-[300px] sm:max-w-[280px] aspect-[2/3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 ${
        isLocked ? "cursor-not-allowed" : "cursor-pointer"
      }`}
      style={{
        boxShadow: getStatusShadow(),
        borderRadius: "16px",
      }}
    >
      <div className={`relative w-full h-full preserve-3d transition-transform duration-[600ms] ${isFlippedAllowed ? "group-hover:[transform:rotateY(180deg)]" : ""}`}>
        
        {/* FRONT FACE */}
        <div 
          className="absolute inset-0 backface-hidden bg-[#991b1b] border-[3px] border-[#f7b801] rounded-[16px] overflow-hidden flex flex-col items-center justify-center p-2"
          style={{ filter: isLocked ? 'brightness(0.6) blur(1px)' : 'none' }}
        >
          {/* Top Left Number */}
          <div className="absolute top-3 left-3 text-white font-bold text-base sm:text-lg leading-none">
            {String(challenge.id).padStart(2, '0')}
          </div>
          
          {/* Status Badge Top Right */}
          <div className="absolute top-3 right-3 text-[#f7b801] font-bold text-[9px] sm:text-[10px] uppercase border border-[#f7b801] px-1.5 py-0.5 rounded-sm">
             {status.replace("_", " ")}
          </div>
          
          {/* Bottom Right Upside Down Number */}
          <div className="absolute bottom-3 right-3 text-white font-bold text-base sm:text-lg leading-none rotate-180">
            {String(challenge.id).padStart(2, '0')}
          </div>

          {status === "completed" && (
            <div className="absolute bottom-3 left-3 text-[#f7b801] font-bold text-lg leading-none">
              ✓
            </div>
          )}

          {/* Center Oval */}
          <div 
            className="w-[85%] h-[55%] bg-[#f7b801] rounded-[50%] flex items-center justify-center shadow-[inset_0_0_0_4px_#f18701]" 
            style={{ transform: "rotate(-15deg)" }}
          >
            <div className="w-[88%] h-[80%] border-[3px] border-white rounded-[50%] flex flex-col items-center justify-center px-1" style={{ transform: "rotate(15deg)" }}>
              {isLocked ? (
                 <span className="text-[#991b1b] text-5xl font-black">🔒</span>
              ) : (
                <>
                  <span className="text-white font-black tracking-widest text-[10px]" style={{ textShadow: "1px 1px 0px #f18701" }}>MISSION</span>
                  <span
                    className="text-white font-extrabold text-sm sm:text-base text-center px-2 leading-tight drop-shadow-md line-clamp-3 break-words max-w-full"
                    style={{ textShadow: "1px 1px 0px #f18701, -1px -1px 0 #991b1b" }}
                  >
                    {challenge.title}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* BACK FACE */}
        <div 
          className="absolute inset-0 backface-hidden bg-[#fff8eb] border-[3px] border-[#f7b801] rounded-[16px] [transform:rotateY(180deg)] p-4 sm:p-6 flex flex-col justify-between shadow-inner"
        >
          <div>
            <div className="flex items-center justify-between mb-4 border-b-2 border-[#f7b801]/30 pb-3">
               <span className="text-[#ffffff] font-black text-[10px] bg-[#f7b801] px-2 py-1 flex items-center rounded-md tracking-wider">
                 MISSION {String(challenge.id).padStart(2, '0')}
               </span>
               <span className="text-[#ffffff] font-bold text-[10px] bg-[#991b1b] px-2 py-1 rounded-md uppercase">
                 {getDifficulty()}
               </span>
            </div>
            
            <h3 className="text-[#991b1b] font-black text-2xl sm:text-[30px] leading-[1.05] mb-3 uppercase drop-shadow-[0px_1px_1px_rgba(153,27,27,0.2)] break-words [overflow-wrap:anywhere] line-clamp-3">
              {challenge.title}
            </h3>
            
            <p className="text-[#991b1b]/90 font-semibold text-xs leading-relaxed line-clamp-5">
              {challenge.description}
            </p>
          </div>

          <div className="mt-auto pt-4">
            <div className="w-full bg-[#f18701] text-white font-black text-sm text-center py-2.5 rounded-lg shadow-sm border border-[#f7b801]">
              +{challenge.points * 50} XP
            </div>
          </div>
        </div>

      </div>
    </motion.button>
  );
}
