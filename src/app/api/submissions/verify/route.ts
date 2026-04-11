import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySubmissionById } from "@/lib/submission-verify";

const verifySchema = z.object({
  submissionId: z.string().uuid(),
});

function logVerifyPhase(phase: string, durationMs: number) {
  console.log("[verify] phase:", phase, durationMs, "ms");
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

    const result = await verifySubmissionById(parsed.data.submissionId, {
      onPhase: logVerifyPhase,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        verdict: result.verdict,
        reason: result.reason,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }
}
