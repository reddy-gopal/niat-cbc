import { createHash } from "crypto";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { CHALLENGES } from "@/lib/challenges";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../utils/supabase/admin";

const PLAGIARISM_REASON =
  "Submission rejected: this proof image is identical to another student's submission for this challenge. If you believe this is an error, please contact your instructor.";
const ACTIVE_TASK_IDS = CHALLENGES.map((challenge) => challenge.id);
const REFERRAL_CHALLENGE_ID = CHALLENGES.find((challenge) => challenge.isReferral)?.id;
const STREAK_CHALLENGE_ID = 6;
const STREAK_TOTAL_DAYS = 3;
const STREAK_TIMEZONE = "Asia/Kolkata";
const DUPLICATE_FILE_REASON =
  "Submission rejected: this exact file was already uploaded by you for this challenge. Please upload a different proof image.";

function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toUtcMidnight(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00.000Z`).getTime();
}

function getCurrentStreakDay(bootcampDateRaw: string, now: Date = new Date()): number {
  const bootcampDateKey = bootcampDateRaw.slice(0, 10);
  const todayKey = getDateKeyInTimeZone(now, STREAK_TIMEZONE);
  const elapsedDays = Math.floor(
    (toUtcMidnight(todayKey) - toUtcMidnight(bootcampDateKey)) / (24 * 60 * 60 * 1000)
  );
  return elapsedDays + 1;
}

export async function POST(request: Request) {
  try {
    const { student: session } = await getStudentFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const taskId = Number(formData.get("taskId"));
    const file = formData.get("file");
    const textResponse = formData.get("textResponse") as string | null;

    if (!Number.isInteger(taskId) || !ACTIVE_TASK_IDS.includes(taskId)) {
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
    let uploadBytes: Uint8Array | null = null;
    let uploadContentType: string | null = null;

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
      uploadBytes = new Uint8Array(buffer);
      uploadContentType = file.type;

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

      const { data: duplicateSelfAttempt } = await adminClient
        .from("submission_attempts")
        .select("id")
        .eq("student_id", session.studentId)
        .eq("task_id", taskId)
        .eq("file_hash", hash)
        .limit(1)
        .maybeSingle();

      if (duplicateSelfAttempt) {
        return NextResponse.json(
          { success: false, error: DUPLICATE_FILE_REASON },
          { status: 400 }
        );
      }

    }

    let targetSubmission: {
      id: string;
      resubmit_count: number;
      bootcamp_id: string;
      status?: string;
      streak_day?: number | null;
    } | null = null;

    const { data: submission, error: submissionLookupError } = await adminClient
      .from("submissions")
      .select("id, resubmit_count, bootcamp_id, status, streak_day")
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

    if (targetSubmission && targetSubmission.status === "accepted") {
      const isReferralChallenge = taskId === REFERRAL_CHALLENGE_ID;
      const isStreakChallenge = taskId === STREAK_CHALLENGE_ID;
      const hasStreakDaysRemaining =
        isStreakChallenge && Number(targetSubmission.streak_day ?? 0) < STREAK_TOTAL_DAYS;

      if (!isReferralChallenge && !hasStreakDaysRemaining) {
        return NextResponse.json(
          { success: false, error: "Challenge already completed. Re-submission is not allowed." },
          { status: 400 }
        );
      }
    }

    // Self-heal: create missing row if not found
    if (!targetSubmission) {
      console.warn(
        `No submission row found for student=${session.studentId} task=${taskId}. Creating one.`
      );

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
        .select("id, resubmit_count, bootcamp_id, streak_day")
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

    const now = new Date().toISOString();
    const nextResubmit = targetSubmission.resubmit_count + 1;
    let streakDayForAttempt: number | null = null;

    if (taskId === STREAK_CHALLENGE_ID) {
      if (nextResubmit > STREAK_TOTAL_DAYS) {
        return NextResponse.json(
          {
            success: false,
            error: "You can submit the 3-Day Real Streak challenge a maximum of 3 times.",
          },
          { status: 400 }
        );
      }

      const { data: bootcampRow } = await adminClient
        .from("bootcamps")
        .select("date")
        .eq("id", session.bootcampId)
        .maybeSingle();

      const bootcampDate = (bootcampRow?.date as string | undefined) ?? "";
      if (!bootcampDate) {
        return NextResponse.json(
          { success: false, error: "Unable to validate streak schedule right now." },
          { status: 500 }
        );
      }

      const currentStreakDay = getCurrentStreakDay(bootcampDate, new Date());
      const latestRecordedDay = Number(targetSubmission.streak_day ?? 0);

      if (currentStreakDay < 1) {
        return NextResponse.json(
          { success: false, error: "The 3-Day Real Streak challenge has not started yet." },
          { status: 400 }
        );
      }

      if (currentStreakDay > STREAK_TOTAL_DAYS) {
        return NextResponse.json(
          { success: false, error: "The 3-Day Real Streak submission window has ended." },
          { status: 400 }
        );
      }

      if (latestRecordedDay >= currentStreakDay) {
        return NextResponse.json(
          { success: false, error: "You already submitted for today's streak. Upload opens again at 00:00." },
          { status: 400 }
        );
      }

      streakDayForAttempt = currentStreakDay;
    }

    if (uploadBytes && uploadContentType) {
      const extension = uploadContentType === "image/png" ? "png" : "jpg";
      storagePath = `${session.bootcampId}/${session.studentId}/${taskId}-${Date.now()}.${extension}`;

      const { error: uploadError } = await adminClient.storage
        .from("submissions")
        .upload(storagePath, uploadBytes, {
          contentType: uploadContentType,
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
          ...(streakDayForAttempt !== null && { streak_day: streakDayForAttempt }),
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
        ...(streakDayForAttempt !== null && { streak_day: streakDayForAttempt }),
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