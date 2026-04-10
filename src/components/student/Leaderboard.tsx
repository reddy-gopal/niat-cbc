"use client";

import Link from "next/link";
import type { LeaderboardEntry } from "@/types/app";

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  currentStudentId: string;
  sectionLabel: string;
  bootcampName: string;
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
    if (currentRank > 1 && currentRankIndex > 0) {
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
    <main className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] pb-20">
      <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors mb-8">
          ← Back to Dashboard
        </Link>

        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-[var(--text-dark)] mb-3">
            🏆 Leaderboard
          </h1>
          <p className="text-[var(--text-secondary)] font-medium bg-[var(--bg-warm)] inline-block px-4 py-2 rounded-full border border-[#f3e4c6]">
            {bootcampName} · Section {sectionLabel}
          </p>
          
          {currentEntry && (
             <p className="mt-6 text-[var(--primary)] font-bold bg-white px-4 py-2 rounded-xl shadow-sm inline-block border border-[var(--card-border)] animate-[fadeSlideUp_0.3s_ease-out]">
              {getMotivationalMessage()}
            </p>
          )}
        </div>

        {/* TOP 3 PODIUM */}
        {order.length > 0 && (
          <section className="flex justify-center items-end gap-3 md:gap-6 mb-12 px-2">
            {order.map((entry) => {
              const place = entry.rank;
              const isFirst = place === 1;
              const isSecond = place === 2;
              
              const color = isFirst ? "#f7b801" : isSecond ? "#94a3b8" : "#cd7f32";
              const bgColor = isFirst ? "from-[#f7b801]/20 to-white" : isSecond ? "from-[#94a3b8]/20 to-white" : "from-[#cd7f32]/20 to-white";
              const emoji = isFirst ? "👑" : isSecond ? "🥈" : "🥉";
              const podiumHeight = isFirst ? "h-[120px]" : isSecond ? "h-[80px]" : "h-[60px]";
              const avatarSize = isFirst ? "w-16 h-16 text-xl text-white" : "w-12 h-12 text-sm text-[var(--text-dark)] bg-white";

              return (
                <div key={entry.studentId} className="flex flex-col items-center flex-1 max-w-[140px] animate-[fadeSlideUp_0.5s_ease-out]">
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
          <div className="bg-[var(--bg-warm)] grid grid-cols-12 gap-2 px-6 py-3 border-b border-[var(--card-border)] text-xs font-bold text-[var(--text-dark)] uppercase tracking-wider">
            <div className="col-span-2 sm:col-span-1">Rnk</div>
            <div className="col-span-5 sm:col-span-6">Student</div>
            <div className="col-span-3 text-right">Points</div>
            <div className="col-span-2 text-right">✅</div>
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
                  className={`grid grid-cols-12 gap-2 px-6 py-4 items-center transition-colors hover:bg-[var(--bg-tint)] ${
                    isCurrent ? "bg-[var(--bg-tint)] border-l-4" : "border-l-4"
                  }`}
                  style={{ 
                    borderLeftColor: isCurrent ? "var(--primary)" : (isTop3 ? top3Color : "transparent")
                  }}
                >
                  <div className={`col-span-2 sm:col-span-1 font-bold ${isTop3 ? 'text-[var(--text-dark)]' : 'text-[var(--text-muted)]'}`}>
                    #{entry.rank}
                  </div>
                  <div className="col-span-5 sm:col-span-6 flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--text-dark)] truncate">
                      {anonymizeName(entry.fullName)}
                    </span>
                    {isCurrent && <span className="hidden sm:inline-block text-[10px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">You</span>}
                  </div>
                  <div className="col-span-3 text-right font-bold text-[var(--primary)] text-sm">
                    {entry.totalPoints} pts
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-[var(--text-secondary)] bg-slate-50 rounded-lg py-1 px-2 border border-slate-100 flex items-center justify-end gap-1">
                    {entry.completedChallenges} <span className="text-[10px] text-slate-400">/ 9</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
