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

    // Insert only if this student hasn't triggered this event type before (once per user)
    const { count, error: countErr } = await adminClient
      .from("video_events")
      .select("id", { count: "exact", head: true })
      .eq("student_id", student.studentId)
      .eq("event_type", parsed.data.eventType);

    if (countErr) {
      console.error("[video-events] count error:", countErr.message, countErr.code);
    }

    if ((count ?? 0) === 0) {
      const { error: insertErr } = await adminClient.from("video_events").insert({
        student_id: student.studentId,
        bootcamp_id: student.bootcampId,
        event_type: parsed.data.eventType,
      });
      if (insertErr) {
        console.error("[video-events] insert error:", insertErr.message, insertErr.code, "event:", parsed.data.eventType);
        return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[video-events] unexpected error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
