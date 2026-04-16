import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { adminClient } from "../../../../../../../utils/supabase/admin";

type Props = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Props) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const now = new Date().toISOString();

    const { data: submission } = await adminClient
      .from("submissions")
      .select("id, student_id, points")
      .eq("id", id)
      .maybeSingle();

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found." },
        { status: 400 }
      );
    }

    const oldPoints = submission.points ?? 0;

    const { error } = await adminClient
      .from("submissions")
      .update({
        resubmit_count: 0,
        status: "not_started",
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to unlock submission right now." },
        { status: 500 }
      );
    }

    if (oldPoints > 0) {
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
          const { error: teamUpdateError } = await adminClient
            .from("teams")
            .update({
              total_points: Math.max(0, team.total_points - oldPoints),
            })
            .eq("id", team.id);

          if (teamUpdateError) {
            return NextResponse.json(
              { success: false, error: "Unable to deduct team points right now." },
              { status: 500 }
            );
          }

          await logAudit({
            adminId: admin.id,
            action: "unlock_points_deducted",
            entity: "teams",
            entityId: team.id,
            metadata: {
              deducted: oldPoints,
              submission_id: id,
            },
          });
        }
      }
    }

    await logAudit({
      adminId: admin.id,
      action: "unlock",
      entity: "submission",
      entityId: id,
      note: "Unlocked submission attempts",
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to unlock submission right now." },
      { status: 500 }
    );
  }
}
