import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { resolveStudentUtmParams } from "@/lib/utils";
import { getStudentSession } from "@/lib/session";
import type { Submission, Student } from "@/types/database";
import { adminClient } from "../../../utils/supabase/admin";
import { createClient } from "../../../utils/supabase/server";

type StudentWithContext = Student & {
  sections: { label: string } | null;
  bootcamps: { name: string; date: string } | null;
  regions: { name: string } | null;
  teams: { name: string; invite_code: string; leader_id: string } | null;
};

const Dashboard = dynamic(() => import("@/components/student/Dashboard"));
const COMPLETED_ATTEMPT_STATUSES = new Set(["accepted", "approved"]);
const REFERRAL_CHALLENGE_ID = 3;

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const normalizeQueryValue = (value?: string | string[]): string | undefined => {
  const item = Array.isArray(value) ? value[0] : value;
  const normalized = item?.trim();
  return normalized ? normalized : undefined;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const rawSearchParams = await searchParams;
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  const supabase = await createClient();

  const [studentResponse, submissionsResponse, scoreResponse] = await Promise.all([
    supabase
      .from("students")
      .select(
        `
        id,
        full_name,
        mobile,
        section_id,
        bootcamp_id,
        region_id,
        created_at,
        team_id,
        sections:section_id (label),
        bootcamps:bootcamp_id (name, date),
        regions:region_id (name),
        teams:team_id (name, invite_code, leader_id)
      `
      )
      .eq("id", session.studentId)
      .maybeSingle(),
    supabase
      .from("submissions")
      .select(
        "id,student_id,bootcamp_id,section_id,region_id,task_id,streak_day,file_url,status,points,ai_reason,resubmit_count,verification_attempts,last_attempted_at,verified_at,override_by,override_note,created_at,updated_at"
      )
      .eq("student_id", session.studentId)
      .order("task_id", { ascending: true }),
    adminClient
      .from("submission_attempts")
      .select("points, task_id, status")
      .eq("student_id", session.studentId)
      .not("points", "is", null),
  ]);

  const student = studentResponse.data as StudentWithContext | null;
  if (!student || !student.sections || !student.bootcamps || !student.regions) {
    redirect("/invalid");
  }

  const utmParams = resolveStudentUtmParams({
    utmSource: normalizeQueryValue(rawSearchParams.utm_source),
    utmMedium: normalizeQueryValue(rawSearchParams.utm_medium),
    utmCampaign: normalizeQueryValue(rawSearchParams.utm_campaign),
    bootcampName: student.bootcamps.name,
    bootcampDate: student.bootcamps.date,
    regionName: student.regions.name,
    sectionLabel: student.sections.label,
  });

  const requiresCanonicalUtm =
    !normalizeQueryValue(rawSearchParams.utm_source) ||
    !normalizeQueryValue(rawSearchParams.utm_medium) ||
    !normalizeQueryValue(rawSearchParams.utm_campaign);

  if (requiresCanonicalUtm) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(rawSearchParams)) {
      const first = Array.isArray(value) ? value[0] : value;
      if (first) query.set(key, first);
    }
    query.set("utm_source", utmParams.utmSource);
    query.set("utm_medium", utmParams.utmMedium);
    query.set("utm_campaign", utmParams.utmCampaign);
    redirect(`/dashboard?${query.toString()}`);
  }

  const submissions = (submissionsResponse.data ?? []) as Submission[];
  if (scoreResponse.error) {
    console.error("[dashboard] Score fetch failed:", scoreResponse.error);
  }

  const attemptScore =
    (scoreResponse.data as Array<{
      points: number | string | null;
      task_id: number | null;
      status: string | null;
    }> | null) ?? [];
  const completedAttemptScore = attemptScore.filter((attempt) =>
    COMPLETED_ATTEMPT_STATUSES.has(String(attempt.status ?? "").trim().toLowerCase())
  );
  const nonReferralAttemptScore = completedAttemptScore.filter(
    (attempt) => Number(attempt.task_id) !== REFERRAL_CHALLENGE_ID
  );
  const referralSubmissionRows = submissions.filter(
    (row) => row.task_id === REFERRAL_CHALLENGE_ID
  );
  const latestReferralSubmission = referralSubmissionRows
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime()
    )[0];
  const referralSubmissionPoints =
    latestReferralSubmission &&
    COMPLETED_ATTEMPT_STATUSES.has(
      String(latestReferralSubmission.status ?? "").trim().toLowerCase()
    )
      ? Number(latestReferralSubmission.points ?? 0) || 0
      : 0;

  const totalPoints = nonReferralAttemptScore.reduce(
    (sum, attempt) => sum + (Number(attempt.points ?? 0) || 0),
    0
  ) + referralSubmissionPoints;

  const completedChallengeSet = new Set(
    nonReferralAttemptScore
      .map((attempt) => {
        const taskId = Number(attempt.task_id);
        return Number.isFinite(taskId) ? taskId : null;
      })
      .filter((taskId): taskId is number => taskId != null)
  );
  if (
    latestReferralSubmission &&
    COMPLETED_ATTEMPT_STATUSES.has(
      String(latestReferralSubmission.status ?? "").trim().toLowerCase()
    )
  ) {
    completedChallengeSet.add(REFERRAL_CHALLENGE_ID);
  }
  const completedChallenges = completedChallengeSet.size;

  return (
    <Dashboard
      student={student}
      initialSubmissions={submissions}
      session={{
        ...session,
        utmSource: utmParams.utmSource,
        utmMedium: utmParams.utmMedium,
        utmCampaign: utmParams.utmCampaign,
      }}
      totalPoints={totalPoints}
      completedChallenges={completedChallenges}
    />
  );
}
