import { NextResponse } from "next/server";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../../utils/supabase/admin";
import { normalizeInstagramHandleInput, parseInstagramProfileInput } from "@/lib/instagram-handle";

type PatchBody = {
  instagram_handle?: unknown;
};

export async function PATCH(request: Request) {
  try {
    const { student: session, error: authError } = await getStudentFromRequest(request);
    if (!session || authError) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: PatchBody;
    try {
      body = (await request.json()) as PatchBody;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const raw = body.instagram_handle;
    if (typeof raw !== "string") {
      return NextResponse.json(
        { success: false, error: "instagram_handle must be a string." },
        { status: 400 }
      );
    }

    const parsed = parseInstagramProfileInput(raw);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }
    const normalized = parsed.username;

    const { data: existingRow } = await adminClient
      .from("students")
      .select("instagram_handle")
      .eq("id", session.studentId)
      .maybeSingle();

    const already = normalizeInstagramHandleInput(String(existingRow?.instagram_handle ?? ""));
    if (already) {
      return NextResponse.json(
        {
          success: false,
          error: "Your Instagram profile is already saved and cannot be changed.",
        },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await adminClient
      .from("students")
      .update({ instagram_handle: normalized })
      .eq("id", session.studentId)
      .is("instagram_handle", null)
      .select(
        "id, full_name, mobile, instagram_handle, section_id, bootcamp_id, region_id, team_id, created_at"
      )
      .maybeSingle();

    if (updateError) {
      const code = (updateError as { code?: string }).code;
      if (code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "This Instagram profile is already linked to another student.",
          },
          { status: 409 }
        );
      }
      console.error("[PATCH instagram-handle] update failed", updateError);
      return NextResponse.json(
        { success: false, error: "Could not save your profile link. Try again." },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: "Your Instagram profile is already saved and cannot be changed.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: { student: updated } });
  } catch (err) {
    console.error("[PATCH instagram-handle]", err);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
