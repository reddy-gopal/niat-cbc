import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import JoinPage from "@/components/join/JoinPage";
import { getStudentSession } from "@/lib/session";
import { createClient } from "../../../../../utils/supabase/server";

type TeamJoinRouteProps = {
  params: Promise<{ "invite-code": string }>;
};

const getTeamDetails = cache(async (inviteCode: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select(`
      id,
      name,
      section_id,
      bootcamp_id,
      sections (
        id,
        label,
        bootcamps (
          id,
          name,
          date,
          region_id,
          regions (
            id,
            name
          )
        )
      ),
      students!teams_leader_id_fkey(full_name)
    `)
    .eq("invite_code", inviteCode)
    .maybeSingle();

  return data as any;
});

export async function generateMetadata({ params }: TeamJoinRouteProps): Promise<Metadata> {
  const { "invite-code": inviteCode } = await params;
  const teamData = await getTeamDetails(inviteCode);

  if (!teamData) {
    return { title: "Join Tribe — NIAT CBC" };
  }

  const title = `Join ${teamData.name} — NIAT CBC`;
  const description = `You've been invited to join ${teamData.name} the Community Building Championship`;

  return { title, description };
}

export default async function TeamJoinPage({ params }: TeamJoinRouteProps) {
  const { "invite-code": inviteCode } = await params;
  const session = await getStudentSession();

  if (session) {
    redirect("/dashboard");
  }

  const teamData = await getTeamDetails(inviteCode);

  if (!teamData || !teamData.sections || !teamData.sections.bootcamps || !teamData.sections.bootcamps.regions) {
    redirect("/invalid");
  }

  const leaderName = teamData.students ? teamData.students.full_name : "Unknown Leader";

  return (
    <JoinPage
      sectionId={teamData.sections.id}
      sectionLabel={teamData.sections.label}
      bootcampId={teamData.sections.bootcamps.id}
      bootcampName={teamData.sections.bootcamps.name}
      bootcampDate={teamData.sections.bootcamps.date}
      regionId={teamData.sections.bootcamps.regions.id}
      regionName={teamData.sections.bootcamps.regions.name}
      formsRedirectCode={`join/team/${inviteCode}`}
      inviteCode={inviteCode}
      teamName={teamData.name}
      leaderName={leaderName}
    />
  );
}
