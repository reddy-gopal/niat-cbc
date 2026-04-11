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
    .select("id, full_name, submissions(points, status), sections(label), bootcamps(name)")
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

  const sectionLabel = (studentsData?.[0]?.sections as { label?: string } | null)?.label ?? "";
  const bootcampName = (studentsData?.[0]?.bootcamps as { name?: string } | null)?.name ?? "";

  const firstName = session.fullName.split(" ")[0] ?? session.fullName;

  return (
    <Leaderboard
      entries={entries}
      currentStudentId={session.studentId}
      sectionLabel={sectionLabel}
      bootcampName={bootcampName}
      firstName={firstName}
    />
  );
}
