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
      team.sections as { bootcamps?: { region_id?: string } | null } | null
    )?.bootcamps?.region_id;

    return NextResponse.json({
      success: true,
      data: {
        team_id: team.id,
        team_name: team.name,
        leader_name: leader?.full_name ?? "Unknown",
        section_id: team.section_id,
        bootcamp_id: team.bootcamp_id,
        region_id: regionId ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
