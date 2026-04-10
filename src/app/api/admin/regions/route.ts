import { NextResponse } from "next/server";
import { z } from "zod";
import { adminClient } from "../../../../../utils/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

const schema = z.object({ name: z.string().min(2).max(60) });

export async function GET() {
  try {
    await requireAdmin();
    const { data, error } = await adminClient.from("regions").select("*").order("name");
    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to fetch regions right now." },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to fetch regions right now." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid region name." },
        { status: 400 }
      );
    }
    const { data, error } = await adminClient
      .from("regions")
      .insert({ name: parsed.data.name })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to create region right now." },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to create region right now." },
      { status: 500 }
    );
  }
}
