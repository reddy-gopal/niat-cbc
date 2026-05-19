import { redirect } from "next/navigation";
import Leaderboard from "@/components/student/Leaderboard"
import { getStudentSession } from "@/lib/session";
import type { LeaderboardEntry } from "@/types/app";
import { adminClient } from "../../../utils/supabase/admin";
import { createClient } from "../../../utils/supabase/server";
import type { StudentChallengeStatus } from "@/types/database";

export default async function LeaderboardPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: studentsData, error: studentsError } = await supabase
    .from("students")
    .select("id, full_name, team_id, total_points, sections(label), bootcamps(name), created_at")
    .eq("section_id", session.sectionId)
    .eq("bootcamp_id", session.bootcampId);

  if (studentsError) {
    console.error("[leaderboard] Students fetch failed:", studentsError);
  }

  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, leader_id, total_points")
    .eq("section_id", session.sectionId)
    .eq("bootcamp_id", session.bootcampId);

  const studentIds = (studentsData ?? []).map((row) => row.id as string);
  
  const { data: allStatusesRaw, error: statusesError } = studentIds.length
    ? await adminClient
        .from("student_challenge_status")
        .select("*")
        .in("student_id", studentIds)
    : { data: [], error: null };

  if (statusesError) {
    console.error("[leaderboard] Challenge status fetch failed:", statusesError);
  }

  const allStatuses = (allStatusesRaw ?? []) as StudentChallengeStatus[];
  const completedChallengesMap = new Map<string, number>();

  for (const status of allStatuses) {
    if (status.is_completed) {
      const studentId = status.student_id;
      completedChallengesMap.set(studentId, (completedChallengesMap.get(studentId) || 0) + 1);
    }
  }

  const entries: LeaderboardEntry[] = (studentsData ?? [])
    .map((row) => {
      const completedChallenges = completedChallengesMap.get(row.id as string) ?? 0;
      const totalPoints = (row as any).total_points ?? 0;
      return {
        rank: 0,
        studentId: row.id as string,
        fullName: row.full_name as string,
        totalPoints: totalPoints,
        completedChallenges: completedChallenges,
        createdAt: row.created_at,
      };
    })
    // Sort by points (DESC), then by createdAt (ASC - earlier join wins ties)
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  // --- AUDIT FIX: Use teams.total_points directly ---
  const teamEntries = (teamsData || [])
    .map((t) => {
      const members = (studentsData || [])
        .filter((s) => s.team_id === t.id)
        .map((s) => s.full_name as string)
        .sort();
      
      const memberCount = members.length;
      const totalPoints = t.total_points ?? 0;

      return {
        rank: 0,
        teamId: t.id,
        name: t.name,
        leaderName: "",
        totalPoints: totalPoints,
        memberCount: memberCount,
        members: members,
        averagePoints: memberCount > 0 ? totalPoints / memberCount : 0,
      };
    })
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
