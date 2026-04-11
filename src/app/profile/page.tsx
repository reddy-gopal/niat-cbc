import { redirect } from "next/navigation";
import ProfileClient from "@/components/student/ProfileClient";
import { getStudentSession } from "@/lib/session";
import { createClient } from "../../../utils/supabase/server";
import type { Student } from "@/types/database";

type StudentWithContext = Student & {
  sections: { label: string } | null;
  bootcamps: { name: string; date: string } | null;
  regions: { name: string } | null;
};

export default async function ProfilePage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  const supabase = await createClient();

  // We fetch student details to ensure we have the latest mobile number directly from DB
  const { data: studentData } = await supabase
    .from("students")
    .select(`
      *,
      sections:section_id (label),
      bootcamps:bootcamp_id (name, date),
      regions:region_id (name)
    `)
    .eq("id", session.studentId)
    .maybeSingle();

  if (!studentData) {
    redirect("/invalid");
  }

  return (
    <ProfileClient
      session={session}
      student={studentData as StudentWithContext}
    />
  );
}
