"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CHALLENGES } from "@/lib/challenges";
import type { StudentSession } from "@/types/app";
import type { Submission, Student } from "@/types/database";
import ChallengeBoard from "../challenges/ChallengeBoard";
import { StudentAppShell } from "./StudentAppShell";
import { studentMainTopPaddingClass } from "./StudentNavbar";

type StudentWithContext = Student & {
  sections: { label: string } | null;
  bootcamps: { name: string; date: string } | null;
  regions: { name: string } | null;
};

type DashboardProps = {
  student: StudentWithContext;
  submissions: Submission[];
  session: StudentSession;
};

export default function Dashboard({
  student,
  submissions: initialSubmissions,
  session,
}: DashboardProps) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);

  const firstName = session.fullName.split(" ")[0] ?? session.fullName;
  const submissionByTask = useMemo(
    () => new Map(submissions.map((item) => [item.task_id, item])),
    [submissions]
  );

  const totalPoints = useMemo(
    () =>
      submissions
        .filter((item) => item.status === "accepted")
        .reduce((sum, item) => sum + item.points, 0),
    [submissions]
  );

  const completedCount = useMemo(
    () => submissions.filter((item) => item.status === "accepted").length,
    [submissions]
  );

  const pointsRemaining = useMemo(
    () =>
      CHALLENGES.filter((challenge) => {
        const submission = submissionByTask.get(challenge.id);
        return submission?.status !== "accepted";
      }).reduce((sum, challenge) => sum + challenge.points, 0),
    [submissionByTask]
  );

  const getSubTitle = () => {
    if (completedCount === 0) return "🎯 Your journey starts here. Complete your first challenge!";
    if (completedCount < 5) return "🔥 You're on a roll! Keep pushing.";
    if (completedCount < 9)
      return `⚡ So close! Just ${9 - completedCount} challenge${9 - completedCount > 1 ? "s" : ""} left!`;
    return "🏆 LEGEND STATUS. You crushed all 9 challenges!";
  };

  return (
    <StudentAppShell firstName={firstName}>
      <main className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] pb-8 md:pb-20">
        {/* HERO BANNER */}
        <section
          className={`${studentMainTopPaddingClass} bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] text-white`}
        >
          <div className="mx-auto max-w-6xl px-4 py-10 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 animate-[fadeSlideUp_0.4s_ease-out]">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-white/20">
                Section {student.sections?.label}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold mb-3 leading-tight [overflow-wrap:anywhere]">
                Welcome back, {firstName}! 🔥
              </h1>
              <p className="text-white/80 text-xs sm:text-sm md:text-base font-medium">
                {student.bootcamps?.name} · {student.regions?.name}
              </p>
              <p className="text-white/90 mt-4 text-sm bg-black/20 p-3 rounded-xl border border-white/10 shadow-inner">
                {getSubTitle()}
              </p>
            </div>
            <div className="hidden md:flex relative w-48 h-48 items-center justify-center animate-[countUp_0.5s_ease-out]">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--yellow)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(completedCount / 9) * 251.2} 251.2`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-heading font-bold text-white">{completedCount}/9</span>
                <span className="text-xs font-semibold text-white/70 uppercase tracking-widest mt-1">
                  Done
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 -mt-8 relative z-20">
          {/* STATS ROW */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card-warm p-6 animate-[fadeSlideUp_0.5s_ease-out]">
              <p className="text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                🏆 Total Points
              </p>
              <p className="mt-2 text-4xl font-heading font-bold text-[var(--primary)]">{totalPoints}</p>
            </div>
            <div className="card-warm p-6 animate-[fadeSlideUp_0.6s_ease-out]">
              <p className="text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                ✅ Challenges Done
              </p>
              <p className="mt-2 text-3xl sm:text-4xl font-heading font-bold text-[var(--text-dark)] tabular-nums">
                {completedCount}{" "}
                <span className="text-lg sm:text-xl text-[var(--text-muted)] font-medium">of 9</span>
              </p>
            </div>
            <div className="card-warm p-6 animate-[fadeSlideUp_0.7s_ease-out]">
              <p className="text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                ⚡ Points Available
              </p>
              <p className="mt-2 text-3xl sm:text-4xl font-heading font-bold text-[var(--text-dark)] tabular-nums">
                {pointsRemaining}
              </p>
            </div>
          </section>

          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[var(--card-border)] bg-white px-4 py-3 shadow-sm">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              View status and proof for all nine challenges in one place.
            </p>
            <Link
              href="/submissions"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 shrink-0"
            >
              My Submissions →
            </Link>
          </div>

          {/* CHALLENGE GRID */}
          <section>
            <ChallengeBoard
              challenges={CHALLENGES}
              submissions={submissions}
              setSubmissions={setSubmissions}
              session={session}
            />
          </section>
        </div>
      </main>
    </StudentAppShell>
  );
}
