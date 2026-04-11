import { NextResponse } from "next/server";
import { z } from "zod";
import { adminClient } from "../../../../../../utils/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  regionId: z.string().uuid().optional(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success || (!parsed.data.name && !parsed.data.regionId)) {
      return NextResponse.json(
        { success: false, error: "Please provide valid bootcamp updates." },
        { status: 400 }
      );
    }

    const { data: existing } = await adminClient
      .from("bootcamps")
      .select("id, name, region_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Bootcamp not found." },
        { status: 404 }
      );
    }

    const updatePayload: { name?: string; region_id?: string } = {};
    if (parsed.data.name) updatePayload.name = parsed.data.name;
    if (parsed.data.regionId) updatePayload.region_id = parsed.data.regionId;

    const { data, error } = await adminClient
      .from("bootcamps")
      .update(updatePayload)
      .eq("id", id)
      .select("id, name, region_id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "Unable to update bootcamp right now." },
        { status: 500 }
      );
    }

    await logAudit({
      adminId: admin.id,
      action: "update",
      entity: "bootcamp",
      entityId: id,
      note: `Updated bootcamp ${data.name}`,
      metadata: {
        previous_name: existing.name,
        new_name: data.name,
        previous_region_id: existing.region_id,
        new_region_id: data.region_id,
      },
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to update bootcamp right now." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const { data: existing } = await adminClient
      .from("bootcamps")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Bootcamp not found." },
        { status: 404 }
      );
    }

    const { count: sectionsCount } = await adminClient
      .from("sections")
      .select("id", { count: "exact", head: true })
      .eq("bootcamp_id", id);

    const { count: studentsCount } = await adminClient
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("bootcamp_id", id);

    if ((sectionsCount ?? 0) > 0 || (studentsCount ?? 0) > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete a bootcamp that already has sections or students.",
        },
        { status: 400 }
      );
    }

    const { error } = await adminClient.from("bootcamps").delete().eq("id", id);
    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to delete bootcamp right now." },
        { status: 500 }
      );
    }

    await logAudit({
      adminId: admin.id,
      action: "delete",
      entity: "bootcamp",
      entityId: id,
      note: `Deleted bootcamp ${existing.name}`,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to delete bootcamp right now." },
      { status: 500 }
    );
  }
}
