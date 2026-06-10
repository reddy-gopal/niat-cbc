import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { adminClient } from "../../../../../utils/supabase/admin";

const WORKSHOPS = ["iot", "smart_watch", "neuroscience", "entrepreneurship"] as const;

const saveSchema = z.object({
  bootcampId: z.string().uuid(),
  sheets: z.array(
    z.object({
      workshop:  z.enum(WORKSHOPS),
      sheet_url: z.string().url().or(z.literal("")),
    })
  ),
});

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const bootcampId = searchParams.get("bootcampId");
    if (!bootcampId) return NextResponse.json({ success: false, error: "bootcampId required" }, { status: 400 });

    const { data, error } = await adminClient
      .from("bootcamp_workshop_sheets")
      .select("workshop, sheet_url")
      .eq("bootcamp_id", bootcampId);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });

    const { bootcampId, sheets } = parsed.data;
    const rows = sheets
      .filter((s) => s.sheet_url.trim() !== "")
      .map((s) => ({ bootcamp_id: bootcampId, workshop: s.workshop, sheet_url: s.sheet_url }));

    // Upsert — replace existing entries for this bootcamp
    await adminClient.from("bootcamp_workshop_sheets").delete().eq("bootcamp_id", bootcampId);
    if (rows.length > 0) {
      const { error } = await adminClient.from("bootcamp_workshop_sheets").insert(rows);
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}
