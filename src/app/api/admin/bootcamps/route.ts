import { NextResponse } from "next/server";
import { z } from "zod";
import { adminClient } from "../../../../../utils/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  regionId: z.string().uuid(),
  name: z.string().min(2).max(120),
});

export async function GET() {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from("bootcamps")
      .select("id,name,date,region_id,created_at,regions(name)")
      .order("date", { ascending: false });
    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to fetch bootcamps right now." },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to fetch bootcamps right now." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Please provide valid bootcamp details." },
        { status: 400 }
      );
    }
    const { data, error } = await adminClient
      .from("bootcamps")
      .insert({
        region_id: parsed.data.regionId,
        name: parsed.data.name,
        date: new Date().toISOString().slice(0, 10),
      })
      .select("id,name,date,region_id,created_at")
      .single();
    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to create bootcamp right now." },
        { status: 500 }
      );
    }
    await logAudit({
      adminId: admin.id,
      action: "create",
      entity: "bootcamp",
      entityId: data.id,
      note: `Created bootcamp ${data.name}`,
    });
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to create bootcamp right now." },
      { status: 500 }
    );
  }
}
