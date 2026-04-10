import { NextResponse } from "next/server";
import { verifyStudentSession } from "@/lib/session";
import { adminClient } from "../../../../../utils/supabase/admin";

function getCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";").map((item) => item.trim());
  const match = pairs.find((item) => item.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.slice(key.length + 1)) : null;
}

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

    const submissionId = new URL(request.url).searchParams.get("submissionId");
    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: "submissionId is required." },
        { status: 400 }
      );
    }

    const { data: submission, error } = await adminClient
      .from("submissions")
      .select("id, student_id, status, points, ai_reason")
      .eq("id", submissionId)
      .maybeSingle();

    if (error || !submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found." },
        { status: 400 }
      );
    }

    if (submission.student_id !== session.studentId) {
      return NextResponse.json(
        { success: false, error: "You are not authorized." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          status: submission.status,
          points: submission.points,
          aiReason: submission.ai_reason,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to fetch submission status right now." },
      { status: 500 }
    );
  }
}
