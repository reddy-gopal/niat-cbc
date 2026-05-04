import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { CHALLENGES } from "@/lib/challenges";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../utils/supabase/admin";
import { env } from "@/lib/env";

const TASK_ID = 6;
const CHALLENGE = CHALLENGES.find((c) => c.id === TASK_ID)!;

type AIResponse = {
  is_instagram: boolean;
  is_feed_post: boolean;
  has_hashtag: boolean;
  feedback: string;
  rejection_reason: "not_instagram" | "not_a_post" | "hashtag_not_found" | null;
};

export async function POST(request: Request) {
  try {
    const { student: session } = await getStudentFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }


    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "File is required." }, { status: 400 });
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only PNG and JPG images are allowed." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");

    // 1. Daily reset check: already approved today?
    const { data: approvedToday } = await adminClient
      .from("submission_attempts")
      .select("id")
      .eq("student_id", session.studentId)
      .eq("task_id", TASK_ID)
      .eq("status", "accepted")
      .gte("verified_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .limit(1)
      .maybeSingle();

    if (approvedToday) {
      return NextResponse.json(
        { success: false, error: "You've already completed today's post challenge. Come back tomorrow." },
        { status: 400 }
      );
    }

    // 2. Duplicate file check (same day only)
    const { data: duplicateToday } = await adminClient
      .from("submission_attempts")
      .select("id")
      .eq("student_id", session.studentId)
      .eq("task_id", TASK_ID)
      .eq("file_hash", hash)
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .limit(1)
      .maybeSingle();

    if (duplicateToday) {
      return NextResponse.json(
        { success: false, error: "You already uploaded this screenshot today." },
        { status: 400 }
      );
    }

    // 3. Upload to storage
    const extension = file.type === "image/png" ? "png" : "jpg";
    const storagePath = `${session.bootcampId}/${session.studentId}/${TASK_ID}-${Date.now()}.${extension}`;

    const { error: uploadError } = await adminClient.storage
      .from("submissions")
      .upload(storagePath, new Uint8Array(buffer), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("File upload error:", uploadError);
      return NextResponse.json({ success: false, error: "Failed to upload file." }, { status: 500 });
    }

    // 4. Get signed URL for AI
    const { data: signedData, error: signedError } = await adminClient.storage
      .from("submissions")
      .createSignedUrl(storagePath, 60);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json({ success: false, error: "Unable to read submission file." }, { status: 500 });
    }

    // 5. Call AI
    const aiPrompt = `Look at this screenshot carefully and answer three things:

1. Is this a screenshot from Instagram? Look for Instagram UI elements such as the like, comment, share buttons, Instagram-style profile picture, and the standard feed post layout.

2. Is this a feed POST and not a Story or Reel? A feed post has a caption below the image with like and comment counts visible. A story is full-screen with no caption area.

3. Is the hashtag #niatbootcamp2026 clearly visible in the caption or comments of this post?

Respond in this exact JSON format:
{
  "is_instagram": true or false,
  "is_feed_post": true or false,
  "has_hashtag": true or false,
  "feedback": "A friendly one-sentence feedback for the student",
  "rejection_reason": null or one of: "not_instagram" | "not_a_post" | "hashtag_not_found"
}

All three must be true to pass. If any fail, return the first failing reason in rejection_reason.`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system: "You are a helpful assistant that verifies Instagram screenshots. Respond ONLY with valid JSON.",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: aiPrompt },
              {
                type: "image",
                source: {
                  type: "url",
                  url: signedData.signedUrl,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      throw new Error("Anthropic request failed.");
    }

    const aiResult = await anthropicResponse.json();
    const textContent = aiResult.content?.find((item: any) => item.type === "text")?.text ?? "{}";
    const parsedAI = JSON.parse(textContent) as AIResponse;

    const isAccepted = parsedAI.is_instagram && parsedAI.is_feed_post && parsedAI.has_hashtag;
    const status = isAccepted ? "accepted" : "rejected";
    const now = new Date().toISOString();

    // 6. Get or create submission row
    let { data: submission } = await adminClient
      .from("submissions")
      .select("id, resubmit_count")
      .eq("student_id", session.studentId)
      .eq("task_id", TASK_ID)
      .maybeSingle();

    if (!submission) {
      const { data: inserted } = await adminClient
        .from("submissions")
        .insert({
          student_id: session.studentId,
          bootcamp_id: session.bootcampId,
          section_id: session.sectionId,
          region_id: session.regionId,
          task_id: TASK_ID,
          status: "not_started",
          points: 0,
          resubmit_count: 0,
        })
        .select("id, resubmit_count")
        .single();
      submission = inserted;
    }

    if (!submission) throw new Error("Failed to initialize submission.");

    // 7. Insert attempt
    const { data: countData } = await adminClient
      .from("submission_attempts")
      .select("id")
      .eq("student_id", session.studentId)
      .eq("task_id", TASK_ID)
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
    
    const attemptNumber = (countData?.length ?? 0) + 1;

    const { data: attemptRow, error: attemptError } = await adminClient
      .from("submission_attempts")
      .insert({
        submission_id: submission.id,
        student_id: session.studentId,
        task_id: TASK_ID,
        bootcamp_id: session.bootcampId,
        attempt_number: attemptNumber,
        file_url: storagePath,
        file_hash: hash,
        status: status,
        ai_reason: parsedAI.feedback,
        points: isAccepted ? CHALLENGE.points : 0,
        verification_attempts: 1,
        last_attempted_at: now,
        verified_at: isAccepted ? now : null,
        text_response: null,
      })
      .select("id")
      .single();

    if (attemptError) throw attemptError;

    // 8. Update points/status in submissions and teams
    if (isAccepted) {
      const { data: student } = await adminClient
        .from("students")
        .select("team_id")
        .eq("id", session.studentId)
        .single();

      await adminClient.rpc("accept_submission_and_award_points", {
        p_submission_id: submission.id,
        p_points: CHALLENGE.points,
        p_ai_reason: parsedAI.feedback,
        p_verified_at: now,
        p_team_id: student?.team_id,
      });
    } else {
        await adminClient
          .from("submissions")
          .update({
            status: "rejected",
            ai_reason: parsedAI.feedback,
            updated_at: now,
          })
          .eq("id", submission.id);
    }

    if (!isAccepted) {
        return NextResponse.json({
            success: false,
            error: parsedAI.feedback,
            rejection_reason: parsedAI.rejection_reason
        }, { status: 200 }); // Status 200 because it's a valid processing result
    }

    return NextResponse.json({
      success: true,
      message: "Proof received and accepted!",
      data: { attemptId: attemptRow.id }
    });

  } catch (err) {
    console.error("Daily post upload error:", err);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
