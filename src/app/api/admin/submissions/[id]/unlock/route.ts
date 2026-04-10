import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { adminClient } from "../../../../../../../utils/supabase/admin";

type Props = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Props) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const { error } = await adminClient
      .from("submissions")
      .update({
        resubmit_count: 0,
        status: "not_started",
        updated_at: new Date().toISOString(),
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
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to unlock submission right now." },
      { status: 500 }
    );
  }
}
