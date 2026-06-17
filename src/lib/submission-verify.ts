import { env } from "@/lib/env";
import { ANTHROPIC_VISION_MODEL } from "@/lib/anthropic-model";
import { CHALLENGES } from "@/lib/challenges";
import { parseModelJsonText } from "@/lib/parse-model-json";
import { adminClient } from "../../utils/supabase/admin";

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
};


const GLOBAL_FALLBACK_PROMPT =
  'You are verifying student challenge submissions for a bootcamp program called NIAT CBC. Use a strongly student-friendly, benefit-of-the-doubt policy. Default to ACCEPT unless there is clear evidence the submission is not a real attempt. ACCEPT when the response is reasonably related to the challenge topic, even if short, vague, imperfect, emotional, partially incorrect, or missing details. If you are uncertain between accepted and rejected, choose accepted. Do not penalize grammar, spelling, style, brevity, image quality, lighting, composition, or minor ambiguity. For text tasks: any genuine topic-related response should be accepted. For image tasks: accept if the image plausibly matches the scenario. Only REJECT when clearly off-topic, blank/gibberish, spam/copied junk, inappropriate, or clearly not an attempt. Respond ONLY with valid JSON, no other text: {"verdict": "accepted" or "rejected", "reason": "one plain English sentence"}. For accepted verdicts, give an encouraging and specific reason. For rejected verdicts, give a brief kind reason.';

export type VerifySubmissionPhaseLogger = (phase: string, durationMs: number) => void;

export type VerifySubmissionResult =
  | { ok: true; verdict: "accepted" | "rejected"; reason: string }
  | { ok: false; status: 400 | 500; error: string };

async function loadSubmissionImageBase64(
  storagePath: string
): Promise<{ base64: string; mediaType: "image/png" | "image/jpeg" } | null> {
  const { data: signedData, error: signedError } = await adminClient.storage
    .from("submissions")
    .createSignedUrl(storagePath, 120);

  if (signedError || !signedData?.signedUrl) return null;

  const imageResponse = await fetch(signedData.signedUrl);
  if (!imageResponse.ok) {
    console.error("[verify] failed to download submission image:", imageResponse.status);
    return null;
  }

  const buffer = await imageResponse.arrayBuffer();
  const mediaType: "image/png" | "image/jpeg" = storagePath.endsWith(".png")
    ? "image/png"
    : "image/jpeg";

  return { base64: Buffer.from(buffer).toString("base64"), mediaType };
}

async function getLatestPendingAttemptId(submissionId: string): Promise<{
  id: string;
  verification_attempts: number;
} | null> {
  const { data } = await adminClient
    .from("submission_attempts")
    .select("id, verification_attempts")
    .eq("submission_id", submissionId)
    .eq("status", "pending")
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id as string,
    verification_attempts: data.verification_attempts as number,
  };
}

/**
 * Runs the same verification pipeline as POST /api/submissions/verify (without HTTP).
 * Used by the verify route and by verify-batch background work.
 */
export async function verifySubmissionById(
  submissionId: string,
  options?: { onPhase?: VerifySubmissionPhaseLogger }
): Promise<VerifySubmissionResult> {
  const onPhase = options?.onPhase;
  const totalStart = performance.now();

  const logSegment = (phase: string, segmentStart: number) => {
    onPhase?.(phase, Math.round(performance.now() - segmentStart));
  };

  const segmentDb = performance.now();

  const { data: submission, error: submissionError } = await adminClient
    .from("submissions")
    .select("id,task_id,student_id,file_url,text_response,status,verification_attempts,streak_day")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission) {
    logSegment("dbFetch", segmentDb);
    onPhase?.("total", Math.round(performance.now() - totalStart));
    return { ok: false, status: 400, error: "Submission not found." };
  }

  if (submission.verification_attempts >= 3) {
    if (submission.status === "pending") {
      const failReason =
        "Automatic verification failed after multiple attempts. Please upload a clearer proof and try again.";
      const verifiedAt = new Date().toISOString();
      await adminClient
        .from("submissions")
        .update({
          status: "rejected",
          points: 0,
          ai_reason: failReason,
          verified_at: verifiedAt,
          updated_at: verifiedAt,
        })
        .eq("id", submission.id);
      await adminClient
        .from("submission_attempts")
        .update({
          status: "rejected",
          points: 0,
          ai_reason: failReason,
          verified_at: verifiedAt,
        })
        .eq("submission_id", submission.id)
        .eq("status", "pending")
        .is("verified_at", null);
    }
    logSegment("dbFetch", segmentDb);
    onPhase?.("total", Math.round(performance.now() - totalStart));
    return { ok: false, status: 400, error: "Max verification attempts reached." };
  }

  if (submission.status !== "pending") {
    logSegment("dbFetch", segmentDb);
    onPhase?.("total", Math.round(performance.now() - totalStart));
    return { ok: false, status: 400, error: "Submission not pending." };
  }

  const challenge = CHALLENGES.find((item) => item.id === submission.task_id);
  if (!challenge) {
    logSegment("dbFetch", segmentDb);
    onPhase?.("total", Math.round(performance.now() - totalStart));
    return { ok: false, status: 400, error: "Challenge not found." };
  }
  const promptType = challenge.verificationPrompt
    ? "challenge_specific"
    : "global_fallback";

  if (!challenge.requiresText && !submission.file_url) {
    logSegment("dbFetch", segmentDb);
    onPhase?.("total", Math.round(performance.now() - totalStart));
    return { ok: false, status: 400, error: "Submission file missing." };
  }

  const now = new Date().toISOString();
  const { error: bumpError } = await adminClient
    .from("submissions")
    .update({
      last_attempted_at: now,
      verification_attempts: submission.verification_attempts + 1,
      updated_at: now,
    })
    .eq("id", submission.id);

  if (bumpError) {
    logSegment("dbFetch", segmentDb);
    onPhase?.("total", Math.round(performance.now() - totalStart));
    return { ok: false, status: 500, error: "Failed to update submission attempt." };
  }

  let imagePayload: { base64: string; mediaType: "image/png" | "image/jpeg" } | null = null;
  if (!challenge.requiresText && submission.file_url) {
    const segmentImage = performance.now();
    imagePayload = await loadSubmissionImageBase64(submission.file_url as string);
    logSegment("dbFetch", segmentDb);
    logSegment("imageDownload", segmentImage);

    if (!imagePayload) {
      onPhase?.("total", Math.round(performance.now() - totalStart));
      return { ok: false, status: 500, error: "Unable to read submission file." };
    }
  } else {
    logSegment("dbFetch", segmentDb);
  }

  try {
    const segmentAnthropic = performance.now();
    const hasChallengePrompt = Boolean(challenge.verificationPrompt);
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_VISION_MODEL,
        max_tokens: 200,
        system: challenge.verificationPrompt ?? GLOBAL_FALLBACK_PROMPT,
        messages: [
          {
            role: "user",
            content: challenge.requiresText
              ? [
                {
                  type: "text",
                  text: hasChallengePrompt
                    ? `Student response: "${submission.text_response}". Evaluate using the system prompt only.`
                    : `Challenge: ${challenge.title}. Challenge description: ${challenge.description}.${challenge.verificationHint ? ` Verification hint: ${challenge.verificationHint}` : ""} Student response: "${submission.text_response}". This is a text-only challenge. Apply the system prompt exactly. Accept if the response is genuinely related to the challenge, even if it is very short, informal, incomplete, or only 2-3 words. Reject only if it is blank, gibberish, spam, abusive/inappropriate, or clearly unrelated.`,
                },
              ]
              : [
                {
                  type: "text",
                  text: hasChallengePrompt
                    ? `This is an image-only submission. Evaluate using the system prompt only.`
                    : `Challenge: ${challenge.title}. Challenge description: ${challenge.description}.${challenge.verificationHint ? ` Verification hint: ${challenge.verificationHint}` : ""} This is an image-only challenge. Apply the system prompt exactly. Accept if the image plausibly shows a related attempt, even if it is blurry, dark, cropped, partial, casual, or imperfect. Reject only if it is blank/corrupt, abusive/inappropriate, clearly unrelated, or an obvious non-attempt.`,
                },
                imagePayload
                  ? {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: imagePayload.mediaType,
                      data: imagePayload.base64,
                    },
                  }
                  : { type: "text", text: "(No image provided)" },
              ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text().catch(() => "");
      console.error("[verify] Anthropic request failed:", anthropicResponse.status, errBody);
      logSegment("anthropic", segmentAnthropic);
      throw new Error(`Anthropic request failed (${anthropicResponse.status}).`);
    }

    const anthropicJson = (await anthropicResponse.json()) as AnthropicResponse;
    logSegment("anthropic", segmentAnthropic);

    const textContent =
      anthropicJson.content?.find((item) => item.type === "text")?.text ?? "";

    let parsedVerdict: { verdict: "accepted" | "rejected"; reason: string };
    try {
      parsedVerdict = parseModelJsonText(textContent);
      if (parsedVerdict.verdict !== "accepted" && parsedVerdict.verdict !== "rejected") {
        throw new Error("Invalid verdict value");
      }
      if (typeof parsedVerdict.reason !== "string") {
        parsedVerdict.reason = String(parsedVerdict.reason ?? "");
      }
    } catch (parseErr) {
      console.error("[verify] failed to parse Anthropic JSON:", textContent, parseErr);
      throw new Error("Invalid verification response from AI.");
    }

    const verifiedAt = new Date().toISOString();

    if (parsedVerdict.verdict === "accepted") {
      if (submission.task_id === 3) {
        // Referral task (task_id=3) uses the submissions table as source of truth.
        // We call the RPC which now only updates the status (triggers handle points).
        const { error: acceptError } = await adminClient.rpc("accept_submission_and_award_points", {
          p_submission_id: submission.id,
          p_points: challenge.points,
          p_ai_reason: parsedVerdict.reason,
          p_verified_at: verifiedAt,
          p_team_id: null, // Triggers handle teams now
        });

        if (acceptError) {
          console.error("[verify] accept_submission_and_award_points failed", {
            submissionId: submission.id,
            error: acceptError,
          });
          throw new Error("Failed to accept submission and award points.");
        }
      } else {
        // For all other tasks, submission_attempts is the source of truth.
        // We update the submissions row status here for consistency.
        // Recalculation triggers will fire when the submission_attempts row is updated below.
        const { error: syncError } = await adminClient
          .from("submissions")
          .update({
            status: "accepted",
            points: challenge.points,
            ai_reason: parsedVerdict.reason,
            verified_at: verifiedAt,
            updated_at: verifiedAt,
          })
          .eq("id", submission.id);

        if (syncError) {
          console.error("[verify] failed to sync submissions status", syncError);
        }
      }
    } else {
      const { error: rejectError } = await adminClient
        .from("submissions")
        .update({
          status: "rejected",
          points: 0,
          ai_reason: parsedVerdict.reason,
          verified_at: verifiedAt,
          updated_at: verifiedAt,
        })
        .eq("id", submission.id);

      if (rejectError) {
        console.error("[verify] failed to mark submission rejected", {
          submissionId: submission.id,
          error: rejectError,
        });
        throw new Error("Failed to update rejected submission.");
      }
    }

    const pendingAttempt = await getLatestPendingAttemptId(submission.id as string);
    if (pendingAttempt) {
      const baseAttemptUpdate = {
        status: parsedVerdict.verdict,
        ai_reason: parsedVerdict.reason,
        verified_at: verifiedAt,
        points: parsedVerdict.verdict === "accepted" ? challenge.points : 0,
      };

      let { error: attemptUpdateError } = await adminClient
        .from("submission_attempts")
        .update({
          ...baseAttemptUpdate,
          prompt_type: promptType,
        })
        .eq("id", pendingAttempt.id);

      const isMissingPromptTypeColumn =
        attemptUpdateError?.code === "42703" ||
        attemptUpdateError?.message?.includes("prompt_type");

      if (attemptUpdateError && isMissingPromptTypeColumn) {
        const retry = await adminClient
          .from("submission_attempts")
          .update(baseAttemptUpdate)
          .eq("id", pendingAttempt.id);
        attemptUpdateError = retry.error;
      }

      if (attemptUpdateError) {
        const syncAllPending = await adminClient
          .from("submission_attempts")
          .update(baseAttemptUpdate)
          .eq("submission_id", submission.id)
          .eq("status", "pending")
          .is("verified_at", null);

        if (!syncAllPending.error) {
          attemptUpdateError = null;
        }
      }

      if (attemptUpdateError) {
        console.error("[verify] failed to sync submission_attempts row(s)", {
          submissionId: submission.id,
          attemptId: pendingAttempt.id,
          error: attemptUpdateError,
        });
        throw new Error("Failed to update submission attempt status.");
      }
    }

    onPhase?.("total", Math.round(performance.now() - totalStart));
    return {
      ok: true,
      verdict: parsedVerdict.verdict,
      reason: parsedVerdict.reason,
    };
  } catch (err) {
    console.error("[verify] verification error:", err);
    const failNow = new Date().toISOString();
    const pendingAttempt = await getLatestPendingAttemptId(submission.id as string);
    if (pendingAttempt) {
      await adminClient
        .from("submission_attempts")
        .update({
          verification_attempts: pendingAttempt.verification_attempts + 1,
          last_attempted_at: failNow,
        })
        .eq("id", pendingAttempt.id);
    }

    onPhase?.("total", Math.round(performance.now() - totalStart));
    return {
      ok: false,
      status: 500,
      error: "Verification failed; submission remains pending for retry.",
    };
  }
}
