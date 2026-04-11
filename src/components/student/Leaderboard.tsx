"use client";

import type { LeaderboardEntry } from "@/types/app";
import { StudentAppShell } from "./StudentAppShell";
import { studentMainTopPaddingClass } from "./StudentNavbar";

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  currentStudentId: string;
  sectionLabel: string;
  bootcampName: string;
  firstName: string;
};

function anonymizeName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? fullName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export default function Leaderboard({
  entries,
  currentStudentId,
  sectionLabel,
  bootcampName,
  firstName,
}: LeaderboardProps) {
  const top3 = entries.slice(0, 3);
  const order = [1, 0, 2]
    .map((idx) => top3[idx])
    .filter((item): item is LeaderboardEntry => Boolean(item));

  const currentRankIndex = entries.findIndex(e => e.studentId === currentStudentId);
  const currentRank = currentRankIndex !== -1 ? currentRankIndex + 1 : 0;
  const currentEntry = entries[currentRankIndex];
  
  const getMotivationalMessage = () => {
    if (currentRank === 1) return "👑 You're leading the pack!";
    if (currentRank > 1 && currentRankIndex > 0 && currentEntry) {
      const prevEntry = entries[currentRankIndex - 1];
      const ptsToNext = prevEntry.totalPoints - currentEntry.totalPoints;
      if (ptsToNext > 0) {
        return `🚀 ${ptsToNext} pts to reach #${currentRank - 1}. You got this!`;
      } else {
        return `🚀 You are tied for #${currentRank - 1}. Complete a challenge to break the tie!`;
      }
    }
    return "🚀 Keep completing challenges to climb the ranks!";
  };

  return (
    <StudentAppShell firstName={firstName}>
      <main
        className={`min-h-[100dvh] min-h-screen overflow-x-hidden bg-[var(--bg-tint)] text-[var(--text-base)] pb-8 md:pb-20 ${studentMainTopPaddingClass}`}
      >
        <div className="mx-auto max-w-4xl px-3 sm:px-4 lg:px-6 pb-10 md:pb-12">
        {/* HEADER */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[var(--text-dark)] mb-2 sm:mb-3 px-1">
            🏆 Leaderboard
          </h1>
          <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-medium bg-[var(--bg-warm)] inline-block max-w-[min(100%,28rem)] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#f3e4c6] [overflow-wrap:anywhere]">
            {bootcampName} · Section {sectionLabel}
          </p>
          
          {currentEntry && (
             <p className="mt-4 sm:mt-6 text-sm sm:text-base text-[var(--primary)] font-bold bg-white px-3 sm:px-4 py-2 rounded-xl shadow-sm inline-block max-w-[min(100%,36rem)] border border-[var(--card-border)] animate-[fadeSlideUp_0.3s_ease-out] [overflow-wrap:anywhere]">
              {getMotivationalMessage()}
            </p>
          )}
        </div>

        {/* TOP 3 PODIUM */}
        {order.length > 0 && (
          <section className="flex flex-row flex-wrap justify-center items-end gap-2 sm:gap-4 md:gap-6 mb-8 sm:mb-12 px-1 sm:px-2">
            {order.map((entry) => {
              const place = entry.rank;
              const isFirst = place === 1;
              const isSecond = place === 2;
              
              const color = isFirst ? "#f7b801" : isSecond ? "#94a3b8" : "#cd7f32";
              const bgColor = isFirst ? "from-[#f7b801]/20 to-white" : isSecond ? "from-[#94a3b8]/20 to-white" : "from-[#cd7f32]/20 to-white";
              const emoji = isFirst ? "👑" : isSecond ? "🥈" : "🥉";
              const podiumHeight = isFirst ? "h-[100px] sm:h-[120px]" : isSecond ? "h-[64px] sm:h-[80px]" : "h-[52px] sm:h-[60px]";
              const avatarSize = isFirst ? "w-14 h-14 sm:w-16 sm:h-16 text-lg sm:text-xl text-white" : "w-11 h-11 sm:w-12 sm:h-12 text-xs sm:text-sm text-[var(--text-dark)] bg-white";

              return (
                <div key={entry.studentId} className="flex flex-col items-center flex-1 min-w-[90px] max-w-[140px] animate-[fadeSlideUp_0.5s_ease-out]">
                  {/* Avatar & Info */}
                  <div className="flex flex-col items-center mb-3">
                    <div className="relative mb-2">
                      {isFirst && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce">👑</div>}
                      <div 
                        className={`${avatarSize} rounded-full flex items-center justify-center font-heading font-bold shadow-md border-2 border-white`}
                        style={{ backgroundColor: isFirst ? color : '#f1f5f9' }}
                      >
                        {entry.fullName.charAt(0).toUpperCase()}
                      </div>
                      {!isFirst && <div className="absolute -bottom-2 -right-2 text-xl">{emoji}</div>}
                    </div>
                    <p className="font-bold text-sm text-[var(--text-dark)] text-center leading-tight truncate w-full px-1">
                      {anonymizeName(entry.fullName)}
                    </p>
                    <p className="text-xs font-bold mt-1 text-[var(--text-muted)] bg-white px-2 py-0.5 rounded-full shadow-sm">
                      {entry.totalPoints} pts
                    </p>
                  </div>
                  
                  {/* Podium Block */}
                  <div 
                    className={`w-full rounded-t-xl shadow-lg border-t-4 bg-gradient-to-b ${bgColor} ${podiumHeight} relative overflow-hidden`}
                    style={{ borderTopColor: color }}
                  >
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* RANKED LIST */}
        <section className="card overflow-hidden bg-white">
          <div className="bg-[var(--bg-warm)] grid grid-cols-12 gap-1 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--card-border)] text-[10px] sm:text-xs font-bold text-[var(--text-dark)] uppercase tracking-wider">
            <div className="col-span-2 sm:col-span-1">#</div>
            <div className="col-span-5 sm:col-span-6 min-w-0">Student</div>
            <div className="col-span-3 text-right">Pts</div>
            <div className="col-span-2 text-right">Done</div>
          </div>
          <div className="divide-y divide-[var(--card-border)]">
            {entries.map((entry) => {
              const place = entry.rank;
              const isCurrent = entry.studentId === currentStudentId;
              const isTop3 = place <= 3;
              const top3Color = place === 1 ? "#f7b801" : place === 2 ? "#94a3b8" : place === 3 ? "#cd7f32" : "transparent";
              
              return (
                <div
                  key={entry.studentId}
                  className={`grid grid-cols-12 gap-1 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 items-center transition-colors hover:bg-[var(--bg-tint)] ${
                    isCurrent ? "bg-[var(--bg-tint)] border-l-4" : "border-l-4"
                  }`}
                  style={{ 
                    borderLeftColor: isCurrent ? "var(--primary)" : (isTop3 ? top3Color : "transparent")
                  }}
                >
                  <div className={`col-span-2 sm:col-span-1 font-bold tabular-nums text-xs sm:text-sm ${isTop3 ? 'text-[var(--text-dark)]' : 'text-[var(--text-muted)]'}`}>
                    #{entry.rank}
                  </div>
                  <div className="col-span-5 sm:col-span-6 flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <span className="font-bold text-xs sm:text-sm text-[var(--text-dark)] truncate">
                      {anonymizeName(entry.fullName)}
                    </span>
                    {isCurrent && <span className="shrink-0 hidden sm:inline-block text-[10px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">You</span>}
                  </div>
                  <div className="col-span-3 text-right font-bold text-[var(--primary)] text-xs sm:text-sm tabular-nums">
                    {entry.totalPoints}
                  </div>
                  <div className="col-span-2 text-right text-[11px] sm:text-sm font-medium text-[var(--text-secondary)] bg-slate-50 rounded-md sm:rounded-lg py-1 px-1.5 sm:px-2 border border-slate-100 flex items-center justify-end gap-0.5 sm:gap-1 tabular-nums">
                    {entry.completedChallenges}<span className="text-[9px] sm:text-[10px] text-slate-400">/9</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      </main>
    </StudentAppShell>
  );
}
