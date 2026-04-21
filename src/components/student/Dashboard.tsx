"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CHALLENGES } from "@/lib/challenges";
import type { StudentSession } from "@/types/app";
import type { Submission, Student } from "@/types/database";
import ChallengeBoard from "../challenges/ChallengeBoard";
import { StudentAppShell } from "./StudentAppShell";
import { studentMainTopPaddingClass } from "./StudentNavbar";
import { motion, AnimatePresence } from "framer-motion";

type StudentWithContext = Student & {
  sections: { label: string } | null;
  bootcamps: { name: string; date: string } | null;
  regions: { name: string } | null;
  teams: { name: string; invite_code: string; leader_id: string } | null;
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
  const [isHoveringChart, setIsHoveringChart] = useState(false);

  const firstName = session.fullName.split(" ")[0] ?? session.fullName;
  const leaderInvite = useMemo(() => {
    if (!student.teams) return null;
    if (student.teams.leader_id !== student.id) return null;
    return {
      teamName: student.teams.name,
      inviteCode: student.teams.invite_code,
    };
  }, [student.id, student.teams]);

  const totalPoints = useMemo(
    () =>
      submissions
        .filter((item) => item.status === "accepted")
        .reduce((sum, item) => sum + item.points, 0),
    [submissions]
  );

  const completedCount = useMemo(() => {
    const validChallengeIds = new Set(CHALLENGES.map((challenge) => challenge.id));
    const acceptedTaskIds = new Set(
      submissions
        .filter(
          (item) =>
            item.status === "accepted" &&
            item.task_id != null &&
            validChallengeIds.has(item.task_id)
        )
        .map((item) => item.task_id)
    );

    return Math.min(CHALLENGES.length, acceptedTaskIds.size);
  }, [submissions]);

  const totalChallenges = CHALLENGES.length;

  const maxPoints = useMemo(
    () => CHALLENGES.reduce((sum, c) => sum + c.points, 0),
    []
  );

  /** Referral link uses names (not UUIDs); merge from loaded student context. */
  const sessionWithReferralContext = useMemo(
    () => ({
      ...session,
      bootcampName: student.bootcamps?.name,
      sectionLabel: [student.regions?.name, student.sections?.label]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join(" "),
    }),
    [
      session,
      student.bootcamps?.name,
      student.regions?.name,
      student.sections?.label,
    ]
  );

  const getSubTitle = () => {
    if (completedCount === 0) return "🎯 Start your journey. Your first challenge awaits!";
    if (completedCount < totalChallenges)
      return `⚡ Great progress! Just ${totalChallenges - completedCount} more to complete all challenges.`;
    return "🏆 LEGEND. You've conquered every challenge in the championship!";
  };

  return (
    <StudentAppShell firstName={firstName}>
      <main className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] pb-8 md:pb-20">
        {/* HERO BANNER */}
        <section
          className={`${studentMainTopPaddingClass} bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] text-white overflow-hidden`}
        >
          <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 flex flex-col md:flex-row items-center justify-between gap-8 relative">
            <div className="flex-1 animate-[fadeSlideUp_0.4s_ease-out] relative z-10 w-full md:w-auto">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-white/20 uppercase tracking-widest">
                Section {student.sections?.label} • {student.regions?.name}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black mb-4 leading-tight tracking-tighter">
                Hi {session.fullName}! 👋
              </h1>
              <p className="text-white/70 text-sm sm:text-base font-medium mb-8 max-w-xl">
                 {getSubTitle()}
              </p>
              
              <div className="flex gap-4">
                 <div className="bg-black/20 backdrop-blur-sm border border-white/10 p-4 rounded-2xl flex flex-col min-w-[120px]">
                    <span className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-1">Total Score</span>
                    <span className="text-3xl font-heading font-black text-[var(--yellow)]">{totalPoints}</span>
                 </div>
                 <div className="bg-black/20 backdrop-blur-sm border border-white/10 p-4 rounded-2xl flex flex-col min-w-[120px]">
                    <span className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-1">Status</span>
                    <span className="text-sm font-black uppercase text-white/90 mt-2">
                       {completedCount === totalChallenges ? "LEGEND" : "EVOLVING"}
                    </span>
                 </div>
              </div>
            </div>

            {/* INFOGRAPHIC SECTION */}
            <div 
               className="relative hidden md:flex w-64 h-64 sm:w-80 sm:h-80 items-center justify-center shrink-0"
               onMouseEnter={() => setIsHoveringChart(true)}
               onMouseLeave={() => setIsHoveringChart(false)}
            >
               {/* Ambient Circular Glow */}
               <div className="absolute inset-4 rounded-full border border-white/5 bg-white/5 backdrop-blur-3xl -z-10" />
               
               {/* CUSTOM SVG METER */}
               <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Progress Ring (Animated) */}
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f7b801"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="transparent"
                    initial={{ pathLength: 0 }}
                    animate={{ 
                      pathLength: isHoveringChart ? Math.min(1, totalPoints / (maxPoints || 1)) : 0 
                    }}
                    transition={{ duration: 1.2, ease: "circOut" }}
                    style={{ 
                      filter: "drop-shadow(0 0 8px rgba(247,184,1,0.5))"
                    }}
                  />
               </svg>

               <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <AnimatePresence mode="wait">
                    {isHoveringChart ? (
                      <motion.div 
                        key="challenges"
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="flex flex-col items-center"
                      >
                         <span className="text-5xl font-heading font-black text-[#f7b801]">{completedCount}/{totalChallenges}</span>
                         <span className="block text-[10px] font-black uppercase text-white/50 tracking-[0.2em] mt-2">Challenges Done</span>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="points"
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="flex flex-col items-center"
                      >
                         <span className="text-6xl font-heading font-black text-white">{totalPoints}</span>
                         <span className="block text-[10px] font-black uppercase text-white/50 tracking-[0.2em] mt-2">Points Received</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 mt-8 relative z-20">
          
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-[var(--card-border)] bg-white px-6 py-4 shadow-sm">
            <p className="text-sm font-bold text-[var(--text-secondary)]">
              Manage your progress, invite tribe members, and verify your mission outcomes.
            </p>
            <div className="flex w-full sm:w-auto gap-3 shrink-0">
              {leaderInvite && (
                <Link
                  href="/invite"
                  className="inline-flex flex-1 sm:flex-none items-center justify-center rounded-xl bg-[var(--teal)] px-6 py-3 text-sm font-black uppercase text-white shadow-md transition hover:brightness-95 active:scale-95"
                >
                  Invite Tribe
                </Link>
              )}
              <Link
                href="/submissions"
                className="inline-flex flex-1 sm:flex-none items-center justify-center rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-black uppercase text-white shadow-md transition hover:brightness-95 active:scale-95"
              >
                Track Proof
              </Link>
            </div>
          </div>

          {/* CHALLENGE GRID */}
          <section>
            <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-[var(--card-border)]" />
                <h2 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-[0.3em]">Challenge Board</h2>
                <div className="h-px flex-1 bg-[var(--card-border)]" />
            </div>
            <ChallengeBoard
              challenges={CHALLENGES}
              submissions={submissions}
              setSubmissions={setSubmissions}
              session={sessionWithReferralContext}
            />
          </section>
        </div>
      </main>
    </StudentAppShell>
  );
}
