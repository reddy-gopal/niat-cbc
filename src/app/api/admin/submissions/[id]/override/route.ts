import { NextResponse } from "next/server";
import { z } from "zod";
import { CHALLENGES } from "@/lib/challenges";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { adminClient } from "../../../../../../../utils/supabase/admin";

const schema = z.object({
  verdict: z.enum(["accepted", "rejected"]),
  note: z.string().max(500).optional().default(""),
});

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid verdict and note." },
        { status: 400 }
      );
    }

    const { data: submission } = await adminClient
      .from("submissions")
      .select("id, status, task_id, points, student_id")
      .eq("id", id)
      .single();
    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found." },
        { status: 400 }
      );
    }

    const challenge = CHALLENGES.find((c) => c.id === submission.task_id);
    const newPoints = parsed.data.verdict === "accepted" ? challenge?.points ?? 0 : 0;
    const oldPoints = submission.points ?? 0;

    const now = new Date().toISOString();
    const { error } = await adminClient
      .from("submissions")
      .update({
        status: parsed.data.verdict,
        points: newPoints,
        override_by: admin.id,
        override_note: parsed.data.note,
        verified_at: now,
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to update submission right now." },
        { status: 500 }
      );
    }

    const delta = newPoints - oldPoints;
    if (delta !== 0) {
      const { data: student } = await adminClient
        .from("students")
        .select("team_id")
        .eq("id", submission.student_id)
        .maybeSingle();

      if (student?.team_id) {
        const { data: team } = await adminClient
          .from("teams")
          .select("id, total_points")
          .eq("id", student.team_id)
          .maybeSingle();

        if (team) {
          const now = new Date().toISOString();
          const { error: teamUpdateError } = await adminClient
            .from("teams")
            .update({
              total_points: Math.max(0, team.total_points + delta),
              last_point_at: now,
            })
            .eq("id", team.id);

          if (teamUpdateError) {
            return NextResponse.json(
              { success: false, error: "Unable to reconcile team points right now." },
              { status: 500 }
            );
          }

          await logAudit({
            adminId: admin.id,
            action: "override_points_reconciled",
            entity: "teams",
            entityId: team.id,
            metadata: {
              delta,
              old_points: oldPoints,
              new_points: newPoints,
              submission_id: id,
            },
          });
        }
      }
    }

    const { data: latestAttempt } = await adminClient
      .from("submission_attempts")
      .select("id")
      .eq("submission_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestAttempt?.id) {
      const manualReason = parsed.data.note.trim()
        ? `Manual override: ${parsed.data.note.trim()}`
        : `Manually marked as ${parsed.data.verdict}.`;

      const { error: attemptSyncError } = await adminClient
        .from("submission_attempts")
        .update({
          status: parsed.data.verdict,
          points: newPoints,
          ai_reason: manualReason,
          verified_at: now,
        })
        .eq("id", latestAttempt.id);

      if (attemptSyncError) {
        return NextResponse.json(
          { success: false, error: "Submission updated, but latest attempt sync failed." },
          { status: 500 }
        );
      }
    }

    await logAudit({
      adminId: admin.id,
      action: "override",
      entity: "submission",
      entityId: id,
      note: parsed.data.note,
      metadata: { previous_status: submission.status, new_status: parsed.data.verdict },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to update submission right now." },
      { status: 500 }
    );
  }
}
