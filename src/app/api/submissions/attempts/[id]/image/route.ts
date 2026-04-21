import { NextResponse } from "next/server";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../../../utils/supabase/admin";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { student: session } = await getStudentFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "You are not authorized." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const { data: attempt, error } = await adminClient
      .from("submission_attempts")
      .select("id, student_id, file_url")
      .eq("id", id)
      .maybeSingle();

    if (error || !attempt) {
      return NextResponse.json(
        { success: false, error: "Attempt not found." },
        { status: 404 }
      );
    }

    if (attempt.student_id !== session.studentId) {
      return NextResponse.json(
        { success: false, error: "You are not authorized." },
        { status: 403 }
      );
    }

    if (!attempt.file_url) {
      return NextResponse.json(
        { success: false, error: "No image for this attempt." },
        { status: 400 }
      );
    }

    const { data, error: signedError } = await adminClient.storage
      .from("submissions")
      .createSignedUrl(attempt.file_url, 60);

    if (signedError || !data?.signedUrl) {
      return NextResponse.json(
        { success: false, error: "Unable to load submission image right now." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { signedUrl: data.signedUrl },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to load submission image right now." },
      { status: 500 }
    );
  }
}
