"use client";

import { useState } from "react";
import type { LeaderboardEntry, TeamLeaderboardEntry } from "@/types/app";
import { StudentAppShell } from "./StudentAppShell";
import { studentMainTopPaddingClass } from "./StudentNavbar";

type LeaderboardProps = {
  individualEntries: LeaderboardEntry[];
  teamEntries: TeamLeaderboardEntry[];
  currentStudentId: string;
  currentTeamId?: string;
  sectionLabel: string;
  bootcampName: string;
  firstName: string;
};

function anonymizeName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? fullName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export default function Leaderboard({
  individualEntries,
  teamEntries,
  currentStudentId,
  currentTeamId,
  sectionLabel,
  bootcampName,
  firstName,
}: LeaderboardProps) {
  const [view, setView] = useState<"individual" | "team">("individual");

  const entries = view === "individual" ? individualEntries : [];
  const activeTeamEntries = view === "team" ? teamEntries : [];

  const top3 = view === "individual" ? individualEntries.slice(0, 3) : teamEntries.slice(0, 3);

  const currentEntry = view === "individual"
    ? individualEntries.find(e => e.studentId === currentStudentId)
    : teamEntries.find(t => t.teamId === currentTeamId);

  const currentRank = currentEntry?.rank ?? 0;

  const getMotivationalMessage = () => {
    if (!currentEntry) return "🚀 Keep competing to climb the ranks!";
    if (currentRank === 1) return view === "individual" ? "👑 You're leading the pack!" : "👑 Your tribe is leading the pack!";
    return view === "individual"
      ? `🚀 You're ranked #${currentRank}. Almost there!`
      : `🚀 Your tribe is ranked #${currentRank}. Push harder!`;
  };

  return (
    <StudentAppShell firstName={firstName}>
      <main className={`min-h-[100dvh] min-h-screen overflow-x-hidden bg-[var(--bg-tint)] text-[var(--text-base)] pb-8 md:pb-20 ${studentMainTopPaddingClass}`}>
        <div className="mx-auto max-w-4xl px-3 sm:px-4 lg:px-6 pb-10 md:pb-12">

          {/* HEADER */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[var(--text-dark)] mb-2 sm:mb-3 px-1">
              🏆 Leaderboard
            </h1>
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-medium bg-[var(--bg-warm)] inline-block max-w-[min(100%,28rem)] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#f3e4c6] [overflow-wrap:anywhere]">
              {bootcampName} · Section {sectionLabel}
            </p>

            <div className="mt-8 flex justify-center">
              <div className="bg-white p-1 rounded-xl border border-[var(--card-border)] shadow-sm flex gap-1">
                <button
                  onClick={() => setView("individual")}
                  className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${view === "individual" ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-muted)] hover:bg-gray-50'}`}
                >
                  Individual
                </button>
                <button
                  onClick={() => setView("team")}
                  className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${view === "team" ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-muted)] hover:bg-gray-50'}`}
                >
                  Tribe
                </button>
              </div>
            </div>

            {currentEntry && (
              <p className="mt-6 text-sm sm:text-base text-[var(--primary)] font-bold bg-white px-4 py-2 rounded-xl shadow-sm inline-block max-w-[min(100%,36rem)] border border-[var(--card-border)] animate-[fadeSlideUp_0.3s_ease-out]">
                {getMotivationalMessage()}
              </p>
            )}
          </div>

          {/* TOP 3 PODIUM */}
          <section className="flex flex-row flex-wrap justify-center items-end gap-2 sm:gap-4 md:gap-6 mb-8 sm:mb-12 px-1 sm:px-2">
            {[1, 0, 2].map((idx) => {
              const entry = top3[idx];
              if (!entry) return null;

              const place = entry.rank;
              const isFirst = place === 1;
              const isSecond = place === 2;

              const color = isFirst ? "#f7b801" : isSecond ? "#94a3b8" : "#cd7f32";
              const bgColor = isFirst ? "from-[#f7b801]/20 to-white" : isSecond ? "from-[#94a3b8]/20 to-white" : "from-[#cd7f32]/20 to-white";
              const emoji = isFirst ? "👑" : isSecond ? "🥈" : "🥉";
              const podiumHeight = isFirst ? "h-[100px] sm:h-[120px]" : isSecond ? "h-[64px] sm:h-[80px]" : "h-[52px] sm:h-[60px]";
              const avatarSize = isFirst ? "w-14 h-14 sm:w-16 sm:h-16 text-lg sm:text-xl text-white" : "w-11 h-11 sm:w-12 sm:h-12 text-xs sm:text-sm text-[var(--text-dark)] bg-white";

              const name = view === "individual" ? (entry as LeaderboardEntry).fullName : (entry as TeamLeaderboardEntry).name;
              const score = view === "individual" ? `${(entry as LeaderboardEntry).totalPoints} Points` : `${(entry as TeamLeaderboardEntry).averagePoints.toFixed(1)} Avg`;

              return (
                <div key={idx} className="flex flex-col items-center flex-1 min-w-[90px] max-w-[140px] animate-[fadeSlideUp_0.5s_ease-out]">
                  <div className="flex flex-col items-center mb-3">
                    <div className="relative mb-2">
                      {isFirst && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce">👑</div>}
                      <div
                        className={`${avatarSize} rounded-full flex items-center justify-center font-heading font-bold shadow-md border-2 border-white`}
                        style={{ backgroundColor: isFirst ? color : '#f1f5f9' }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      {!isFirst && <div className="absolute -bottom-2 -right-2 text-xl">{emoji}</div>}
                    </div>
                    <p className="font-bold text-sm text-[var(--text-dark)] text-center leading-tight truncate w-full px-1">
                      {view === "individual" ? anonymizeName(name) : name}
                    </p>
                    <p className="text-xs font-bold mt-1 text-[var(--text-muted)] bg-white px-2 py-0.5 rounded-full shadow-sm">
                      {score}
                    </p>
                  </div>
                  <div className={`w-full rounded-t-xl shadow-lg border-t-4 bg-gradient-to-b ${bgColor} ${podiumHeight} relative overflow-hidden`} style={{ borderTopColor: color }} />
                </div>
              );
            })}
          </section>

          {/* LIST */}
          <section className="card overflow-hidden bg-white">
            <div className="bg-[var(--bg-warm)] grid grid-cols-12 gap-1 sm:gap-2 px-3 sm:px-6 py-3 border-b border-[var(--card-border)] text-[10px] font-bold text-[var(--text-dark)] uppercase tracking-wider">
              <div className="col-span-2 sm:col-span-1">#</div>
              <div className="col-span-5 sm:col-span-6">{view === "individual" ? "Student" : "Tribe"}</div>
              <div className="col-span-3 text-right">{view === "individual" ? "Points" : "Avg Pts"}</div>
              <div className="col-span-2 text-right">{view === "individual" ? "Done" : "Size"}</div>
            </div>

            <div className="divide-y divide-[var(--card-border)]">
              {(view === "individual" ? individualEntries : teamEntries).map((entry) => {
                const isCurrent = view === "individual"
                  ? (entry as LeaderboardEntry).studentId === currentStudentId
                  : (entry as TeamLeaderboardEntry).teamId === currentTeamId;

                const place = entry.rank;
                const isTop3 = place <= 3;
                const top3Color = place === 1 ? "#f7b801" : place === 2 ? "#94a3b8" : place === 3 ? "#cd7f32" : "transparent";

                if (view === "individual") {
                  const e = entry as LeaderboardEntry;
                  return (
                    <div key={e.studentId} className={`grid grid-cols-12 gap-1 sm:gap-2 px-3 sm:px-6 py-4 items-center transition-colors hover:bg-[var(--bg-tint)] ${isCurrent ? "bg-[var(--bg-tint)] border-l-4" : "border-l-4"}`} style={{ borderLeftColor: isCurrent ? "var(--primary)" : (isTop3 ? top3Color : "transparent") }}>
                      <div className="col-span-2 sm:col-span-1 font-bold text-xs">#{e.rank}</div>
                      <div className="col-span-5 sm:col-span-6 flex min-w-0 items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text-dark)] truncate">{anonymizeName(e.fullName)}</span>
                        {isCurrent && <span className="text-[8px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded font-black uppercase">You</span>}
                      </div>
                      <div className="col-span-3 text-right font-black text-[var(--primary)] text-sm">{e.totalPoints}</div>
                      <div className="col-span-2 text-right text-xs font-bold text-[var(--text-secondary)]">{e.completedChallenges}<span className="text-[10px] text-gray-400">/9</span></div>
                    </div>
                  );
                } else {
                  const t = entry as TeamLeaderboardEntry;
                  return (
                    <div key={t.teamId} className={`grid grid-cols-12 gap-1 sm:gap-2 px-3 sm:px-6 py-5 items-center transition-colors hover:bg-[var(--bg-tint)] ${isCurrent ? "bg-[var(--bg-tint)] border-l-4" : "border-l-4"}`} style={{ borderLeftColor: isCurrent ? "var(--primary)" : (isTop3 ? top3Color : "transparent") }}>
                      <div className="col-span-2 sm:col-span-1 font-bold text-xs">#{t.rank}</div>
                      <div className="col-span-5 sm:col-span-6 flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[var(--text-dark)] truncate">{t.name}</span>
                          {isCurrent && <span className="text-[8px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded font-black uppercase">Your Tribe</span>}
                        </div>
                        <p className="text-[9px] text-[var(--text-muted)] font-medium truncate mt-0.5">
                          {t.members.join(", ")}
                        </p>
                      </div>
                      <div className="col-span-3 text-right flex flex-col items-end">
                        <span className="font-black text-[var(--primary)] text-sm">{t.averagePoints.toFixed(1)}</span>
                        <span className="text-[8px] text-[var(--text-muted)] font-bold uppercase">Average</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-xs font-black text-[var(--text-dark)] px-2 py-1 bg-gray-100 rounded-lg">{t.memberCount}</span>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </section>
        </div>
      </main>
    </StudentAppShell>
  );
}
