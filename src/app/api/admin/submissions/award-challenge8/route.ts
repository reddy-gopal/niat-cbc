import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { adminClient } from "../../../../../../utils/supabase/admin";

const schema = z.object({ studentId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid student ID." },
        { status: 400 }
      );
    }

    const { error } = await adminClient
      .from("submissions")
      .update({
        status: "accepted",
        points: 5,
        updated_at: new Date().toISOString(),
        override_by: admin.id,
        override_note: "Challenge 8 manually awarded",
      })
      .eq("student_id", parsed.data.studentId)
      .eq("task_id", 8);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to award challenge points right now." },
        { status: 500 }
      );
    }

    await logAudit({
      adminId: admin.id,
      action: "award",
      entity: "challenge8",
      entityId: parsed.data.studentId,
      note: "Manually awarded 5 points for challenge 8",
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to award challenge points right now." },
      { status: 500 }
    );
  }
}
