import { NextResponse } from "next/server";
import { adminClient } from "../../../../../utils/supabase/admin";

type SubmissionBatchRow = {
  id: string;
  last_attempted_at: string | null;
  verification_attempts: number;
};

export async function POST(request: Request) {
  const secret = request.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { success: false, error: "NEXT_PUBLIC_APP_URL is not set." },
      { status: 500 }
    );
  }

  const internalSecret = process.env.INTERNAL_API_SECRET ?? "";

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
      .slice(0, 5);

    if (eligible.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        succeeded: 0,
        failed: 0,
      });
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

    const verifyUrl = `${baseUrl.replace(/\/$/, "")}/api/submissions/verify`;

    const results = await Promise.allSettled(
      ids.map((submissionId) =>
        fetch(verifyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({ submissionId }),
        }).then(async (res) => {
          const json = (await res.json()) as { success?: boolean };
          return { ok: res.ok && Boolean(json.success) };
        })
      )
    );

    let succeeded = 0;
    let failed = 0;
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) {
        succeeded += 1;
      } else {
        failed += 1;
      }
    }

    return NextResponse.json({
      success: true,
      processed: eligible.length,
      succeeded,
      failed,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Batch verification failed." },
      { status: 500 }
    );
  }
}
