import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminClient } from "../../../../../../../utils/supabase/admin";

type Props = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Props) {
  try {
    await requireAdmin();
    const { id } = await params;

    const { data: ticket } = await adminClient
      .from("help_tickets")
      .select("image_path")
      .eq("id", id)
      .single();

    if (!ticket?.image_path) {
      return NextResponse.json({ success: false, error: "Ticket image not found." }, { status: 400 });
    }

    const { data, error } = await adminClient.storage
      .from("ticket")
      .createSignedUrl(ticket.image_path, 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { success: false, error: "Unable to load image right now." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { signedUrl: data.signedUrl } }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to load image right now." },
      { status: 500 }
    );
  }
}
