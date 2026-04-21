import { NextResponse } from "next/server";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../../utils/supabase/admin";

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

    const { data: submission, error } = await adminClient
      .from("submissions")
      .select("id, student_id, file_url")
      .eq("id", id)
      .maybeSingle();

    if (error || !submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found." },
        { status: 404 }
      );
    }

    if (submission.student_id !== session.studentId) {
      return NextResponse.json(
        { success: false, error: "You are not authorized." },
        { status: 403 }
      );
    }

    if (!submission.file_url) {
      return NextResponse.json(
        { success: false, error: "Submission image not found." },
        { status: 400 }
      );
    }

    const { data, error: signedError } = await adminClient.storage
      .from("submissions")
      .createSignedUrl(submission.file_url, 60);

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
