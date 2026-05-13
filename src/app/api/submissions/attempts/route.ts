import { NextResponse } from "next/server";
import { CHALLENGES } from "@/lib/challenges";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../utils/supabase/admin";
import type { SafeAttempt } from "@/types/database";

const VALID_TASK_IDS = CHALLENGES.map((challenge) => challenge.id);

type AttemptRow = {
  id: string;
  submission_id: string;
  student_id: string;
  task_id: number;
  bootcamp_id: string;
  attempt_number: number;
  status: string;
  ai_reason: string | null;
  text_response: string | null;
  points: number;
  verified_at: string | null;
  created_at: string;
  file_url: string | null;
  verification_attempts: number;
  last_attempted_at: string | null;
};

export async function GET(request: Request) {
  try {
    const { student: session } = await getStudentFromRequest(request);
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
        "id, submission_id, student_id, task_id, bootcamp_id, attempt_number, status, ai_reason, text_response, points, verified_at, created_at, file_url, verification_attempts, last_attempted_at"
      )
      .eq("student_id", session.studentId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (taskIdParam !== null && taskIdParam !== "") {
      const taskId = Number(taskIdParam);
      if (Number.isInteger(taskId) && VALID_TASK_IDS.includes(taskId)) {
        query = query.eq("task_id", taskId);
      }
    }

    const { data: attemptsData, error: attemptsError } = await query;

    let referrals: any[] = [];
    if (taskIdParam === null || taskIdParam === "3") {
      const { data: referralData, error: referralError } = await adminClient
        .from("submissions")
        .select("*")
        .eq("student_id", session.studentId)
        .eq("task_id", 3)
        .limit(limit);
      
      if (!referralError) referrals = referralData ?? [];
    }

    if (attemptsError) {
      return NextResponse.json(
        { success: false, error: "Unable to fetch attempts." },
        { status: 500 }
      );
    }

    const combined = [
      ...((attemptsData ?? []) as AttemptRow[]),
      ...referrals,
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
     .slice(0, limit);

    const attempts = combined.map((a) => ({
      id: a.id,
      submission_id: a.submission_id ?? a.id,
      student_id: a.student_id,
      task_id: a.task_id,
      bootcamp_id: a.bootcamp_id,
      attempt_number: a.attempt_number ?? 1,
      status: a.status as SafeAttempt["status"],
      ai_reason: a.ai_reason,
      text_response: a.text_response,
      points: a.points,
      verified_at: a.verified_at,
      created_at: a.created_at,
      verification_attempts: a.verification_attempts ?? 0,
      last_attempted_at: a.last_attempted_at ?? null,
      file_url: a.file_url,
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
