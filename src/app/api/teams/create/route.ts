import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getStudentSession } from "@/lib/session";
import { adminClient } from "../../../../../utils/supabase/admin";

const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(50),
});

export async function POST(request: Request) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid tribe name." }, { status: 400 });
    }

    const { data: existingTeam } = await adminClient
      .from("teams")
      .select("id")
      .eq("section_id", session.sectionId)
      .ilike("name", parsed.data.name)
      .maybeSingle();

    if (existingTeam) {
      return NextResponse.json({ success: false, error: "This tribe name is already taken in your section" }, { status: 400 });
    }

    const inviteCode = nanoid(8);

    const { data: newTeam, error: teamError } = await adminClient
      .from("teams")
      .insert({
        name: parsed.data.name,
        section_id: session.sectionId,
        bootcamp_id: session.bootcampId,
        leader_id: session.studentId,
        invite_code: inviteCode,
        total_points: 0,
      })
      .select()
      .single();

    if (teamError || !newTeam) {
      return NextResponse.json({ success: false, error: "Failed to create tribe." }, { status: 500 });
    }

    const { error: studentUpdateError } = await adminClient
      .from("students")
      .update({ team_id: newTeam.id })
      .eq("id", session.studentId);

    if (studentUpdateError) {
      return NextResponse.json({ success: false, error: "Failed to assign you to the tribe." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invite_code: inviteCode,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
