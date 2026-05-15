import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { CHALLENGES } from "@/lib/challenges";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../utils/supabase/admin";
import { env } from "@/lib/env";
import { normalizeInstagramHandleInput } from "@/lib/instagram-handle";

const TASK_ID = 6;
const CHALLENGE = CHALLENGES.find((c) => c.id === TASK_ID)!;

type AIResponse = {
  is_instagram: boolean;
  is_post_or_story: boolean;
  has_required_tags: boolean;
  is_own_post: boolean;
  feedback: string;
  rejection_reason: string;
};

function coerceBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function parseAiDailyResponse(raw: string): AIResponse {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    is_instagram: coerceBoolean(parsed.is_instagram),
    is_post_or_story: coerceBoolean(parsed.is_post_or_story),
    has_required_tags: coerceBoolean(parsed.has_required_tags),
    is_own_post: coerceBoolean(parsed.is_own_post),
    feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
    rejection_reason: typeof parsed.rejection_reason === "string" ? parsed.rejection_reason : "",
  };
}

function friendlyRejectionMessage(parsed: AIResponse, expectedUsername: string): string {
  if (!parsed.is_instagram) {
    return "This doesn't look like an Instagram screenshot.";
  }
  if (!parsed.is_own_post) {
    return `This doesn't appear to be your account (@${expectedUsername}). Please upload a screenshot of your own post.`;
  }
  if (!parsed.is_post_or_story) {
    return "Please upload a feed post or Story, not a Reel.";
  }
  if (!parsed.has_required_tags) {
    return "Include a #niat… hashtag and an @niat… mention (e.g. #niatbootcamp2026 and @niat_india).";
  }
  return parsed.feedback || "Your submission could not be verified. Please try again.";
}

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

    const { data: studentRow } = await adminClient
      .from("students")
      .select("instagram_handle")
      .eq("id", session.studentId)
      .maybeSingle();

    const expectedUsername = normalizeInstagramHandleInput(
      String(studentRow?.instagram_handle ?? "")
    );
    if (!expectedUsername) {
      return NextResponse.json(
        {
          success: false,
          error: "Please save your Instagram profile link before submitting.",
          rejection_reason: "missing_instagram_handle",
        },
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
    const aiPrompt = `Look at this Instagram screenshot carefully and answer four things:

1. is_instagram (boolean): Does this look like a genuine Instagram UI — post header with username, 
   profile pic, like/comment/share icons visible?

2. is_post_or_story (boolean): Is this a feed post OR an Instagram Story? 
   (Accept both. Reject only if it's a Reel.)

3. has_required_tags (boolean): In the caption, sticker text, or visible tags, BOTH of the following must appear (case-insensitive):
   - At least one hashtag whose text after # starts with "niat" (e.g. #niatbootcamp2026, #niatchennai, #niat). Extra NIAT-related hashtags are welcome and must NOT cause rejection.
   - At least one @mention whose username starts with "niat" after the @ (e.g. @niat_india, @niatchennai). Extra @niat… mentions are welcome and must NOT cause rejection.
   Do NOT require the exact pair #niatbootcamp2026 and @niat_india only — any qualifying #niat* hashtag plus any qualifying @niat* mention is enough.

4. is_own_post (boolean): The username shown at the top of the post (the account that made this post)
   must match the expected username: "${expectedUsername}"
   Compare case-insensitively. Ignore leading @.
   If the screenshot shows someone else's post being viewed (e.g. from explore or another profile),
   this is false.

Respond ONLY with valid JSON:
{
  "is_instagram": boolean,
  "is_post_or_story": boolean,
  "has_required_tags": boolean,
  "is_own_post": boolean,
  "feedback": "brief explanation",
  "rejection_reason": "first failing check reason, or empty string if all pass"
}

All four must be true to pass. Return the first failing reason in rejection_reason.
Order of checks for rejection_reason: is_instagram → is_own_post → is_post_or_story → has_required_tags`;

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
    const textContent = aiResult.content?.find((item: { type?: string }) => item.type === "text")?.text ?? "{}";
    const parsedAI = parseAiDailyResponse(textContent);

    const isAccepted =
      parsedAI.is_instagram &&
      parsedAI.is_post_or_story &&
      parsedAI.has_required_tags &&
      parsedAI.is_own_post;
    const status = isAccepted ? "accepted" : "rejected";
    const now = new Date().toISOString();

    const studentMessage = isAccepted ? parsedAI.feedback : friendlyRejectionMessage(parsedAI, expectedUsername);

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
        ai_reason: studentMessage,
        points: isAccepted ? CHALLENGE.points : 0,
        verification_attempts: 1,
        last_attempted_at: now,
        verified_at: isAccepted ? now : null,
        text_response: null,
      })
      .select("id")
      .single();

    if (attemptError) throw attemptError;

    // 8. Update status in submissions header
    if (isAccepted) {
      await adminClient
        .from("submissions")
        .update({
          status: "accepted",
          points: CHALLENGE.points,
          ai_reason: studentMessage,
          verified_at: now,
          updated_at: now,
        })
        .eq("id", submission.id);
    } else {
      await adminClient
        .from("submissions")
        .update({
          status: "rejected",
          ai_reason: studentMessage,
          verified_at: now,
          updated_at: now,
        })
        .eq("id", submission.id);
    }

    if (!isAccepted) {
      return NextResponse.json({
        success: false,
        error: studentMessage,
        rejection_reason: parsedAI.rejection_reason || "verification_failed",
      }, { status: 200 }); // Status 200 because it's a valid processing result
    }

    return NextResponse.json({
      success: true,
      message: "Proof received and accepted!",
      data: { attemptId: attemptRow.id },
    });
  } catch (err) {
    console.error("Daily post upload error:", err);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
