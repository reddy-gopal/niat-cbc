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

export async function POST(request: Request) {
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
      .select("*")
      .eq("id", parsed.data.submissionId)
      .maybeSingle();

    if (submissionError || !submission || submission.status !== "pending") {
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

      const anthropicJson = (await anthropicResponse.json()) as AnthropicResponse;
      const textContent =
        anthropicJson.content?.find((item) => item.type === "text")?.text ?? "";
      const parsedVerdict = JSON.parse(textContent) as {
        verdict: "accepted" | "rejected";
        reason: string;
      };

      if (parsedVerdict.verdict === "accepted") {
        await adminClient
          .from("submissions")
          .update({
            status: "accepted",
            points: challenge.points,
            ai_reason: parsedVerdict.reason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", submission.id);
      } else {
        await adminClient
          .from("submissions")
          .update({
            status: "rejected",
            points: 0,
            ai_reason: parsedVerdict.reason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", submission.id);
      }

      return NextResponse.json({
        success: true,
        data: {
          verdict: parsedVerdict.verdict,
          reason: parsedVerdict.reason,
        },
      });
    } catch {
      await adminClient
        .from("submissions")
        .update({
          status: "not_started",
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission.id);

      return NextResponse.json({
        success: true,
        data: {
          verdict: "not_started",
          reason: "Verification failed, reset for retry.",
        },
      });
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }
}
