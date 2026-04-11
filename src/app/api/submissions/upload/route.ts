import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { verifyStudentSession } from "@/lib/session";
import { adminClient } from "../../../../../utils/supabase/admin";

function getCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";").map((item) => item.trim());
  const match = pairs.find((item) => item.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.slice(key.length + 1)) : null;
}

const PLAGIARISM_REASON =
  "Submission rejected: this proof image is identical to another student's submission for this challenge. If you believe this is an error, please contact your instructor.";

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
      .select("id, resubmit_count, bootcamp_id")
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");
    const bytes = new Uint8Array(buffer);

    const { data: duplicateRow } = await adminClient
      .from("submissions")
      .select("id, student_id")
      .eq("file_hash", hash)
      .eq("task_id", taskId)
      .eq("bootcamp_id", session.bootcampId)
      .neq("student_id", session.studentId)
      .neq("status", "not_started")
      .limit(1)
      .maybeSingle();

    const isPlagiarism = Boolean(duplicateRow);

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

    const now = new Date().toISOString();
    const nextResubmit = submission.resubmit_count + 1;

    if (isPlagiarism) {
      const { error: updateError } = await adminClient
        .from("submissions")
        .update({
          status: "rejected",
          file_url: storagePath,
          file_hash: hash,
          ai_reason: PLAGIARISM_REASON,
          resubmit_count: nextResubmit,
          verification_attempts: 3,
          last_attempted_at: now,
          verified_at: now,
          updated_at: now,
        })
        .eq("id", submission.id);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: "Failed to update submission." },
          { status: 500 }
        );
      }

      const { data: attemptRow, error: attemptInsertError } = await adminClient
        .from("submission_attempts")
        .insert({
          submission_id: submission.id,
          student_id: session.studentId,
          task_id: taskId,
          bootcamp_id: submission.bootcamp_id,
          attempt_number: nextResubmit,
          file_url: storagePath,
          file_hash: hash,
          status: "rejected",
          ai_reason: PLAGIARISM_REASON,
          verification_attempts: 3,
          verified_at: now,
          points: 0,
        })
        .select("id")
        .single();

      if (attemptInsertError || !attemptRow) {
        return NextResponse.json(
          { success: false, error: "Failed to record submission attempt." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: { submissionId: submission.id, attemptId: attemptRow.id },
          message: "Proof received! We are reviewing your submission.",
        },
        { status: 200 }
      );
    }

    const { error: updateError } = await adminClient
      .from("submissions")
      .update({
        status: "pending",
        file_url: storagePath,
        file_hash: hash,
        resubmit_count: nextResubmit,
        ai_reason: null,
        verification_attempts: 0,
        last_attempted_at: null,
        verified_at: null,
        updated_at: now,
      })
      .eq("id", submission.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Failed to update submission." },
        { status: 500 }
      );
    }

    const { data: attemptRow, error: attemptInsertError } = await adminClient
      .from("submission_attempts")
      .insert({
        submission_id: submission.id,
        student_id: session.studentId,
        task_id: taskId,
        bootcamp_id: submission.bootcamp_id,
        attempt_number: nextResubmit,
        file_url: storagePath,
        file_hash: hash,
        status: "pending",
        verification_attempts: 0,
        points: 0,
      })
      .select("id")
      .single();

    if (attemptInsertError || !attemptRow) {
      return NextResponse.json(
        { success: false, error: "Failed to record submission attempt." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { submissionId: submission.id, attemptId: attemptRow.id },
        message: "Proof received! We are reviewing your submission.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid submission payload." },
      { status: 400 }
    );
  }
}
