import { createHash } from "crypto";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { verifyStudentSession } from "@/lib/session";
import { CHALLENGES } from "@/lib/challenges";
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
    const textResponse = formData.get("textResponse") as string | null;

    if (!Number.isInteger(taskId) || taskId < 1 || taskId > 9) {
      return NextResponse.json(
        { success: false, error: "Invalid task ID." },
        { status: 400 }
      );
    }

    const challenge = CHALLENGES.find((c) => c.id === taskId);
    if (!challenge) {
      return NextResponse.json({ success: false, error: "Challenge not found." }, { status: 404 });
    }

    if (!challenge.requiresText && !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "File is required." }, { status: 400 });
    }

    if (challenge.requiresText && !textResponse) {
      return NextResponse.json({ success: false, error: "Response is required." }, { status: 400 });
    }

    if (challenge.maxWords && textResponse) {
      const wordCount = textResponse.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > challenge.maxWords) {
        return NextResponse.json(
          {
            success: false,
            error: `Response exceeds ${challenge.maxWords} word limit. Your submission has ${wordCount} words.`,
          },
          { status: 400 }
        );
      }
    }

    let storagePath: string | null = null;
    let hash: string | null = null;
    let isPlagiarism = false;

    if (file instanceof File) {
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

      const buffer = Buffer.from(await file.arrayBuffer());
      hash = createHash("sha256").update(buffer).digest("hex");
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

      isPlagiarism = Boolean(duplicateRow);

      const extension = file.type === "image/png" ? "png" : "jpg";
      storagePath = `${session.bootcampId}/${session.studentId}/${taskId}-${Date.now()}.${extension}`;

      const { error: uploadError } = await adminClient.storage
        .from("submissions")
        .upload(storagePath, bytes, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("File upload error:", uploadError);
        return NextResponse.json(
          { success: false, error: "Failed to upload file." },
          { status: 500 }
        );
      }
    }

    let targetSubmission: {
      id: string;
      resubmit_count: number;
      bootcamp_id: string;
      status?: string;
    } | null = null;

    if (taskId === 9) {
      const { data: streakRows, error: streakLookupError } = await adminClient
        .from("submissions")
        .select("id, resubmit_count, bootcamp_id, status, streak_day")
        .eq("student_id", session.studentId)
        .eq("task_id", 9)
        .order("streak_day", { ascending: true });

      if (streakLookupError) {
        console.error("Task 9 lookup error:", streakLookupError);
        return NextResponse.json(
          { success: false, error: "Unable to lookup submission." },
          { status: 500 }
        );
      }

      const rows = streakRows ?? [];
      const nextOpen = rows.find((row) => row.status !== "accepted");
      if (nextOpen) {
        targetSubmission = {
          id: nextOpen.id,
          resubmit_count: nextOpen.resubmit_count,
          bootcamp_id: nextOpen.bootcamp_id,
        };
      } else if (rows.length > 0) {
        return NextResponse.json(
          { success: false, error: "Challenge 9 streak is already completed." },
          { status: 400 }
        );
      }
    } else {
      const { data: submission, error: submissionLookupError } = await adminClient
        .from("submissions")
        .select("id, resubmit_count, bootcamp_id, status")
        .eq("student_id", session.studentId)
        .eq("task_id", taskId)
        .maybeSingle();

      if (submissionLookupError) {
        console.error("Submission lookup error:", submissionLookupError);
        return NextResponse.json(
          { success: false, error: "Unable to lookup submission." },
          { status: 500 }
        );
      }

      targetSubmission = submission;
    }

    if (
      targetSubmission &&
      taskId !== 5 &&
      taskId !== 9 &&
      targetSubmission.status === "accepted"
    ) {
      return NextResponse.json(
        { success: false, error: "Challenge already completed. Re-submission is not allowed." },
        { status: 400 }
      );
    }

    // Self-heal: create missing row if not found
    if (!targetSubmission) {
      console.warn(
        `No submission row found for student=${session.studentId} task=${taskId}. Creating one.`
      );

      if (taskId === 9) {
        const seedRows = [1, 2, 3].map((day) => ({
          student_id: session.studentId,
          bootcamp_id: session.bootcampId,
          section_id: session.sectionId,
          region_id: session.regionId,
          task_id: 9,
          streak_day: day,
          status: "not_started" as const,
          points: 0,
          resubmit_count: 0,
        }));

        const { data: insertedRows, error: insertError } = await adminClient
          .from("submissions")
          .insert(seedRows)
          .select("id, resubmit_count, bootcamp_id, streak_day");

        if (insertError || !insertedRows || insertedRows.length === 0) {
          console.error("Task 9 insert error:", insertError);
          return NextResponse.json(
            { success: false, error: "Unable to initialize submission." },
            { status: 500 }
          );
        }

        const firstStreakRow = [...insertedRows].sort(
          (a, b) => (a.streak_day ?? 999) - (b.streak_day ?? 999)
        )[0];

        targetSubmission = {
          id: firstStreakRow.id,
          resubmit_count: firstStreakRow.resubmit_count,
          bootcamp_id: firstStreakRow.bootcamp_id,
        };
      } else {
        const { data: inserted, error: insertError } = await adminClient
          .from("submissions")
          .insert({
            student_id: session.studentId,
            bootcamp_id: session.bootcampId,
            section_id: session.sectionId,
            region_id: session.regionId,
            task_id: taskId,
            status: "not_started",
            points: 0,
            resubmit_count: 0,
          })
          .select("id, resubmit_count, bootcamp_id")
          .single();

        if (insertError || !inserted) {
          console.error("Submission insert error:", insertError);
          return NextResponse.json(
            { success: false, error: "Unable to initialize submission." },
            { status: 500 }
          );
        }

        targetSubmission = inserted;
      }
    }

    const now = new Date().toISOString();
    const nextResubmit = targetSubmission.resubmit_count + 1;

    if (isPlagiarism) {
      const { error: updateError } = await adminClient
        .from("submissions")
        .update({
          status: "rejected",
          ...(storagePath !== null && { file_url: storagePath }),
          ...(hash !== null && { file_hash: hash }),
          text_response: textResponse,
          ai_reason: PLAGIARISM_REASON,
          resubmit_count: nextResubmit,
          verification_attempts: 3,
          last_attempted_at: now,
          verified_at: now,
          updated_at: now,
        })
        .eq("id", targetSubmission.id);

      if (updateError) {
        console.error("Plagiarism submission update error:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to update submission.", detail: updateError.message },
          { status: 500 }
        );
      }

      const { data: attemptRow, error: attemptInsertError } = await adminClient
        .from("submission_attempts")
        .insert({
          submission_id: targetSubmission.id,
          student_id: session.studentId,
          task_id: taskId,
          bootcamp_id: targetSubmission.bootcamp_id,
          attempt_number: nextResubmit,
          ...(storagePath !== null && { file_url: storagePath }),
          ...(hash !== null && { file_hash: hash }),
          text_response: textResponse,
          status: "rejected",
          ai_reason: PLAGIARISM_REASON,
          verification_attempts: 3,
          verified_at: now,
          points: 0,
        })
        .select("id")
        .single();

      if (attemptInsertError || !attemptRow) {
        console.error("Plagiarism attempt insert error:", attemptInsertError);
        return NextResponse.json(
          { success: false, error: "Failed to record submission attempt." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: { submissionId: targetSubmission.id, attemptId: attemptRow.id },
          message: "Proof received! We are reviewing your submission.",
        },
        { status: 200 }
      );
    }

    // Normal (non-plagiarism) submission update
    const { error: updateError } = await adminClient
      .from("submissions")
      .update({
        status: "pending",
        ...(storagePath !== null && { file_url: storagePath }),
        ...(hash !== null && { file_hash: hash }),
        text_response: textResponse,
        resubmit_count: nextResubmit,
        ai_reason: null,
        verification_attempts: 0,
        last_attempted_at: null,
        verified_at: null,
        updated_at: now,
      })
      .eq("id", targetSubmission.id);

    if (updateError) {
      console.error("Submission update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update submission.", detail: updateError.message },
        { status: 500 }
      );
    }

    const { data: attemptRow, error: attemptInsertError } = await adminClient
      .from("submission_attempts")
      .insert({
        submission_id: targetSubmission.id,
        student_id: session.studentId,
        task_id: taskId,
        bootcamp_id: targetSubmission.bootcamp_id,
        attempt_number: nextResubmit,
        ...(storagePath !== null && { file_url: storagePath }),
        ...(hash !== null && { file_hash: hash }),
        text_response: textResponse,
        status: "pending",
        verification_attempts: 0,
        points: 0,
      })
      .select("id")
      .single();

    if (attemptInsertError || !attemptRow) {
      console.error("Attempt insert error:", attemptInsertError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to record submission attempt.",
          detail: attemptInsertError?.message,
        },
        { status: 500 }
      );
    }

    // Always verify on the same origin that handled this upload request.
    // This avoids local uploads accidentally hitting a deployed verifier.
    const origin = new URL(request.url).origin;
    const internalSecret =
      process.env.INTERNAL_SECRET ?? process.env.INTERNAL_API_SECRET ?? "";
    waitUntil(
      fetch(`${origin}/api/submissions/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({ submissionId: targetSubmission.id }),
      }).catch((error) => console.error("Verify trigger failed:", error))
    );

    return NextResponse.json(
      {
        success: true,
        data: { submissionId: targetSubmission.id, attemptId: attemptRow.id },
        message: "Proof received! We are reviewing your submission.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unhandled submission error:", err);
    return NextResponse.json(
      { success: false, error: "Invalid submission payload." },
      { status: 400 }
    );
  }
}