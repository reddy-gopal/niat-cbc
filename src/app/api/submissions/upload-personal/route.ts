import { NextResponse } from "next/server";
import { getStudentFromRequest } from "@/lib/api-auth";
import { adminClient } from "../../../../../utils/supabase/admin";
import {
  parsePhotoPathsFromSubmission,
  serializePhotoPaths,
  storagePathForPhoto,
  type PhotoKey,
} from "@/lib/personal-video/personalization";

const TASK_ID = 7;
const VALID_SLOTS: PhotoKey[] = ["photo1", "photo2", "photo3"];

export async function POST(request: Request) {
  try {
    const { student: session } = await getStudentFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const slotRaw = formData.get("slot");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "File is required." }, { status: 400 });
    }

    const slot: PhotoKey =
      typeof slotRaw === "string" && VALID_SLOTS.includes(slotRaw as PhotoKey)
        ? (slotRaw as PhotoKey)
        : "photo1";

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Image file required." }, { status: 400 });
    }

    const extension = file.type === "image/png" ? "png" : "jpg";
    const storagePath = storagePathForPhoto(session.studentId, slot, extension);

    const { error: uploadError } = await adminClient.storage
      .from("images")
      .upload(storagePath, new Uint8Array(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ success: false, error: "Failed to upload file." }, { status: 500 });
    }

    const { data: existing } = await adminClient
      .from("submissions")
      .select("file_url")
      .eq("student_id", session.studentId)
      .eq("task_id", TASK_ID)
      .maybeSingle();

    const paths = parsePhotoPathsFromSubmission(existing?.file_url);
    paths[slot] = storagePath;
    const fileUrlJson = serializePhotoPaths(paths);

    const { error: subError } = await adminClient
      .from("submissions")
      .upsert(
        {
          student_id: session.studentId,
          bootcamp_id: session.bootcampId,
          section_id: session.sectionId,
          region_id: session.regionId,
          task_id: TASK_ID,
          status: "accepted",
          file_url: fileUrlJson,
          points: 0,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,task_id" }
      )
      .select()
      .single();

    if (subError) {
      return NextResponse.json({ success: false, error: "Failed to update record." }, { status: 500 });
    }

    return NextResponse.json({ success: true, slot, fileUrl: storagePath, paths });
  } catch (err) {
    console.error("Personalization upload error:", err);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
