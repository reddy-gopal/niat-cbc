import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { TICKET_STATUSES } from "@/lib/help-tickets";
import { adminClient } from "../../../../../../utils/supabase/admin";

const schema = z.object({
  status: z.enum(TICKET_STATUSES),
  adminNote: z.string().max(2000).optional().default(""),
});

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid status." },
        { status: 400 }
      );
    }

    const { data: existing } = await adminClient
      .from("help_tickets")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ticket not found." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const { error } = await adminClient
      .from("help_tickets")
      .update({
        status: parsed.data.status,
        admin_note: parsed.data.adminNote || null,
        updated_by: admin.id,
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to update ticket right now." },
        { status: 500 }
      );
    }

    await logAudit({
      adminId: admin.id,
      action: "update_status",
      entity: "help_ticket",
      entityId: id,
      note: parsed.data.adminNote || null,
      metadata: {
        previous_status: existing.status,
        new_status: parsed.data.status,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to update ticket right now." },
      { status: 500 }
    );
  }
}
