import { NextResponse } from "next/server";
import { verifyStudentSession } from "@/lib/session";
import { adminClient } from "../../../../../utils/supabase/admin";

function getCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";").map((item) => item.trim());
  const match = pairs.find((item) => item.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.slice(key.length + 1)) : null;
}

export async function POST(request: Request) {
  try {
    const token = getCookieValue(request.headers.get("cookie"), "cbc_student");
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyStudentSession(token);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const taskId = Number(formData.get("taskId"));
    const file = formData.get("file");

    if (!Number.isInteger(taskId) || taskId < 1 || taskId > 9) {
      return NextResponse.json(
        { success: false, error: "Invalid task ID." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "File is required." }, { status: 400 });
    }
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only PNG and JPG images are allowed." },
        { status: 400 }
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size must be 10MB or less." },
        { status: 400 }
      );
    }

    const { data: submission, error: submissionError } = await adminClient
      .from("submissions")
      .select("*")
      .eq("student_id", session.studentId)
      .eq("task_id", taskId)
      .maybeSingle();

    if (submissionError || !submission) {
      return NextResponse.json(
        { success: false, error: "Submission record not found." },
        { status: 400 }
      );
    }

    if (submission.resubmit_count >= 3) {
      return NextResponse.json(
        { success: false, error: "Maximum attempts reached." },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = file.type === "image/png" ? "png" : "jpg";
    const storagePath = `${session.bootcampId}/${session.studentId}/${taskId}-${Date.now()}.${extension}`;

    const { error: uploadError } = await adminClient.storage
      .from("submissions")
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: "Failed to upload file." },
        { status: 500 }
      );
    }

    const { error: updateError } = await adminClient
      .from("submissions")
      .update({
        status: "pending",
        file_url: storagePath,
        resubmit_count: submission.resubmit_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Failed to update submission." },
        { status: 500 }
      );
    }

    const origin = new URL(request.url).origin;
    void fetch(`${origin}/api/submissions/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: submission.id }),
    }).catch(() => {});

    return NextResponse.json(
      { success: true, data: { submissionId: submission.id } },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid submission payload." },
      { status: 400 }
    );
  }
}
