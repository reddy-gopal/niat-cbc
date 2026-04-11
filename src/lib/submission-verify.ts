import { env } from "@/lib/env";
import { CHALLENGES } from "@/lib/challenges";
import { adminClient } from "../../utils/supabase/admin";

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
};

export type VerifySubmissionPhaseLogger = (phase: string, durationMs: number) => void;

export type VerifySubmissionResult =
  | { ok: true; verdict: "accepted" | "rejected"; reason: string }
  | { ok: false; status: 400 | 500; error: string };

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
    .select("id,task_id,file_url,status,verification_attempts")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission) {
    logSegment("dbFetch", segmentDb);
    onPhase?.("total", Math.round(performance.now() - totalStart));
    return { ok: false, status: 400, error: "Submission not found." };
  }

  if (submission.verification_attempts >= 3) {
    logSegment("dbFetch", segmentDb);
    onPhase?.("total", Math.round(performance.now() - totalStart));
    return { ok: false, status: 400, error: "Max verification attempts reached." };
  }

  if (submission.status !== "pending") {
    logSegment("dbFetch", segmentDb);
    onPhase?.("total", Math.round(performance.now() - totalStart));
    return { ok: false, status: 400, error: "Submission not pending." };
  }

  if (!submission.file_url) {
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

  const { data: signedData, error: signedError } = await adminClient.storage
    .from("submissions")
    .createSignedUrl(submission.file_url, 60);

  logSegment("dbFetch", segmentDb);

  if (signedError || !signedData?.signedUrl) {
    onPhase?.("total", Math.round(performance.now() - totalStart));
    return { ok: false, status: 500, error: "Unable to read submission file." };
  }

  const segmentImage = performance.now();
  const imageResponse = await fetch(signedData.signedUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");
  logSegment("imageDownload", segmentImage);

  const challenge = CHALLENGES.find((item) => item.id === submission.task_id);
  if (!challenge) {
    onPhase?.("total", Math.round(performance.now() - totalStart));
    return { ok: false, status: 400, error: "Challenge not found." };
  }

  try {
    const segmentAnthropic = performance.now();
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
        system:
          'You are verifying student challenge submissions for a bootcamp program called NIAT CBC. Be fair but strict. Respond ONLY with valid JSON, no other text: {"verdict": "accepted" or "rejected", "reason": "one plain English sentence"}',
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Challenge: ${challenge.title}. Verification criteria: ${challenge.description}. Please verify if the attached screenshot meets this criteria.`,
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: submission.file_url.endsWith(".png") ? "image/png" : "image/jpeg",
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      logSegment("anthropic", segmentAnthropic);
      throw new Error("Anthropic request failed.");
    }

    const anthropicJson = (await anthropicResponse.json()) as AnthropicResponse;
    logSegment("anthropic", segmentAnthropic);

    const textContent =
      anthropicJson.content?.find((item) => item.type === "text")?.text ?? "";
    const parsedVerdict = JSON.parse(textContent) as {
      verdict: "accepted" | "rejected";
      reason: string;
    };

    const verifiedAt = new Date().toISOString();

    if (parsedVerdict.verdict === "accepted") {
      await adminClient
        .from("submissions")
        .update({
          status: "accepted",
          points: challenge.points,
          ai_reason: parsedVerdict.reason,
          verified_at: verifiedAt,
          updated_at: verifiedAt,
        })
        .eq("id", submission.id);
    } else {
      await adminClient
        .from("submissions")
        .update({
          status: "rejected",
          points: 0,
          ai_reason: parsedVerdict.reason,
          verified_at: verifiedAt,
          updated_at: verifiedAt,
        })
        .eq("id", submission.id);
    }

    const pendingAttempt = await getLatestPendingAttemptId(submission.id as string);
    if (pendingAttempt) {
      await adminClient
        .from("submission_attempts")
        .update({
          status: parsedVerdict.verdict,
          ai_reason: parsedVerdict.reason,
          verified_at: verifiedAt,
          points: parsedVerdict.verdict === "accepted" ? challenge.points : 0,
        })
        .eq("id", pendingAttempt.id);
    }

    onPhase?.("total", Math.round(performance.now() - totalStart));
    return {
      ok: true,
      verdict: parsedVerdict.verdict,
      reason: parsedVerdict.reason,
    };
  } catch {
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
