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
        points: 0,
        ai_reason: null,
        verified_at: null,
        verification_attempts: 0,
        last_attempted_at: null,
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to unlock submission right now." },
        { status: 500 }
      );
    }

    await logAudit({
      adminId: admin.id,
      action: "unlock",
      entity: "submission",
      entityId: id,
      note: "Unlocked submission attempts",
      metadata: { old_points: oldPoints }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to unlock submission right now." },
      { status: 500 }
    );
  }
}
