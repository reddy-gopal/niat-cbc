import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { CHALLENGES } from "@/lib/challenges";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../utils/supabase/admin";
import { env } from "@/lib/env";
import { getStartOfTodayIso } from "@/lib/calendar-day";
import { normalizeInstagramHandleInput } from "@/lib/instagram-handle";
import { parseModelJsonText } from "@/lib/parse-model-json";

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

function parseAiDailyResponse(raw: string): AIResponse | null {
  try {
    const parsed = parseModelJsonText<Record<string, unknown>>(raw);
    return {
      is_instagram: coerceBoolean(parsed.is_instagram),
      is_post_or_story: coerceBoolean(parsed.is_post_or_story),
      has_required_tags: coerceBoolean(parsed.has_required_tags),
      is_own_post: coerceBoolean(parsed.is_own_post),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
      rejection_reason:
        typeof parsed.rejection_reason === "string" ? parsed.rejection_reason : "",
    };
  } catch {
    return null;
  }
}

function friendlyRejectionMessage(parsed: AIResponse, expectedUsername: string): string {
  if (!parsed.is_instagram) {
    return "This doesn't look like an Instagram screenshot.";
  }
  if (!parsed.is_own_post) {
    return `We couldn't verify @${expectedUsername} on this post. Upload a feed post or Story where your username appears at the top (including collaborative posts like "@${expectedUsername} and 2 others").`;
  }
  if (!parsed.is_post_or_story) {
    return "Please upload a feed post or Story, not a Reel.";
  }
  if (!parsed.has_required_tags) {
    return "Add both in your caption: a #niat… hashtag (e.g. #niatbootcamp2026) and an @niat… mention (e.g. @niat_india).";
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
    const startOfTodayIso = getStartOfTodayIso();

    // 1. Daily reset check (IST midnight): already accepted today?
    const { data: approvedToday } = await adminClient
      .from("submission_attempts")
      .select("id")
      .eq("student_id", session.studentId)
      .eq("task_id", TASK_ID)
      .eq("status", "accepted")
      .gte("verified_at", startOfTodayIso)
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
      .gte("created_at", startOfTodayIso)
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

    const mediaType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const imageBase64 = buffer.toString("base64");

    // 4. Next attempt number (must be globally unique per student/task — not reset daily)
    const { data: lastAttempt } = await adminClient
      .from("submission_attempts")
      .select("attempt_number")
      .eq("student_id", session.studentId)
      .eq("task_id", TASK_ID)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const attemptNumber = (lastAttempt?.attempt_number ?? 0) + 1;

    // 5. Call AI
    const aiPrompt = `You verify a NIAT bootcamp student's Instagram post screenshot. Be student-friendly: if the post clearly qualifies, ACCEPT.

REGISTERED STUDENT USERNAME (must match post author): "${expectedUsername}"
Rules: case-insensitive, ignore leading @, compare only letters/numbers/underscores/dots.

─── CHECK 1: is_instagram ───
TRUE for a normal Instagram feed post or Story screenshot: back arrow / "Posts" header, profile avatar, username row, image, like/comment/share row, caption area.

─── CHECK 2: is_post_or_story ───
TRUE for feed posts and Stories. FALSE only for obvious Reels UI (reel player, reel icon layout).

─── CHECK 3: has_required_tags ───
Read the FULL caption / tag block below the image (e.g. "mallu_ab_ @niat_india #niatbootcamp2026 …").
TRUE if BOTH exist anywhere in caption OR tags line (not required on the image graphic itself):
  (a) A #hashtag whose tag text starts with "niat" — e.g. #niatbootcamp2026, #niat_india, #niatbengaluru
  (b) An @mention whose handle starts with "niat" — e.g. @niat_india, @niatbangalore, @niat_india in caption counts
Large "NIAT" text printed ON the photo is NOT a hashtag — still OK if caption has #niat… and @niat…

─── CHECK 4: is_own_post ───
The AUTHOR is the username beside the profile picture at the TOP of the post (under "Posts"), NOT names only in likes.

Set TRUE if ANY:
  A) Sole author header equals "${expectedUsername}" (e.g. header shows "mallu_ab_" and student is mallu_ab_).
  B) Collab header: "${expectedUsername} and 2 others" / "${expectedUsername} and 1 other" / "${expectedUsername} and <name>".
  C) "View insights" is visible AND header author matches "${expectedUsername}" (strong sign it is their post).
  D) Header author matches "${expectedUsername}" even if the photo has bootcamp branding, group photos, or large NIAT overlay text.

Set FALSE ONLY if the TOP post author is a clearly DIFFERENT username (e.g. header "other_user" but student is "${expectedUsername}").
Do NOT reject because: bootcamp photo content, multiple people in image, caption also lists @niat accounts, or hashtags in caption.
On collab posts, caption handle may differ — use HEADER authors only.

If header author matches "${expectedUsername}" (case-insensitive), is_own_post MUST be true.

Respond ONLY with valid JSON (no markdown):
{"is_instagram":boolean,"is_post_or_story":boolean,"has_required_tags":boolean,"is_own_post":boolean,"feedback":"one sentence","rejection_reason":""}

rejection_reason: first failed check name, or "" if all pass. Order: is_instagram → is_own_post → is_post_or_story → has_required_tags`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system:
          "You verify NIAT bootcamp Instagram screenshots for students. ACCEPT standard feed posts when the registered username matches the post header author. ACCEPT collab posts when the student is in the header. ACCEPT when caption has @niat… and #niat…. Large NIAT graphics on the image are normal. When the header username matches the registered student, is_own_post must be true. Respond ONLY with valid JSON.",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: aiPrompt },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text().catch(() => "");
      console.error("Anthropic request failed:", anthropicResponse.status, errBody);
      return NextResponse.json(
        {
          success: false,
          error: "Verification is temporarily unavailable. Please try again in a few minutes.",
        },
        { status: 503 }
      );
    }

    const aiResult = await anthropicResponse.json();
    const textContent = aiResult.content?.find((item: { type?: string }) => item.type === "text")?.text ?? "{}";
    const parsedAI = parseAiDailyResponse(textContent);
    const aiParseFailed = parsedAI === null;

    const isAccepted =
      !aiParseFailed &&
      parsedAI.is_instagram &&
      parsedAI.is_post_or_story &&
      parsedAI.has_required_tags &&
      parsedAI.is_own_post;
    const status = isAccepted ? "accepted" : "rejected";
    const now = new Date().toISOString();

    const studentMessage = isAccepted
      ? (parsedAI?.feedback ?? "Post verified.")
      : aiParseFailed
        ? "We could not verify your screenshot. Please try again with a clear Instagram post screenshot."
        : friendlyRejectionMessage(parsedAI!, expectedUsername);

    // 6. Get or create submission row
    let { data: submission } = await adminClient
      .from("submissions")
      .select("id, resubmit_count")
      .eq("student_id", session.studentId)
      .eq("task_id", TASK_ID)
      .maybeSingle();

    if (!submission) {
      const { data: inserted, error: insertError } = await adminClient
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

      if (insertError?.code === "23505") {
        const { data: existing } = await adminClient
          .from("submissions")
          .select("id, resubmit_count")
          .eq("student_id", session.studentId)
          .eq("task_id", TASK_ID)
          .maybeSingle();
        submission = existing;
      } else {
        submission = inserted;
      }
    }

    if (!submission) {
      console.error("Failed to initialize submission for daily post", {
        studentId: session.studentId,
        taskId: TASK_ID,
      });
      return NextResponse.json(
        { success: false, error: "Unable to initialize submission." },
        { status: 500 }
      );
    }

    // 7. Insert attempt
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

    if (attemptError) {
      console.error("Daily post attempt insert error:", attemptError);
      return NextResponse.json(
        { success: false, error: "Failed to record your submission. Please try again." },
        { status: 500 }
      );
    }

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
        rejection_reason: aiParseFailed
          ? "ai_parse_failed"
          : parsedAI?.rejection_reason || "verification_failed",
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
