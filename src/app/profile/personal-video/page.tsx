import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/session";
import { createClient } from "../../../../utils/supabase/server";
import { adminClient } from "../../../../utils/supabase/admin";
import PersonalVideoClient from "@/components/student/PersonalVideoClient";
import { resolvePersonalization } from "@/lib/personal-video/getPersonalization";
import {
  parsePhotoPathsFromSubmission,
  type PersonalizationPhotos,
  type PhotoKey,
} from "@/lib/personal-video/personalization";
import { PERSONAL_VIDEO_PATH } from "@/lib/post-login-redirect";

async function signPhotoUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: Record<PhotoKey, string | null>
): Promise<PersonalizationPhotos> {
  const result: PersonalizationPhotos = { photo1: null, photo2: null, photo3: null };
  for (const key of ["photo1", "photo2", "photo3"] as PhotoKey[]) {
    const path = paths[key];
    if (!path) continue;
    const { data } = await supabase.storage.from("images").createSignedUrl(path, 3600);
    result[key] = data?.signedUrl ?? null;
  }
  return result;
}

export default async function PersonalVideoPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect(`/?returnTo=${encodeURIComponent(PERSONAL_VIDEO_PATH)}`);
  }

  const supabase = await createClient();

  const [submissionRes, studentRes, stonesRes] = await Promise.all([
    supabase
      .from("submissions")
      .select("file_url, status")
      .eq("student_id", session.studentId)
      .eq("task_id", 7)
      .maybeSingle(),
    supabase
      .from("students")
      .select("full_name, mobile, team_id, niat_bootcamp_id, teams:team_id (name)")
      .eq("id", session.studentId)
      .single(),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", session.studentId)
      .eq("status", "accepted"),
  ]);

  const submission = submissionRes.data;
  const student = studentRes.data;
  const teamName =
    student?.teams && typeof student.teams === "object" && "name" in student.teams
      ? (student.teams as { name: string }).name
      : undefined;

  const personalization = await resolvePersonalization({
    fullName:        student?.full_name ?? session.fullName,
    tribeName:       teamName,
    bootcampId:      session.bootcampId,
    niatBootcampId:  (student?.niat_bootcamp_id as string | null) ?? undefined,
    mobile:          (student?.mobile as string | null) ?? session.mobile,
  });

  let photos: PersonalizationPhotos = { photo1: null, photo2: null, photo3: null };
  if (submission?.status === "accepted" && submission.file_url) {
    const paths = parsePhotoPathsFromSubmission(submission.file_url);
    photos = await signPhotoUrls(supabase, paths);
  }

  const stonesEarned = Math.min(stonesRes.count ?? 0, 6);

  return (
    <PersonalVideoClient
      session={session}
      initialPhotos={photos}
      copy={personalization.copy}
      isMockData={personalization.isMock}
      stonesEarned={stonesEarned}
    />
  );
}
