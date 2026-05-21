import { NextResponse } from "next/server";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../../utils/supabase/admin";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { student: session } = await getStudentFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data: ticket, error } = await adminClient
      .from("help_tickets")
      .select("id, student_id, image_path")
      .eq("id", id)
      .maybeSingle();

    if (error || !ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found." }, { status: 404 });
    }

    if (ticket.student_id !== session.studentId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    if (!ticket.image_path) {
      return NextResponse.json({ success: false, error: "No image for this ticket." }, { status: 400 });
    }

    const { data, error: signedError } = await adminClient.storage
      .from("ticket")
      .createSignedUrl(ticket.image_path, 60);

    if (signedError || !data?.signedUrl) {
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
