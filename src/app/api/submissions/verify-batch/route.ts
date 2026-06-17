import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { isValidInternalSecret } from "@/lib/internal-api";
import { verifySubmissionById } from "@/lib/submission-verify";
import { adminClient } from "../../../../../utils/supabase/admin";

type SubmissionBatchRow = {
  id: string;
  last_attempted_at: string | null;
  verification_attempts: number;
};

export async function POST(request: Request) {
  const secret = request.headers.get("x-internal-secret");
  if (!isValidInternalSecret(secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const thresholdMs = Date.now() - 60 * 1000;

    const { data: candidates, error: queryError } = await adminClient
      .from("submissions")
      .select("id,last_attempted_at,verification_attempts")
      .eq("status", "pending")
      .lt("verification_attempts", 3)
      .limit(20);

    if (queryError) {
      return NextResponse.json(
        { success: false, error: "Failed to query submissions." },
        { status: 500 }
      );
    }

    const rows = (candidates ?? []) as SubmissionBatchRow[];
    const eligible = rows
      .filter(
        (r) =>
          !r.last_attempted_at || new Date(r.last_attempted_at).getTime() < thresholdMs
      )
      .slice(0, 1);

    if (eligible.length === 0) {
      return NextResponse.json({ accepted: true, count: 0 });
    }

    const claimNow = new Date().toISOString();
    const ids = eligible.map((r) => r.id);

    const { error: claimError } = await adminClient
      .from("submissions")
      .update({ last_attempted_at: claimNow, updated_at: claimNow })
      .in("id", ids);

    if (claimError) {
      return NextResponse.json(
        { success: false, error: "Failed to claim submissions for processing." },
        { status: 500 }
      );
    }

    const submissionId = ids[0] as string;

    waitUntil(
      (async () => {
        try {
          const result = await verifySubmissionById(submissionId);
          if (!result.ok) {
            console.error("[verify-batch] background verify failed", {
              submissionId,
              status: result.status,
              error: result.error,
            });
          }
        } catch (err) {
          console.error("[verify-batch] background verify threw", { submissionId, err });
        }
      })()
    );

    return NextResponse.json({ accepted: true, count: eligible.length });
  } catch {
    return NextResponse.json(
      { success: false, error: "Batch verification failed." },
      { status: 500 }
    );
  }
}
