import { redirect } from "next/navigation";
import Leaderboard from "@/components/student/Leaderboard"
import { getStudentSession } from "@/lib/session";
import type { LeaderboardEntry } from "@/types/app";
import { adminClient } from "../../../utils/supabase/admin";
import { createClient } from "../../../utils/supabase/server";

const COMPLETED_ATTEMPT_STATUSES = new Set(["accepted", "approved"]);
const REFERRAL_CHALLENGE_ID = 3;

export default async function LeaderboardPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: studentsData } = await supabase
    .from("students")
    .select("id, full_name, team_id, sections(label), bootcamps(name)")
    .eq("section_id", session.sectionId);

  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, leader_id")
    .eq("section_id", session.sectionId);

  const studentIds = (studentsData ?? []).map((row) => row.id as string);
  const { data: allAttemptsRaw, error: attemptsError } = studentIds.length
    ? await adminClient
        .from("submission_attempts")
        .select("student_id, task_id, points, status")
        .in("student_id", studentIds)
        .not("points", "is", null)
    : { data: [], error: null };
  const { data: referralSubmissionsRaw, error: referralSubmissionsError } = studentIds.length
    ? await adminClient
        .from("submissions")
        .select("student_id, task_id, points, status, created_at, updated_at")
        .in("student_id", studentIds)
        .eq("task_id", REFERRAL_CHALLENGE_ID)
    : { data: [], error: null };

  if (attemptsError || referralSubmissionsError) {
    console.error("[leaderboard] Score fetch failed:", {
      attemptsError,
      referralSubmissionsError,
    });
  }

  const allAttempts =
    ((allAttemptsRaw as Array<{
      student_id: string | null;
      task_id: number | string | null;
      points: number | string | null;
      status: string | null;
    }> | null) ?? [])
      .filter((attempt) => Number(attempt.task_id) !== REFERRAL_CHALLENGE_ID)
      .filter((attempt) =>
      COMPLETED_ATTEMPT_STATUSES.has(String(attempt.status ?? "").trim().toLowerCase())
    );
  const referralSubmissions = ((referralSubmissionsRaw as Array<{
    student_id: string | null;
    task_id: number | string | null;
    points: number | string | null;
    created_at?: string | null;
    updated_at?: string | null;
    status: string | null;
  }> | null) ?? []);

  const scoreMap = new Map<string, { totalPoints: number; completedChallenges: number }>();
  for (const attempt of allAttempts ?? []) {
    const studentId = String(attempt.student_id ?? "");
    if (!studentId) continue;
    if (!scoreMap.has(studentId)) {
      scoreMap.set(studentId, { totalPoints: 0, completedChallenges: 0 });
    }
    const entry = scoreMap.get(studentId)!;
    entry.totalPoints += Number(attempt.points ?? 0) || 0;
  }

  const taskMap = new Map<string, Set<number>>();
  for (const attempt of allAttempts ?? []) {
    const studentId = String(attempt.student_id ?? "");
    if (!studentId) continue;
    if (!taskMap.has(studentId)) taskMap.set(studentId, new Set<number>());
    const taskId = Number(attempt.task_id);
    if (Number.isFinite(taskId)) {
      taskMap.get(studentId)!.add(taskId);
    }
  }
  for (const [studentId, tasks] of taskMap) {
    if (!scoreMap.has(studentId)) {
      scoreMap.set(studentId, { totalPoints: 0, completedChallenges: 0 });
    }
    scoreMap.get(studentId)!.completedChallenges = tasks.size;
  }
  const latestReferralByStudent = new Map<string, (typeof referralSubmissions)[number]>();
  for (const row of referralSubmissions) {
    const studentId = String(row.student_id ?? "");
    if (!studentId) continue;
    const prev = latestReferralByStudent.get(studentId);
    if (!prev) {
      latestReferralByStudent.set(studentId, row);
      continue;
    }
    const prevTime = new Date(prev.updated_at ?? prev.created_at ?? 0).getTime();
    const rowTime = new Date(row.updated_at ?? row.created_at ?? 0).getTime();
    if (rowTime >= prevTime) {
      latestReferralByStudent.set(studentId, row);
    }
  }
  for (const [studentId, row] of latestReferralByStudent) {
    if (!COMPLETED_ATTEMPT_STATUSES.has(String(row.status ?? "").trim().toLowerCase())) {
      continue;
    }
    if (!scoreMap.has(studentId)) {
      scoreMap.set(studentId, { totalPoints: 0, completedChallenges: 0 });
    }
    const entry = scoreMap.get(studentId)!;
    entry.totalPoints += Number(row.points ?? 0) || 0;
    entry.completedChallenges += 1;
  }

  const entries: LeaderboardEntry[] = (studentsData ?? [])
    .map((row) => {
      const score = scoreMap.get(row.id as string) ?? {
        totalPoints: 0,
        completedChallenges: 0,
      };
      return {
        rank: 0,
        studentId: row.id as string,
        fullName: row.full_name as string,
        totalPoints: score.totalPoints,
        completedChallenges: score.completedChallenges,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  // Calculate Team Entries
  const teamMap = new Map<string, { totalPoints: number; memberCount: number; members: string[]; leaderId: string; name: string }>();
  
  (teamsData || []).forEach(t => {
    teamMap.set(t.id, { totalPoints: 0, memberCount: 0, members: [], leaderId: t.leader_id, name: t.name });
  });

  (studentsData || []).forEach(s => {
    if (s.team_id && teamMap.has(s.team_id)) {
      const team = teamMap.get(s.team_id)!;
      const score = scoreMap.get(s.id as string) ?? { totalPoints: 0, completedChallenges: 0 };
      team.totalPoints += score.totalPoints;
      team.memberCount += 1;
      team.members.push(s.full_name);
    }
  });

  const teamEntries = Array.from(teamMap.entries())
    .map(([id, data]) => ({
      rank: 0,
      teamId: id,
      name: data.name,
      leaderName: "", // We can identify this from members list or another fetch, but using member display instead.
      totalPoints: data.totalPoints,
      memberCount: data.memberCount,
      members: data.members.sort(),
      averagePoints: data.memberCount > 0 ? data.totalPoints / data.memberCount : 0,
    }))
    .filter(t => t.memberCount > 0)
    .sort((a, b) => b.averagePoints - a.averagePoints)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const currentStudent = (studentsData || []).find(s => s.id === session.studentId);
  const currentTeamId = currentStudent?.team_id || undefined;

  const sectionLabel = (studentsData?.[0]?.sections as any)?.label ?? "";
  const bootcampName = (studentsData?.[0]?.bootcamps as any)?.name ?? "";

  const firstName = session.fullName.split(" ")[0] ?? session.fullName;

  return (
    <Leaderboard
      individualEntries={entries}
      teamEntries={teamEntries as any}
      currentStudentId={session.studentId}
      currentTeamId={currentTeamId}
      sectionLabel={sectionLabel}
      bootcampName={bootcampName}
      firstName={firstName}
    />
  );
}
