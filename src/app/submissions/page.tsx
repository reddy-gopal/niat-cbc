import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getStudentSession } from "@/lib/session";
import { adminClient } from "../../../utils/supabase/admin";
import type { SafeAttempt } from "@/types/database";

const SubmissionsClient = dynamic(() => import("@/components/submissions/SubmissionsClient"));

type AttemptRow = {
  id: string;
  submission_id: string;
  student_id: string;
  task_id: number;
  bootcamp_id: string;
  attempt_number: number;
  status: string;
  ai_reason: string | null;
  points: number;
  verified_at: string | null;
  created_at: string;
  file_url: string | null;
  verification_attempts: number;
  last_attempted_at: string | null;
};

export default async function SubmissionsPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/invalid");
  }

  const { data: rows, error } = await adminClient
    .from("submission_attempts")
    .select(
      "id, submission_id, student_id, task_id, bootcamp_id, attempt_number, status, ai_reason, points, verified_at, created_at, file_url, verification_attempts, last_attempted_at"
    )
    .eq("student_id", session.studentId)
    .order("created_at", { ascending: false });

  const rawRows = (error ? [] : (rows ?? [])) as AttemptRow[];
  const safeAttempts: SafeAttempt[] = rawRows.map((a) => ({
    id: a.id,
    submission_id: a.submission_id,
    student_id: a.student_id,
    task_id: a.task_id,
    bootcamp_id: a.bootcamp_id,
    attempt_number: a.attempt_number,
    status: a.status as SafeAttempt["status"],
    ai_reason: a.ai_reason,
    points: a.points,
    verified_at: a.verified_at,
    created_at: a.created_at,
    verification_attempts: a.verification_attempts,
    last_attempted_at: a.last_attempted_at,
    hasProof: Boolean(a.file_url),
  }));

  return <SubmissionsClient session={session} initialAttempts={safeAttempts} />;
}
