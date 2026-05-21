import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentFromRequest } from "@/lib/api-auth";
import { TICKET_CATEGORIES } from "@/lib/help-tickets";
import { adminClient } from "../../../../utils/supabase/admin";

const categoryValues = TICKET_CATEGORIES.map((c) => c.value) as [string, ...string[]];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function GET(request: Request) {
  try {
    const { student: session } = await getStudentFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await adminClient
      .from("help_tickets")
      .select("id, title, description, category, image_path, status, admin_note, created_at, updated_at")
      .eq("student_id", session.studentId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to load tickets right now." },
        { status: 500 }
      );
    }

    const tickets = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      adminNote: row.admin_note,
      hasImage: Boolean(row.image_path),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ success: true, data: { tickets } }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to load tickets right now." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { student: session } = await getStudentFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const file = formData.get("file");

    const parsed = z
      .object({
        title: z.string().min(3).max(200),
        description: z.string().min(10).max(5000),
        category: z.enum(categoryValues),
      })
      .safeParse({ title, description, category });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid title, description, and category." },
        { status: 400 }
      );
    }

    const { data: ticket, error: insertError } = await adminClient
      .from("help_tickets")
      .insert({
        student_id: session.studentId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        status: "open",
      })
      .select("id")
      .single();

    if (insertError || !ticket) {
      return NextResponse.json(
        { success: false, error: "Unable to create ticket right now." },
        { status: 500 }
      );
    }

    let imagePath: string | null = null;

    if (file instanceof File && file.size > 0) {
      if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
        await adminClient.from("help_tickets").delete().eq("id", ticket.id);
        return NextResponse.json(
          { success: false, error: "Only PNG or JPG images are allowed." },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        await adminClient.from("help_tickets").delete().eq("id", ticket.id);
        return NextResponse.json(
          { success: false, error: "Image must be 10MB or smaller." },
          { status: 400 }
        );
      }

      const extension = file.type === "image/png" ? "png" : "jpg";
      imagePath = `${session.studentId}/${ticket.id}-${Date.now()}.${extension}`;

      const { error: uploadError } = await adminClient.storage
        .from("ticket")
        .upload(imagePath, new Uint8Array(await file.arrayBuffer()), {
          contentType: file.type === "image/jpg" ? "image/jpeg" : file.type,
          upsert: false,
        });

      if (uploadError) {
        await adminClient.from("help_tickets").delete().eq("id", ticket.id);
        return NextResponse.json(
          { success: false, error: "Failed to upload image." },
          { status: 500 }
        );
      }

      const { error: updateError } = await adminClient
        .from("help_tickets")
        .update({ image_path: imagePath, updated_at: new Date().toISOString() })
        .eq("id", ticket.id);

      if (updateError) {
        await adminClient.storage.from("ticket").remove([imagePath]);
        await adminClient.from("help_tickets").delete().eq("id", ticket.id);
        return NextResponse.json(
          { success: false, error: "Unable to save ticket image." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: { id: ticket.id, hasImage: Boolean(imagePath) },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Create ticket error:", err);
    return NextResponse.json(
      { success: false, error: "Unable to create ticket right now." },
      { status: 500 }
    );
  }
}
