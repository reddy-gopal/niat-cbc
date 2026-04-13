import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/session";
import InvitePageClient from "@/components/student/InvitePageClient";
import { createClient } from "../../../utils/supabase/server";

export default async function InvitePage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, team_id, teams:team_id(id, name, invite_code, leader_id)")
    .eq("id", session.studentId)
    .maybeSingle();

  if (!student) {
    redirect("/invalid");
  }

  const teamId = student.team_id;
  const { data: members } = await supabase
    .from("students")
    .select("full_name, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  const firstName = (student.full_name as string)?.split(" ")[0] ?? session.fullName;
  const teamRelation = student.teams as
    | { id: string; name: string; invite_code: string; leader_id: string }
    | Array<{ id: string; name: string; invite_code: string; leader_id: string }>
    | null;
  const team = Array.isArray(teamRelation) ? (teamRelation[0] ?? null) : teamRelation;

  if (!team || team.leader_id !== student.id) {
    redirect("/dashboard");
  }

  return (
    <InvitePageClient
      firstName={firstName}
      teamName={team.name}
      inviteCode={team.invite_code}
      members={(members || []).map(m => ({
        fullName: m.full_name,
        joinedAt: m.created_at
      }))}
    />
  );
}
