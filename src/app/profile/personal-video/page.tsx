import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/session";
import { createClient } from "../../../../utils/supabase/server";
import PersonalVideoClient from "@/components/student/PersonalVideoClient";

export default async function PersonalVideoPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  const supabase = await createClient();
  
  // Fetch if the student has already uploaded a personalization photo and their total points
  const [submissionRes, studentRes] = await Promise.all([
    supabase
      .from("submissions")
      .select("file_url, status")
      .eq("student_id", session.studentId)
      .eq("task_id", 7)
      .maybeSingle(),
    supabase
      .from("students")
      .select("total_points")
      .eq("id", session.studentId)
      .single()
  ]);

  const submission = submissionRes.data;
  const totalPoints = studentRes.data?.total_points || 0;

  let signedUrl = null;
  if (submission?.status === "accepted" && submission.file_url) {
    const { data: signedData } = await supabase.storage
      .from("images")
      .createSignedUrl(submission.file_url, 3600); // 1 hour
    signedUrl = signedData?.signedUrl ?? null;
  }

  return (
    <PersonalVideoClient
      session={session}
      initialFileUrl={signedUrl}
      totalPoints={totalPoints}
    />
  );
}
