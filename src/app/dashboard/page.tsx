import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { resolveStudentUtmParams } from "@/lib/utils";
import { getStudentSession } from "@/lib/session";
import type { StudentChallengeStatus, Student } from "@/types/database";
import { createClient } from "../../../utils/supabase/server";

type StudentWithContext = Student & {
  sections: { label: string } | null;
  bootcamps: { name: string; date: string } | null;
  regions: { name: string } | null;
  teams: { name: string; invite_code: string; leader_id: string } | null;
};

const Dashboard = dynamic(() => import("@/components/student/Dashboard"));

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

  const [studentResponse, challengeStatusResponse] = await Promise.all([
    supabase
      .from("students")
      .select(
        `
        id,
        full_name,
        mobile,
        total_points,
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
      .from("student_challenge_status")
      .select("*")
      .eq("student_id", session.studentId)
      .eq("bootcamp_id", session.bootcampId),
  ]);

  const student = studentResponse.data as (StudentWithContext & { total_points: number }) | null;
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

  const challengeStatuses = (challengeStatusResponse.data ?? []) as StudentChallengeStatus[];
  const completedChallenges = challengeStatuses.filter((c) => c.is_completed).length;
  const totalPoints = student.total_points ?? 0;

  return (
    <Dashboard
      student={student}
      initialChallengeStatuses={challengeStatuses}
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
