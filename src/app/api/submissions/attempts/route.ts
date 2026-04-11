import { NextResponse } from "next/server";
import { verifyStudentSession } from "@/lib/session";
import { adminClient } from "../../../../../utils/supabase/admin";
import type { SafeAttempt } from "@/types/database";

function getCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";").map((item) => item.trim());
  const match = pairs.find((item) => item.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.slice(key.length + 1)) : null;
}

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

export async function GET(request: Request) {
  try {
    const token = getCookieValue(request.headers.get("cookie"), "cbc_student");
    if (!token) {
      return NextResponse.json(
        { success: false, error: "You are not authorized." },
        { status: 401 }
      );
    }

    const session = await verifyStudentSession(token);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "You are not authorized." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const taskIdParam = url.searchParams.get("taskId");
    const limitParam = url.searchParams.get("limit");

    let limit = 50;
    if (limitParam !== null) {
      const n = Number(limitParam);
      if (Number.isFinite(n) && n > 0) {
        limit = Math.min(100, Math.floor(n));
      }
    }

    let query = adminClient
      .from("submission_attempts")
      .select(
        "id, submission_id, student_id, task_id, bootcamp_id, attempt_number, status, ai_reason, points, verified_at, created_at, file_url, verification_attempts, last_attempted_at"
      )
      .eq("student_id", session.studentId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (taskIdParam !== null && taskIdParam !== "") {
      const taskId = Number(taskIdParam);
      if (Number.isInteger(taskId) && taskId >= 1 && taskId <= 9) {
        query = query.eq("task_id", taskId);
      }
    }

    const { data: rows, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to fetch attempts." },
        { status: 500 }
      );
    }

    const attempts: SafeAttempt[] = ((rows ?? []) as AttemptRow[]).map((a) => ({
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

    return NextResponse.json(
      {
        success: true,
        data: { attempts },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to fetch attempts right now." },
      { status: 500 }
    );
  }
}
