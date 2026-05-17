import { NextResponse } from "next/server";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../utils/supabase/admin";
const TASK_ID = 7;

export async function POST(request: Request) {
  try {
    const { student: session } = await getStudentFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "File is required." }, { status: 400 });
    }

    const extension = file.type === "image/png" ? "png" : "jpg";
    const storagePath = `personalization/${session.studentId}.${extension}`;

    const { error: uploadError } = await adminClient.storage
      .from("images")
      .upload(storagePath, new Uint8Array(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ success: false, error: "Failed to upload file." }, { status: 500 });
    }

    // Upsert submission record
    const { data: submission, error: subError } = await adminClient
      .from("submissions")
      .upsert({
        student_id: session.studentId,
        bootcamp_id: session.bootcampId,
        section_id: session.sectionId,
        region_id: session.regionId,
        task_id: TASK_ID,
        status: "accepted",
        file_url: storagePath,
        points: 0,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id,task_id' })
      .select()
      .single();

    if (subError) {
      return NextResponse.json({ success: false, error: "Failed to update record." }, { status: 500 });
    }

    return NextResponse.json({ success: true, fileUrl: storagePath });
  } catch (err) {
    console.error("Personalization upload error:", err);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
