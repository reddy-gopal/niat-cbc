import { redirect } from "next/navigation";
import Dashboard from "@/components/student/Dashboard";
import { getStudentSession } from "@/lib/session";
import type { Submission, Student } from "@/types/database";
import { createClient } from "../../../utils/supabase/server";

type StudentWithContext = Student & {
  sections: { label: string } | null;
  bootcamps: { name: string; date: string } | null;
  regions: { name: string } | null;
};

export default async function DashboardPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/invalid");
  }

  const supabase = await createClient();

  const { data: studentData } = await supabase
    .from("students")
    .select(
      `
      *,
      sections:section_id (label),
      bootcamps:bootcamp_id (name, date),
      regions:region_id (name)
    `
    )
    .eq("id", session.studentId)
    .maybeSingle();

  const student = studentData as StudentWithContext | null;
  if (!student || !student.sections || !student.bootcamps || !student.regions) {
    redirect("/invalid");
  }

  const { data: submissionsData } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", session.studentId)
    .order("task_id", { ascending: true });

  const submissions = (submissionsData ?? []) as Submission[];

  const totalPoints = submissions
    .filter((item) => item.status === "accepted")
    .reduce((sum, item) => sum + item.points, 0);
  const completedCount = submissions.filter(
    (item) => item.status === "accepted"
  ).length;

  return (
    <Dashboard
      student={student}
      submissions={submissions}
      totalPoints={totalPoints}
      completedCount={completedCount}
      session={session}
    />
  );
}
