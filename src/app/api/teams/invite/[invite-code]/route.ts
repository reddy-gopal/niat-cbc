import { NextResponse } from "next/server";
import { adminClient } from "../../../../../../utils/supabase/admin";

export async function GET(
  request: Request,
  props: { params: Promise<{ "invite-code": string }> }
) {
  try {
    const params = await props.params;
    const inviteCode = params["invite-code"];

    if (!inviteCode) {
      return NextResponse.json(
        { success: false, error: "Invite code missing." },
        { status: 400 }
      );
    }

    const { data: team, error } = await adminClient
      .from("teams")
      .select(`
        id,
        name,
        section_id,
        bootcamp_id,
        leader_id,
        students!teams_leader_id_fkey(full_name),
        sections (
          bootcamps (
            region_id
          )
        )
      `)
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (error || !team) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired invite code." },
        { status: 404 }
      );
    }

    const leader = team.students as unknown as { full_name: string };
    const regionId = (
      team.sections as unknown as { bootcamps: { region_id: string } }
    )?.bootcamps?.region_id;

    // Fetch members
    const { data: members } = await adminClient
      .from("students")
      .select("full_name")
      .eq("team_id", team.id);

    // Fetch leaderboard
    const { data: leaderboard } = await adminClient
      .from("teams")
      .select(`
        id,
        name,
        total_points,
        last_point_at,
        leader:students!teams_leader_id_fkey(full_name),
        members:students(count)
      `)
      .eq("section_id", team.section_id)
      .order("total_points", { ascending: false })
      .order("last_point_at", { ascending: true })
      .limit(5);

    const formattedLeaderboard = (leaderboard || []).map((t, idx) => ({
      rank: idx + 1,
      id: t.id,
      name: t.name,
      total_points: t.total_points,
      leader_name: (t.leader as unknown as { full_name: string })?.full_name ?? "Unknown",
      member_count: (t.members as unknown as [{ count: number }])[0].count,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          team_id: team.id,
          team_name: team.name,
          leader_name: leader?.full_name ?? "Unknown",
          section_id: team.section_id,
          bootcamp_id: team.bootcamp_id,
          region_id: regionId ?? null,
          members: (members || []).map((m) => m.full_name),
          leaderboard: formattedLeaderboard,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
