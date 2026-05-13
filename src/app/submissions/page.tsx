import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getStudentSession } from "@/lib/session";
import { adminClient } from "../../../utils/supabase/admin";

import SubmissionsClient from "@/components/submissions/SubmissionsClient";

export default async function SubmissionsPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  const supabase = adminClient;
  
  // 1. Fetch submission attempts for all tasks except task 3
  const { data: attempts, error: attemptsError } = await supabase
    .from("submission_attempts")
    .select("*")
    .eq("student_id", session.studentId)
    .order("created_at", { ascending: false });

  // 2. Fetch submissions for referral task (task_id=3)
  const { data: referrals, error: referralsError } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", session.studentId)
    .eq("task_id", 3)
    .eq("bootcamp_id", session.bootcampId)
    .order("created_at", { ascending: false });

  if (attemptsError || referralsError) {
    console.error("[submissions] data fetch failed:", { attemptsError, referralsError });
  }

  // Combine and sort by date
  const allAttempts = [
    ...(attempts ?? []),
    ...(referrals ?? []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Fetch signed URLs for all images
  const imagePaths = allAttempts
    .map((a) => a.file_url)
    .filter((url): url is string => Boolean(url));
  
  const signedUrls: Record<string, string> = {};
  if (imagePaths.length > 0) {
    const { data: signedData } = await adminClient.storage
      .from("submissions")
      .createSignedUrls(imagePaths, 3600);
    
    signedData?.forEach((item) => {
      if (item.path && item.signedUrl) {
        signedUrls[item.path] = item.signedUrl;
      }
    });
  }

  return (
    <SubmissionsClient 
      session={session} 
      initialAttempts={allAttempts as any[]} 
      initialSignedUrls={signedUrls}
    />
  );
}
