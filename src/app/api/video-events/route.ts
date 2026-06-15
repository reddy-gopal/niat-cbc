import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../utils/supabase/admin";

const schema = z.object({
  eventType: z.enum(["visit", "preview", "photo_upload", "download", "share"]),
});

export async function POST(request: Request) {
  try {
    const { student } = await getStudentFromRequest(request);
    if (!student) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Insert only if this student hasn't triggered this event type before
    const { count } = await adminClient
      .from("video_events")
      .select("id", { count: "exact", head: true })
      .eq("student_id", student.studentId)
      .eq("event_type", parsed.data.eventType);

    if ((count ?? 0) === 0) {
      await adminClient.from("video_events").insert({
        student_id: student.studentId,
        bootcamp_id: student.bootcampId,
        event_type: parsed.data.eventType,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
