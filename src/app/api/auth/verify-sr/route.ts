import { NextResponse } from "next/server";
import { z } from "zod";
import { validateNIATRegistration } from "@/lib/niatRegistration";
import { CHALLENGES } from "@/lib/challenges";
import { createSessionCookie, signStudentSession } from "@/lib/session";
import type { SubmissionStatus } from "@/types/database";
import { adminClient } from "../../../../../utils/supabase/admin";

const verifySrSchema = z.object({
  fullName: z.string().trim().min(2).max(60),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  sectionId: z.string().uuid(),
  bootcampId: z.string().uuid(),
  regionId: z.string().uuid(),
  inviteCode: z.string().nullish(),
  niatBootcampId: z.union([z.string().trim().regex(/^NB26\d+$/), z.literal(""), z.null()]).optional(),
});

const ACTIVE_TASK_IDS = CHALLENGES.map((c) => c.id);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifySrSchema.safeParse(body);
    if (!parsed.success) {
      console.log("verifySrSchema failed:", parsed.error.issues);
      const errorMsg = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json(
        { success: false, error: `Invalid request payload: ${errorMsg}` },
        { status: 400 }
      );
    }

    // SR verification — check NIAT registration status
    const niatValidation = await validateNIATRegistration(parsed.data.mobile);
    if (!niatValidation.valid) {
      return NextResponse.json(
        { success: false, error: niatValidation.errorMessage ?? "SR not completed for this number.", srFailed: true },
        { status: 400 }
      );
    }

    const { data: existingStudent, error: studentLookupError } = await adminClient
      .from("students")
      .select("id, section_id, bootcamp_id, region_id, full_name, mobile, team_id, utm_source, utm_medium, utm_campaign")
      .eq("mobile", parsed.data.mobile)
      .maybeSingle();

    if (studentLookupError) {
      return NextResponse.json(
        { success: false, error: "Unable to verify student registration." },
        { status: 500 }
      );
    }

    if (existingStudent && existingStudent.section_id !== parsed.data.sectionId) {
      return NextResponse.json(
        { success: false, error: "You are already registered in a different section." },
        { status: 400 }
      );
    }

    let studentId = existingStudent?.id;
    let sessionName = existingStudent?.full_name ?? parsed.data.fullName;
    let sessionMobile = existingStudent?.mobile ?? parsed.data.mobile;
    let sessionSection = existingStudent?.section_id ?? parsed.data.sectionId;
    let sessionBootcamp = existingStudent?.bootcamp_id ?? parsed.data.bootcampId;
    let sessionRegion = existingStudent?.region_id ?? parsed.data.regionId;
    let sessionUtmSource = existingStudent?.utm_source ?? null;
    let sessionUtmMedium = existingStudent?.utm_medium ?? null;
    let sessionUtmCampaign = existingStudent?.utm_campaign ?? null;
    let teamIdToAssign: string | null = null;

    // Update niat_bootcamp_id on existing student if provided and not already set
    if (existingStudent && parsed.data.niatBootcampId && !(existingStudent as Record<string, unknown>).niat_bootcamp_id) {
      await adminClient.from("students").update({ niat_bootcamp_id: parsed.data.niatBootcampId }).eq("id", existingStudent.id);
    }

    if (!existingStudent) {
      let insertSectionId = parsed.data.sectionId;
      let insertBootcampId = parsed.data.bootcampId;
      let insertRegionId = parsed.data.regionId;

      if (parsed.data.inviteCode) {
        const { data: teamData } = await adminClient
          .from("teams")
          .select("id, section_id, bootcamp_id")
          .eq("invite_code", parsed.data.inviteCode)
          .maybeSingle();

        if (!teamData) {
          return NextResponse.json(
            { success: false, error: "Invalid or expired invite code." },
            { status: 400 }
          );
        }

        teamIdToAssign = teamData.id;
        insertSectionId = teamData.section_id;
        insertBootcampId = teamData.bootcamp_id;

        const { data: sectionData } = await adminClient
          .from("sections")
          .select("bootcamps:bootcamp_id(region_id)")
          .eq("id", teamData.section_id)
          .maybeSingle();

        const sectionRegionId = (sectionData?.bootcamps as { region_id?: string } | null)?.region_id;
        if (!sectionRegionId) {
          return NextResponse.json(
            { success: false, error: "Invalid or expired invite code." },
            { status: 400 }
          );
        }
        insertRegionId = sectionRegionId;
      }

      const { data: insertedStudent, error: insertStudentError } = await adminClient
        .from("students")
        .insert({
          full_name: parsed.data.fullName,
          mobile: parsed.data.mobile,
          section_id: insertSectionId,
          bootcamp_id: insertBootcampId,
          region_id: insertRegionId,
          team_id: teamIdToAssign,
          ...(parsed.data.niatBootcampId ? { niat_bootcamp_id: parsed.data.niatBootcampId } : {}),
        })
        .select("id, section_id, bootcamp_id, region_id, full_name, mobile, utm_source, utm_medium, utm_campaign")
        .single();

      if (insertStudentError || !insertedStudent) {
        return NextResponse.json(
          { success: false, error: "Unable to create student profile." },
          { status: 500 }
        );
      }

      studentId = insertedStudent.id;
      sessionName = insertedStudent.full_name;
      sessionMobile = insertedStudent.mobile;
      sessionSection = insertedStudent.section_id;
      sessionBootcamp = insertedStudent.bootcamp_id;
      sessionRegion = insertedStudent.region_id;
      sessionUtmSource = insertedStudent.utm_source;
      sessionUtmMedium = insertedStudent.utm_medium;
      sessionUtmCampaign = insertedStudent.utm_campaign;

      const now = new Date().toISOString();
      const baseSubmissions = ACTIVE_TASK_IDS.map((taskId) => ({
        student_id: insertedStudent.id,
        bootcamp_id: insertBootcampId,
        section_id: insertSectionId,
        region_id: insertRegionId,
        task_id: taskId,
        status: "not_started" as SubmissionStatus,
        points: 0,
        resubmit_count: 0,
        file_url: null,
        file_hash: null,
        ai_reason: null,
        text_response: null,
        verification_attempts: 0,
        last_attempted_at: null,
        verified_at: null,
        override_by: null,
        override_note: null,
        created_at: now,
        updated_at: now,
      }));

      await adminClient.from("submissions").insert(baseSubmissions);
    }

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "Unable to authenticate student." },
        { status: 500 }
      );
    }

    const token = await signStudentSession({
      studentId,
      sectionId: sessionSection,
      bootcampId: sessionBootcamp,
      regionId: sessionRegion,
      fullName: sessionName,
      mobile: sessionMobile,
      utmSource: sessionUtmSource ?? undefined,
      utmMedium: sessionUtmMedium ?? undefined,
      utmCampaign: sessionUtmCampaign ?? undefined,
    });

    const cookieValue = createSessionCookie(token);
    const hasTeam = existingStudent ? !!existingStudent.team_id : !!teamIdToAssign;

    return new NextResponse(JSON.stringify({ success: true, hasTeam }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieValue,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }
}
