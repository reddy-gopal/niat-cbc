import { redirect } from "next/navigation";
import Leaderboard from "@/components/student/Leaderboard"
import { getStudentSession } from "@/lib/session";
import type { LeaderboardEntry } from "@/types/app";
import { createClient } from "../../../utils/supabase/server";

export default async function LeaderboardPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: studentsData } = await supabase
    .from("students")
    .select("id, full_name, team_id, submissions(points, status), sections(label), bootcamps(name)")
    .eq("section_id", session.sectionId);

  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, leader_id")
    .eq("section_id", session.sectionId);

  const entries: LeaderboardEntry[] = (studentsData ?? [])
    .map((row) => {
      const submissions = (row.submissions ?? []) as Array<{
        points: number;
        status: string;
      }>;
      const totalPoints = submissions.reduce((sum, sub) => sum + (sub.points ?? 0), 0);
      const completedChallenges = submissions.filter(
        (sub) => sub.status === "accepted"
      ).length;
      return {
        rank: 0,
        studentId: row.id as string,
        fullName: row.full_name as string,
        totalPoints,
        completedChallenges,
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
      const points = (s.submissions || []).reduce((sum: number, sub: any) => sum + (sub.points || 0), 0);
      team.totalPoints += points;
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
