"use client";

import { useMemo, useState } from "react";
import { CHALLENGES } from "@/lib/challenges";
import { formatLeaderboardPoints } from "@/lib/leaderboard";
import type { LeaderboardEntry, TeamLeaderboardEntry } from "@/types/app";
import { StudentAppShell } from "./StudentAppShell";
import { studentMainTopPaddingClass } from "./StudentNavbar";

type LeaderboardView = "overall" | "individual" | "team";

type LeaderboardProps = {
  overallEntries: LeaderboardEntry[];
  currentOverallEntry: LeaderboardEntry | null;
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

function formatRegionBootcamp(entry: LeaderboardEntry): string {
  const parts = [entry.regionName, entry.bootcampName].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function IndividualRow({
  entry,
  view,
  isCurrent,
  totalChallenges,
}: {
  entry: LeaderboardEntry;
  view: LeaderboardView;
  isCurrent: boolean;
  totalChallenges: number;
}) {
  const isTop3 = entry.rank <= 3;
  const top3Color =
    entry.rank === 1
      ? "#f7b801"
      : entry.rank === 2
        ? "#94a3b8"
        : entry.rank === 3
          ? "#cd7f32"
          : "transparent";
  const inOverallTop10 = view === "overall" && isCurrent;

  return (
    <div
      className={`grid grid-cols-12 gap-1 sm:gap-2 px-3 sm:px-6 py-4 items-center transition-colors border-l-4 ${
        inOverallTop10
          ? "bg-[var(--primary)]/10 ring-2 ring-inset ring-[var(--primary)]/30"
          : isCurrent
            ? "bg-[var(--bg-tint)]"
            : "hover:bg-[var(--bg-tint)]"
      }`}
      style={{
        borderLeftColor: inOverallTop10
          ? "var(--primary)"
          : isCurrent
            ? "var(--primary)"
            : isTop3
              ? top3Color
              : "transparent",
      }}
    >
      <div className="col-span-2 sm:col-span-1 font-bold text-xs">#{entry.rank}</div>
      <div className="col-span-5 sm:col-span-6 flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-bold text-sm text-[var(--text-dark)] truncate">
            {anonymizeName(entry.fullName)}
          </span>
          {isCurrent && (
            <span className="text-[8px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded font-black uppercase shrink-0">
              You
            </span>
          )}
        </div>
        {view === "overall" && (
          <p className="text-[10px] text-[var(--text-muted)] font-medium truncate">
            {formatRegionBootcamp(entry)}
          </p>
        )}
      </div>
      <div className="col-span-3 text-right font-black text-[var(--primary)] text-sm">
        {formatLeaderboardPoints(entry.totalPoints)}
      </div>
      <div className="col-span-2 text-right text-xs font-bold text-[var(--text-secondary)]">
        {view === "overall" ? (
          entry.sectionLabel ?? "—"
        ) : (
          <>
            {entry.completedChallenges}
            <span className="text-[10px] text-gray-400">/{totalChallenges}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function Leaderboard({
  overallEntries,
  currentOverallEntry,
  individualEntries,
  teamEntries,
  currentStudentId,
  currentTeamId,
  sectionLabel,
  bootcampName,
  firstName,
}: LeaderboardProps) {
  const [view, setView] = useState<LeaderboardView>("overall");
  const totalChallenges = CHALLENGES.length;

  const activeIndividualEntries =
    view === "overall" ? overallEntries : view === "individual" ? individualEntries : [];

  const top3 = useMemo(() => {
    if (view === "team") return teamEntries.slice(0, 3);
    return activeIndividualEntries.slice(0, 3);
  }, [view, teamEntries, activeIndividualEntries]);

  /** Podium shows #1–#3; table lists #4 onward only. */
  const listEntries = useMemo(() => {
    if (view === "team") return teamEntries.slice(3);
    return activeIndividualEntries.slice(3);
  }, [view, teamEntries, activeIndividualEntries]);

  const currentEntry =
    view === "overall"
      ? currentOverallEntry
      : view === "individual"
        ? individualEntries.find((entry) => entry.studentId === currentStudentId)
        : teamEntries.find((team) => team.teamId === currentTeamId);

  const currentRank = currentEntry?.rank ?? 0;
  const isCurrentInOverallTop10 =
    view === "overall" &&
    overallEntries.some((entry) => entry.studentId === currentStudentId);

  const scopeLabel =
    view === "overall"
      ? "All Bootcamps · Top 10 Overall"
      : view === "individual"
        ? `${bootcampName} · Section ${sectionLabel}`
        : `${bootcampName} · Section ${sectionLabel} · Tribes`;

  const getMotivationalMessage = () => {
    if (view === "overall") {
      if (!currentOverallEntry) {
        return "🚀 Keep competing to climb the global leaderboard!";
      }
      if (currentOverallEntry.rank === 1) return "👑 You're #1 overall across all bootcamps!";
      if (isCurrentInOverallTop10) {
        return `🌟 You're in the global top 10 at rank #${currentOverallEntry.rank}!`;
      }
      return `🚀 You're ranked #${currentOverallEntry.rank} overall. Push for the top 10!`;
    }

    if (!currentEntry) return "🚀 Keep competing to climb the ranks!";
    if (currentRank === 1) {
      return view === "individual"
        ? "👑 You're leading your section!"
        : "👑 Your tribe is leading your section!";
    }
    return view === "individual"
      ? `🚀 You're ranked #${currentRank} in your section. Almost there!`
      : `🚀 Your tribe is ranked #${currentRank} in your section. Push harder!`;
  };

  return (
    <StudentAppShell firstName={firstName}>
      <main
        className={`min-h-[100dvh] min-h-screen overflow-x-hidden bg-[var(--bg-tint)] text-[var(--text-base)] pb-8 md:pb-20 ${studentMainTopPaddingClass}`}
      >
        <div className="mx-auto max-w-4xl px-3 sm:px-4 lg:px-6 pb-10 md:pb-12">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[var(--text-dark)] mb-2 sm:mb-3 px-1">
              🏆 Leaderboard
            </h1>
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-medium bg-[var(--bg-warm)] inline-block max-w-[min(100%,28rem)] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#f3e4c6] [overflow-wrap:anywhere]">
              {scopeLabel}
            </p>

            <div className="mt-8 flex justify-center">
              <div className="bg-white p-1 rounded-xl border border-[var(--card-border)] shadow-sm flex flex-wrap gap-1 justify-center">
                {(["overall", "individual", "team"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setView(tab)}
                    className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                      view === tab
                        ? "bg-[var(--primary)] text-white shadow-md"
                        : "text-[var(--text-muted)] hover:bg-gray-50"
                    }`}
                  >
                    {tab === "team" ? "Tribe" : tab}
                  </button>
                ))}
              </div>
            </div>

            {(view === "overall" ? currentOverallEntry : currentEntry) && (
              <p className="mt-6 text-sm sm:text-base text-[var(--primary)] font-bold bg-white px-4 py-2 rounded-xl shadow-sm inline-block max-w-[min(100%,36rem)] border border-[var(--card-border)] animate-[fadeSlideUp_0.3s_ease-out]">
                {getMotivationalMessage()}
              </p>
            )}
          </div>

          <section className="flex flex-row flex-wrap justify-center items-end gap-2 sm:gap-4 md:gap-6 mb-8 sm:mb-12 px-1 sm:px-2">
            {[1, 0, 2].map((idx) => {
              const entry = top3[idx];
              if (!entry) return null;

              const place = entry.rank;
              const isFirst = place === 1;
              const isSecond = place === 2;
              const isCurrentPodium =
                view !== "team" &&
                (entry as LeaderboardEntry).studentId === currentStudentId;

              const color = isFirst ? "#f7b801" : isSecond ? "#94a3b8" : "#cd7f32";
              const bgColor = isFirst
                ? "from-[#f7b801]/20 to-white"
                : isSecond
                  ? "from-[#94a3b8]/20 to-white"
                  : "from-[#cd7f32]/20 to-white";
              const emoji = isFirst ? "👑" : isSecond ? "🥈" : "🥉";
              const podiumHeight = isFirst
                ? "h-[100px] sm:h-[120px]"
                : isSecond
                  ? "h-[64px] sm:h-[80px]"
                  : "h-[52px] sm:h-[60px]";
              const avatarSize = isFirst
                ? "w-14 h-14 sm:w-16 sm:h-16 text-lg sm:text-xl text-white"
                : "w-11 h-11 sm:w-12 sm:h-12 text-xs sm:text-sm text-[var(--text-dark)] bg-white";

              const name =
                view === "team"
                  ? (entry as TeamLeaderboardEntry).name
                  : (entry as LeaderboardEntry).fullName;
              const score =
                view === "team"
                  ? `${(entry as TeamLeaderboardEntry).averagePoints.toFixed(1)} Avg`
                  : `${formatLeaderboardPoints((entry as LeaderboardEntry).totalPoints)} Points`;

              return (
                <div
                  key={`${view}-${idx}`}
                  className={`flex flex-col items-center flex-1 min-w-[90px] max-w-[140px] animate-[fadeSlideUp_0.5s_ease-out] ${
                    isCurrentPodium ? "rounded-2xl ring-2 ring-[var(--primary)]/40 px-1 pt-1" : ""
                  }`}
                >
                  <div className="flex flex-col items-center mb-3">
                    <div className="relative mb-2">
                      {isFirst && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce">
                          👑
                        </div>
                      )}
                      <div
                        className={`${avatarSize} rounded-full flex items-center justify-center font-heading font-bold shadow-md border-2 border-white`}
                        style={{ backgroundColor: isFirst ? color : "#f1f5f9" }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      {!isFirst && <div className="absolute -bottom-2 -right-2 text-xl">{emoji}</div>}
                    </div>
                    <p className="font-bold text-sm text-[var(--text-dark)] text-center leading-tight truncate w-full px-1">
                      {view === "team" ? name : anonymizeName(name)}
                    </p>
                    {view === "overall" && (
                      <p className="text-[9px] text-[var(--text-muted)] text-center truncate w-full px-1 mt-0.5">
                        {formatRegionBootcamp(entry as LeaderboardEntry)}
                      </p>
                    )}
                    <p className="text-xs font-bold mt-1 text-[var(--text-muted)] bg-white px-2 py-0.5 rounded-full shadow-sm">
                      {score}
                    </p>
                  </div>
                  <div
                    className={`w-full rounded-t-xl shadow-lg border-t-4 bg-gradient-to-b ${bgColor} ${podiumHeight} relative overflow-hidden`}
                    style={{ borderTopColor: color }}
                  />
                </div>
              );
            })}
          </section>

          <section className="card overflow-hidden bg-white">
            <div className="bg-[var(--bg-warm)] grid grid-cols-12 gap-1 sm:gap-2 px-3 sm:px-6 py-3 border-b border-[var(--card-border)] text-[10px] font-bold text-[var(--text-dark)] uppercase tracking-wider">
              <div className="col-span-2 sm:col-span-1">#</div>
              <div className="col-span-5 sm:col-span-6">
                {view === "team" ? "Tribe" : "Student"}
              </div>
              <div className="col-span-3 text-right">
                {view === "team" ? "Avg Pts" : "Points"}
              </div>
              <div className="col-span-2 text-right">
                {view === "team" ? "Size" : view === "overall" ? "Section" : "Done"}
              </div>
            </div>

            <div className="divide-y divide-[var(--card-border)]">
              {view === "team"
                ? listEntries.map((team) => {
                    const typedTeam = team as TeamLeaderboardEntry;
                    const isCurrent = typedTeam.teamId === currentTeamId;
                    const isTop3 = typedTeam.rank <= 3;
                    const top3Color =
                      typedTeam.rank === 1
                        ? "#f7b801"
                        : typedTeam.rank === 2
                          ? "#94a3b8"
                          : typedTeam.rank === 3
                            ? "#cd7f32"
                            : "transparent";

                    return (
                      <div
                        key={typedTeam.teamId}
                        className={`grid grid-cols-12 gap-1 sm:gap-2 px-3 sm:px-6 py-5 items-center transition-colors hover:bg-[var(--bg-tint)] ${isCurrent ? "bg-[var(--bg-tint)] border-l-4" : "border-l-4"}`}
                        style={{
                          borderLeftColor: isCurrent
                            ? "var(--primary)"
                            : isTop3
                              ? top3Color
                              : "transparent",
                        }}
                      >
                        <div className="col-span-2 sm:col-span-1 font-bold text-xs">#{typedTeam.rank}</div>
                        <div className="col-span-5 sm:col-span-6 flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[var(--text-dark)] truncate">
                              {typedTeam.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[8px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded font-black uppercase">
                                Your Tribe
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-[var(--text-muted)] font-medium truncate mt-0.5">
                            {typedTeam.members.join(", ")}
                          </p>
                        </div>
                        <div className="col-span-3 text-right flex flex-col items-end">
                          <span className="font-black text-[var(--primary)] text-sm">
                            {typedTeam.averagePoints.toFixed(1)}
                          </span>
                          <span className="text-[8px] text-[var(--text-muted)] font-bold uppercase">
                            Average
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-xs font-black text-[var(--text-dark)] px-2 py-1 bg-gray-100 rounded-lg">
                            {typedTeam.memberCount}
                          </span>
                        </div>
                      </div>
                    );
                  })
                : listEntries.map((entry) => {
                    const student = entry as LeaderboardEntry;
                    return (
                    <IndividualRow
                      key={`${view}-${student.studentId}`}
                      entry={student}
                      view={view}
                      isCurrent={student.studentId === currentStudentId}
                      totalChallenges={totalChallenges}
                    />
                    );
                  })}
            </div>
          </section>

          {view === "overall" && currentOverallEntry && (
            <section className="mt-6 card overflow-hidden bg-white border-2 border-[var(--primary)]/20">
              <div className="bg-[var(--primary)]/10 px-4 sm:px-6 py-3 border-b border-[var(--card-border)]">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">
                  Your Global Rank
                </p>
              </div>
              <div className="px-4 sm:px-6 py-5 grid grid-cols-12 gap-3 items-center">
                <div className="col-span-12 sm:col-span-2">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Rank</p>
                  <p className="text-2xl font-black text-[var(--primary)]">
                    #{currentOverallEntry.rank}
                  </p>
                </div>
                <div className="col-span-12 sm:col-span-5">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">You</p>
                  <p className="font-bold text-[var(--text-dark)]">{sessionDisplayName(currentOverallEntry.fullName)}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {formatRegionBootcamp(currentOverallEntry)}
                  </p>
                </div>
                <div className="col-span-6 sm:col-span-2 sm:text-right">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Region</p>
                  <p className="text-sm font-bold text-[var(--text-dark)]">
                    {currentOverallEntry.regionName ?? "—"}
                  </p>
                </div>
                <div className="col-span-6 sm:col-span-2 sm:text-right">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Bootcamp</p>
                  <p className="text-sm font-bold text-[var(--text-dark)] truncate">
                    {currentOverallEntry.bootcampName ?? "—"}
                  </p>
                </div>
                <div className="col-span-12 sm:col-span-1 sm:text-right">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Points</p>
                  <p className="text-lg font-black text-[var(--primary)]">
                    {formatLeaderboardPoints(currentOverallEntry.totalPoints)}
                  </p>
                </div>
              </div>
              {isCurrentInOverallTop10 && (
                <p className="px-4 sm:px-6 pb-4 text-xs font-semibold text-[var(--primary)]">
                  {currentOverallEntry.rank <= 3
                    ? "You’re highlighted on the podium above."
                    : "You’re highlighted in the top 10 list above."}
                </p>
              )}
            </section>
          )}
        </div>
      </main>
    </StudentAppShell>
  );
}

function sessionDisplayName(fullName: string): string {
  return fullName.trim() || "Student";
}
