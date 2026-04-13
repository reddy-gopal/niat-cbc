import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/session";
import { adminClient } from "../../../../../utils/supabase/admin";

export async function GET(
  request: Request,
  props: { params: Promise<{ "team-id": string }> }
) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await props.params;
    const teamId = params["team-id"];

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "Team ID missing." },
        { status: 400 }
      );
    }

    const { data: team, error } = await adminClient
      .from("teams")
      .select(`
        *,
        students!students_team_id_fkey(full_name)
      `)
      .eq("id", teamId)
      .eq("section_id", session.sectionId)
      .maybeSingle();

    if (error || !team) {
      return NextResponse.json(
        { success: false, error: "Team not found or access denied." },
        { status: 404 }
      );
    }

    const members = (team.students as unknown as { full_name: string }[]).map(
      (s) => s.full_name
    );

    return NextResponse.json({
      success: true,
      data: {
        ...team,
        students: undefined,
        members,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
