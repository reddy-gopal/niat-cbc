import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { CHALLENGES } from "@/lib/challenges";
import { verifySubmissionById } from "@/lib/submission-verify";
import { adminClient } from "../../../../../../utils/supabase/admin";

const bodySchema = z
  .object({
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional();

async function verifyWithConcurrency(
  submissionIds: string[],
  concurrency: number
): Promise<Array<{ id: string; ok: boolean; verdict?: "accepted" | "rejected"; error?: string }>> {
  const results: Array<{
    id: string;
    ok: boolean;
    verdict?: "accepted" | "rejected";
    error?: string;
  }> = [];

  let cursor = 0;

  async function worker() {
    while (cursor < submissionIds.length) {
      const currentIndex = cursor;
      cursor += 1;
      const id = submissionIds[currentIndex] as string;

      const result = await verifySubmissionById(id);
      if (result.ok) {
        results.push({ id, ok: true, verdict: result.verdict });
      } else {
        results.push({ id, ok: false, error: result.error });
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, submissionIds.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const bodyJson = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const limit = parsed.data?.limit ?? 50;
    const now = new Date().toISOString();

    const { data: pendingAttemptRows, error: pendingError } = await adminClient
      .from("submission_attempts")
      .select("id,submission_id,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit * 5);

    if (pendingError) {
      return NextResponse.json(
        { success: false, error: "Failed to load pending submission attempts." },
        { status: 500 }
      );
    }

    const latestPendingBySubmission = new Map<
      string,
      { attemptId: string; submissionId: string }
    >();
    for (const row of pendingAttemptRows ?? []) {
      const submissionId = row.submission_id as string;
      if (!submissionId || latestPendingBySubmission.has(submissionId)) continue;
      latestPendingBySubmission.set(submissionId, {
        attemptId: row.id as string,
        submissionId,
      });
      if (latestPendingBySubmission.size >= limit) break;
    }

    const selectedAttempts = Array.from(latestPendingBySubmission.values());
    const candidateSubmissionIds = selectedAttempts.map((row) => row.submissionId);

    if (selectedAttempts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total: 0,
          accepted: 0,
          rejected: 0,
          pending: 0,
          failed: 0,
          reconciled: 0,
          acceptedWithPoints: 0,
        },
      });
    }

    const { data: parentRows, error: parentError } = await adminClient
      .from("submissions")
      .select("id,status,points,ai_reason,verified_at,task_id")
      .in("id", candidateSubmissionIds);

    if (parentError) {
      return NextResponse.json(
        { success: false, error: "Failed to validate parent submissions for pending attempts." },
        { status: 500 }
      );
    }

    const parentMap = new Map<
      string,
      {
        id: string;
        status: string;
        points: number | null;
        ai_reason: string | null;
        verified_at: string | null;
        task_id: number;
      }
    >();
    for (const row of parentRows ?? []) {
      parentMap.set(row.id as string, {
        id: row.id as string,
        status: row.status as string,
        points: (row as { points?: number | null }).points ?? null,
        ai_reason: (row as { ai_reason?: string | null }).ai_reason ?? null,
        verified_at: (row as { verified_at?: string | null }).verified_at ?? null,
        task_id: (row as { task_id?: number }).task_id ?? 0,
      });
    }

    const attemptsToVerify = selectedAttempts.filter((row) => {
      const parent = parentMap.get(row.submissionId);
      return parent?.status === "pending";
    });

    const attemptsToReconcile = selectedAttempts.filter((row) => {
      const parent = parentMap.get(row.submissionId);
      return Boolean(parent && parent.status !== "pending");
    });

    const submissionIds = attemptsToVerify.map((row) => row.submissionId);
    const attemptIds = selectedAttempts.map((row) => row.attemptId);

    // Force retry eligibility for legacy stuck rows before re-verification.
    if (submissionIds.length > 0) {
      const { error: resetSubmissionsError } = await adminClient
        .from("submissions")
        .update({
          verification_attempts: 0,
          last_attempted_at: null,
          updated_at: now,
        })
        .in("id", submissionIds);

      if (resetSubmissionsError) {
        return NextResponse.json(
          { success: false, error: "Failed to prepare submissions for retry." },
          { status: 500 }
        );
      }
    }

    const { error: resetAttemptsError } = await adminClient
      .from("submission_attempts")
      .update({
        verification_attempts: 0,
        last_attempted_at: null,
      })
      .in("id", attemptIds);

    if (resetAttemptsError) {
      return NextResponse.json(
        { success: false, error: "Failed to prepare pending attempts for retry." },
        { status: 500 }
      );
    }

    let reconciled = 0;
    for (const row of attemptsToReconcile) {
      const parent = parentMap.get(row.submissionId);
      if (!parent) continue;
      const challenge = CHALLENGES.find((item) => item.id === parent.task_id);
      const parentStatus =
        parent.status === "accepted" || parent.status === "rejected"
          ? parent.status
          : "rejected";
      const parentPoints =
        parentStatus === "accepted"
          ? Number(parent.points ?? challenge?.points ?? 0)
          : 0;
      const parentReason =
        parent.ai_reason ??
        (parentStatus === "accepted"
          ? "Accepted on parent submission; attempt reconciled."
          : "Not accepted on parent submission; attempt reconciled.");
      const parentVerifiedAt = parent.verified_at ?? now;

      const { error: reconcileError } = await adminClient
        .from("submission_attempts")
        .update({
          status: parentStatus,
          points: parentPoints,
          ai_reason: parentReason,
          verified_at: parentVerifiedAt,
        })
        .eq("id", row.attemptId);

      if (!reconcileError) {
        reconciled += 1;
      }
    }

    const verifyResults =
      submissionIds.length > 0 ? await verifyWithConcurrency(submissionIds, 3) : [];

    const { data: refreshedAttempts, error: refreshedError } = await adminClient
      .from("submission_attempts")
      .select("id,status")
      .in("id", attemptIds);

    if (refreshedError) {
      return NextResponse.json(
        { success: false, error: "Re-verification ran, but failed to load updated attempts." },
        { status: 500 }
      );
    }

    const accepted = (refreshedAttempts ?? []).filter((row) => row.status === "accepted").length;
    const rejected = (refreshedAttempts ?? []).filter((row) => row.status === "rejected").length;
    const pending = (refreshedAttempts ?? []).filter((row) => row.status === "pending").length;
    const failed = verifyResults.filter((row) => !row.ok).length;

    const acceptedSubmissionIds = verifyResults
      .filter((row) => row.ok && row.verdict === "accepted")
      .map((row) => row.id);
    let acceptedWithPoints = 0;
    if (acceptedSubmissionIds.length > 0) {
      const { data: acceptedParents } = await adminClient
        .from("submissions")
        .select("id,status,points")
        .in("id", acceptedSubmissionIds);
      acceptedWithPoints = (acceptedParents ?? []).filter(
        (row) => row.status === "accepted" && Number(row.points ?? 0) > 0
      ).length;
    }

    return NextResponse.json({
      success: true,
      data: {
        total: attemptIds.length,
        accepted,
        rejected,
        pending,
        failed,
        reconciled,
        acceptedWithPoints,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to re-verify pending submissions." },
      { status: 500 }
    );
  }
}
