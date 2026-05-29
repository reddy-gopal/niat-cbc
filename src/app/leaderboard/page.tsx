import { redirect } from "next/navigation";
import Leaderboard from "@/components/student/Leaderboard";
import {
  buildCompletedChallengesMap,
  buildIndividualLeaderboard,
  buildOverallLeaderboard,
  mapStudentRowToLeaderboardEntry,
  type StudentRow,
} from "@/lib/leaderboard";
import { getStudentSession } from "@/lib/session";
import type { TeamLeaderboardEntry } from "@/types/app";
import { adminClient } from "../../../utils/supabase/admin";
import { createClient } from "../../../utils/supabase/server";
import type { StudentChallengeStatus } from "@/types/database";

const OVERALL_TOP_LIMIT = 10;
const STUDENT_SELECT =
  "id, full_name, team_id, total_points, regions(name), bootcamps(name), sections(label), created_at";

function mapStudentRows(rows: unknown[]): StudentRow[] {
  return rows.map((row) => {
    const student = row as Record<string, unknown>;
    return {
      id: student.id as string,
      full_name: student.full_name as string,
      total_points: (student.total_points as number | null) ?? 0,
      created_at: student.created_at as string | null | undefined,
      sections: student.sections as StudentRow["sections"],
      bootcamps: student.bootcamps as StudentRow["bootcamps"],
      regions: student.regions as StudentRow["regions"],
    };
  });
}

async function computeGlobalRank(studentId: string, totalPoints: number): Promise<number> {
  const { count, error } = await adminClient
    .from("students")
    .select("id", { count: "exact", head: true })
    .gt("total_points", totalPoints);

  if (error) {
    console.error("[leaderboard] Global rank count failed:", error);
    return 0;
  }

  return (count ?? 0) + 1;
}

export default async function LeaderboardPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  const supabase = await createClient();

  const [
    { data: sectionStudentsData, error: sectionStudentsError },
    { data: overallTopStudentsData, error: overallStudentsError },
    { data: currentStudentData, error: currentStudentError },
    { data: teamsData },
  ] = await Promise.all([
    supabase
      .from("students")
      .select(STUDENT_SELECT)
      .eq("section_id", session.sectionId)
      .eq("bootcamp_id", session.bootcampId),
    adminClient
      .from("students")
      .select(STUDENT_SELECT)
      .order("total_points", { ascending: false })
      .limit(OVERALL_TOP_LIMIT),
    adminClient.from("students").select(STUDENT_SELECT).eq("id", session.studentId).maybeSingle(),
    supabase
      .from("teams")
      .select("id, name, leader_id, total_points")
      .eq("section_id", session.sectionId)
      .eq("bootcamp_id", session.bootcampId),
  ]);

  if (sectionStudentsError) {
    console.error("[leaderboard] Section students fetch failed:", sectionStudentsError);
  }
  if (overallStudentsError) {
    console.error("[leaderboard] Overall students fetch failed:", overallStudentsError);
  }
  if (currentStudentError) {
    console.error("[leaderboard] Current student fetch failed:", currentStudentError);
  }

  const sectionStudentIds = (sectionStudentsData ?? []).map((row) => row.id as string);

  const { data: allStatusesRaw, error: statusesError } = sectionStudentIds.length
    ? await adminClient
        .from("student_challenge_status")
        .select("*")
        .in("student_id", sectionStudentIds)
    : { data: [], error: null };

  if (statusesError) {
    console.error("[leaderboard] Challenge status fetch failed:", statusesError);
  }

  const allStatuses = (allStatusesRaw ?? []) as StudentChallengeStatus[];
  const completedChallengesMap = buildCompletedChallengesMap(allStatuses);

  const sectionEntries = buildIndividualLeaderboard(
    mapStudentRows(sectionStudentsData ?? []),
    completedChallengesMap
  );

  const overallEntries = buildOverallLeaderboard(mapStudentRows(overallTopStudentsData ?? []));

  let currentOverallEntry = null;
  if (currentStudentData) {
    const currentRow = mapStudentRows([currentStudentData])[0];
    const inTop10 = overallEntries.find((entry) => entry.studentId === session.studentId);
    const rank =
      inTop10?.rank ??
      (await computeGlobalRank(session.studentId, currentRow.total_points ?? 0));

    currentOverallEntry = mapStudentRowToLeaderboardEntry(
      currentRow,
      rank,
      completedChallengesMap
    );
  }

  const teamEntries: TeamLeaderboardEntry[] = (teamsData || [])
    .map((t) => {
      const members = (sectionStudentsData || [])
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
        totalPoints,
        memberCount,
        members,
        averagePoints: memberCount > 0 ? totalPoints / memberCount : 0,
      };
    })
    .filter((t) => t.memberCount > 0)
    .sort((a, b) => b.averagePoints - a.averagePoints)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const currentStudent = (sectionStudentsData || []).find((s) => s.id === session.studentId);
  const currentTeamId = currentStudent?.team_id || undefined;

  const sectionLabel =
    (sectionStudentsData?.[0]?.sections as { label?: string } | null)?.label ?? "";
  const bootcampName =
    (sectionStudentsData?.[0]?.bootcamps as { name?: string } | null)?.name ?? "";

  const firstName = session.fullName.split(" ")[0] ?? session.fullName;

  return (
    <Leaderboard
      overallEntries={overallEntries}
      currentOverallEntry={currentOverallEntry}
      individualEntries={sectionEntries}
      teamEntries={teamEntries}
      currentStudentId={session.studentId}
      currentTeamId={currentTeamId}
      sectionLabel={sectionLabel}
      bootcampName={bootcampName}
      firstName={firstName}
    />
  );
}
