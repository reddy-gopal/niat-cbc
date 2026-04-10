"use client";

import Link from "next/link";
import { CHALLENGES } from "@/lib/challenges";
import type { StudentSession } from "@/types/app";
import type { Submission, Student } from "@/types/database";
import { Logo } from "../ui/Logo";
import { AvatarMenu } from "../ui/AvatarMenu";
import ChallengeBoard from "../challenges/ChallengeBoard";

type StudentWithContext = Student & {
  sections: { label: string } | null;
  bootcamps: { name: string; date: string } | null;
  regions: { name: string } | null;
};

type DashboardProps = {
  student: StudentWithContext;
  submissions: Submission[];
  totalPoints: number;
  completedCount: number;
  session: StudentSession;
};

export default function Dashboard({
  student,
  submissions,
  totalPoints,
  completedCount,
  session,
}: DashboardProps) {
  const firstName = session.fullName.split(" ")[0] ?? session.fullName;
  const progressPct = (completedCount / 9) * 100;
  const submissionByTask = new Map(submissions.map((item) => [item.task_id, item]));
  const pointsRemaining = CHALLENGES.filter((challenge) => {
    const submission = submissionByTask.get(challenge.id);
    return submission?.status !== "accepted";
  }).reduce((sum, challenge) => sum + challenge.points, 0);

  const getSubTitle = () => {
    if (completedCount === 0) return "🎯 Your journey starts here. Complete your first challenge!";
    if (completedCount < 5) return "🔥 You're on a roll! Keep pushing.";
    if (completedCount < 9) return `⚡ So close! Just ${9 - completedCount} challenge${9 - completedCount > 1 ? 's' : ''} left!`;
    return "🏆 LEGEND STATUS. You crushed all 9 challenges!";
  };

  return (
    <main className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] pb-20">
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 h-[64px] z-30 bg-white border-b border-[var(--border)] shadow-sm">
        <div className="mx-auto max-w-6xl h-full px-4 flex items-center justify-between">
          <div className="flex items-center">
            <Logo size="md" />
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-[var(--bg-warm)] border border-[#f3e4c6] text-[var(--primary)] font-bold px-4 py-1.5 rounded-full text-sm shadow-sm transition-transform hover:scale-105">
              🏅 {totalPoints} pts
            </div>
            <AvatarMenu firstName={firstName} />
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="pt-[64px] bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 animate-[fadeSlideUp_0.4s_ease-out]">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-white/20">
              Section {student.sections?.label}
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3 leading-tight">
              Welcome back, {firstName}! 🔥
            </h1>
            <p className="text-white/80 text-sm md:text-base font-medium">
              {student.bootcamps?.name} · {student.regions?.name}
            </p>
            <p className="text-white/90 mt-4 text-sm bg-black/20 p-3 rounded-xl border border-white/10 shadow-inner">
              {getSubTitle()}
            </p>
          </div>
          <div className="hidden md:flex relative w-48 h-48 items-center justify-center animate-[countUp_0.5s_ease-out]">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="40"
                fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8"
              />
              <circle
                cx="50" cy="50" r="40"
                fill="none" stroke="var(--yellow)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(completedCount / 9) * 251.2} 251.2`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-heading font-bold text-white">{completedCount}/9</span>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-widest mt-1">Done</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 -mt-8 relative z-20">
        {/* STATS ROW */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="card-warm p-6 animate-[fadeSlideUp_0.5s_ease-out]">
            <p className="text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">🏆 Total Points</p>
            <p className="mt-2 text-4xl font-heading font-bold text-[var(--primary)]">{totalPoints}</p>
          </div>
          <div className="card-warm p-6 animate-[fadeSlideUp_0.6s_ease-out]">
            <p className="text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">✅ Challenges Done</p>
            <p className="mt-2 text-4xl font-heading font-bold text-[var(--text-dark)]">
              {completedCount} <span className="text-xl text-[var(--text-muted)] font-medium">of 9</span>
            </p>
          </div>
          <div className="card-warm p-6 animate-[fadeSlideUp_0.7s_ease-out]">
            <p className="text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">⚡ Points Available</p>
            <p className="mt-2 text-4xl font-heading font-bold text-[var(--text-dark)]">{pointsRemaining}</p>
          </div>
        </section>

        {/* CHALLENGE GRID */}
        <section>
          <ChallengeBoard
            challenges={CHALLENGES}
            submissions={submissions}
            session={session}
          />
        </section>
      </div>
    </main>
  );
}
