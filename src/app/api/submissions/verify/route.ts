import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { CHALLENGES } from "@/lib/challenges";
import { adminClient } from "../../../../../utils/supabase/admin";

const verifySchema = z.object({
  submissionId: z.string().uuid(),
});

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
};

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

export async function POST(request: Request) {
  const secret = request.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid payload." },
        { status: 400 }
      );
    }

    const { data: submission, error: submissionError } = await adminClient
      .from("submissions")
      .select("id,task_id,file_url,status,verification_attempts")
      .eq("id", parsed.data.submissionId)
      .maybeSingle();

    if (submissionError || !submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found." },
        { status: 400 }
      );
    }

    if (submission.verification_attempts >= 3) {
      return NextResponse.json(
        { success: false, error: "Max verification attempts reached." },
        { status: 400 }
      );
    }

    if (submission.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Submission not pending." },
        { status: 400 }
      );
    }

    if (!submission.file_url) {
      return NextResponse.json(
        { success: false, error: "Submission file missing." },
        { status: 400 }
      );
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
      return NextResponse.json(
        { success: false, error: "Failed to update submission attempt." },
        { status: 500 }
      );
    }

    const { data: signedData, error: signedError } = await adminClient.storage
      .from("submissions")
      .createSignedUrl(submission.file_url, 60);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json(
        { success: false, error: "Unable to read submission file." },
        { status: 500 }
      );
    }

    const imageResponse = await fetch(signedData.signedUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    const challenge = CHALLENGES.find((item) => item.id === submission.task_id);
    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge not found." },
        { status: 400 }
      );
    }

    try {
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
                    media_type: submission.file_url.endsWith(".png")
                      ? "image/png"
                      : "image/jpeg",
                    data: base64Image,
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

      const anthropicJson = (await anthropicResponse.json()) as AnthropicResponse;
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

      const pendingAttempt = await getLatestPendingAttemptId(submission.id);
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

      return NextResponse.json({
        success: true,
        data: {
          verdict: parsedVerdict.verdict,
          reason: parsedVerdict.reason,
        },
      });
    } catch {
      const failNow = new Date().toISOString();
      const pendingAttempt = await getLatestPendingAttemptId(submission.id);
      if (pendingAttempt) {
        await adminClient
          .from("submission_attempts")
          .update({
            verification_attempts: pendingAttempt.verification_attempts + 1,
            last_attempted_at: failNow,
          })
          .eq("id", pendingAttempt.id);
      }

      return NextResponse.json(
        {
          success: false,
          error: "Verification failed; submission remains pending for retry.",
        },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }
}
