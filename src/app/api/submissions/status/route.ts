import { NextResponse } from "next/server";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../utils/supabase/admin";

export async function GET(request: Request) {
  try {
    const { student: session } = await getStudentFromRequest(request);
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
      .select("id, student_id, status, points, ai_reason, verified_at")
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
          verifiedAt: submission.verified_at,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to fetch submission status right now." },
      { status: 500 }
    );
  }
}
