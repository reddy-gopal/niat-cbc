import { NextResponse } from "next/server";
import { z } from "zod";
import { adminClient } from "../../../../../utils/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { generateSectionSlug } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  bootcampId: z.string().uuid(),
  label: z.string().min(1).max(10),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid section label." },
        { status: 400 }
      );
    }

    const { data: bootcamp } = await adminClient
      .from("bootcamps")
      .select("id, date, regions(name)")
      .eq("id", parsed.data.bootcampId)
      .single();

    if (!bootcamp) {
      return NextResponse.json(
        { success: false, error: "Bootcamp not found." },
        { status: 400 }
      );
    }

    const regionName = (bootcamp.regions as { name?: string } | null)?.name ?? "region";
    const baseSlug = generateSectionSlug(regionName, bootcamp.date, parsed.data.label);
    let slug = baseSlug;
    let counter = 2;

    while (true) {
      const { data: existing } = await adminClient
        .from("sections")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    const { data, error } = await adminClient
      .from("sections")
      .insert({
        bootcamp_id: parsed.data.bootcampId,
        label: parsed.data.label,
        slug,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to create section right now." },
        { status: 500 }
      );
    }

    await logAudit({
      adminId: admin.id,
      action: "create",
      entity: "section",
      entityId: data.id,
      note: `Created section ${data.label}`,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    return NextResponse.json(
      {
        success: true,
        data: { ...data, joinUrl: `${siteUrl}/join/${data.slug}` },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to create section right now." },
      { status: 500 }
    );
  }
}
