import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminClient } from "../../../../../../../utils/supabase/admin";

type Props = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Props) {
  try {
    await requireAdmin();
    const { id } = await params;

    const { data: submission } = await adminClient
      .from("submissions")
      .select("file_url")
      .eq("id", id)
      .single();

    if (!submission?.file_url) {
      return NextResponse.json(
        { success: false, error: "Submission image not found." },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient.storage
      .from("submissions")
      .createSignedUrl(submission.file_url, 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { success: false, error: "Unable to load submission image right now." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: { signedUrl: data.signedUrl } },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to load submission image right now." },
      { status: 500 }
    );
  }
}
