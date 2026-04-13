import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getStudentSession } from "@/lib/session";
import type { Submission, Student } from "@/types/database";
import { createClient } from "../../../utils/supabase/server";

type StudentWithContext = Student & {
  sections: { label: string } | null;
  bootcamps: { name: string; date: string } | null;
  regions: { name: string } | null;
  teams: { name: string; invite_code: string; leader_id: string } | null;
};

const Dashboard = dynamic(() => import("@/components/student/Dashboard"));

export default async function DashboardPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  const supabase = await createClient();

  const [studentResponse, submissionsResponse] = await Promise.all([
    supabase
      .from("students")
      .select(
        `
        id,
        full_name,
        mobile,
        section_id,
        bootcamp_id,
        region_id,
        created_at,
        team_id,
        sections:section_id (label),
        bootcamps:bootcamp_id (name, date),
        regions:region_id (name),
        teams:team_id (name, invite_code, leader_id)
      `
      )
      .eq("id", session.studentId)
      .maybeSingle(),
    supabase
      .from("submissions")
      .select(
        "id,student_id,bootcamp_id,section_id,region_id,task_id,streak_day,file_url,status,points,ai_reason,resubmit_count,verification_attempts,last_attempted_at,verified_at,override_by,override_note,created_at,updated_at"
      )
      .eq("student_id", session.studentId)
      .order("task_id", { ascending: true }),
  ]);

  const student = studentResponse.data as StudentWithContext | null;
  if (!student || !student.sections || !student.bootcamps || !student.regions) {
    redirect("/invalid");
  }

  const submissions = (submissionsResponse.data ?? []) as Submission[];

  return (
    <Dashboard
      student={student}
      submissions={submissions}
      session={session}
    />
  );
}
