import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/msg91";
import { CHALLENGES } from "@/lib/challenges";
import { createSessionCookie, signStudentSession } from "@/lib/session";
import type { SubmissionStatus } from "@/types/database";
import { adminClient } from "../../../../../utils/supabase/admin";

const verifyOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().regex(/^\d{4}$/),
  fullName: z.string().trim().min(2).max(60),
  sectionId: z.string().uuid(),
  bootcampId: z.string().uuid(),
  regionId: z.string().uuid(),
  inviteCode: z.string().optional(),
  niatBootcampId: z.string().trim().max(50).optional(),
  utmSource: z.string().trim().min(1).max(120).optional(),
  utmMedium: z.string().trim().min(1).max(120).optional(),
  utmCampaign: z.string().trim().min(1).max(120).optional(),
});
const ACTIVE_TASK_IDS = CHALLENGES.map((challenge) => challenge.id);

const normalizeOptionalUtm = (value?: string): string | null =>
  value?.trim() ? value.trim() : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const { data: otpAttempt, error: attemptError } = await adminClient
      .from("otp_attempts")
      .select("id, expires_at")
      .eq("mobile", parsed.data.mobile)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attemptError || !otpAttempt) {
      return NextResponse.json(
        { success: false, error: "OTP expired. Please request a new one." },
        { status: 400 }
      );
    }

    const verifyResult = await verifyOtp(parsed.data.mobile, parsed.data.otp);
    if (!verifyResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid OTP. Please try again." },
        { status: 400 }
      );
    }

    await adminClient
      .from("otp_attempts")
      .update({ verified: true })
      .eq("id", otpAttempt.id);

    const { data: existingStudent, error: studentLookupError } = await adminClient
      .from("students")
      .select(
        "id, section_id, bootcamp_id, region_id, full_name, mobile, team_id, utm_source, utm_medium, utm_campaign"
      )
      .eq("mobile", parsed.data.mobile)
      .maybeSingle();

    if (studentLookupError) {
      return NextResponse.json(
        { success: false, error: "Unable to verify student registration." },
        { status: 500 }
      );
    }

    let studentId = existingStudent?.id;
    let sessionName = existingStudent?.full_name ?? parsed.data.fullName;
    let sessionMobile = existingStudent?.mobile ?? parsed.data.mobile;
    let sessionSection = existingStudent?.section_id ?? parsed.data.sectionId;
    let sessionBootcamp = existingStudent?.bootcamp_id ?? parsed.data.bootcampId;
    let sessionRegion = existingStudent?.region_id ?? parsed.data.regionId;
    const parsedUtmSource = normalizeOptionalUtm(parsed.data.utmSource);
    const parsedUtmMedium = normalizeOptionalUtm(parsed.data.utmMedium);
    const parsedUtmCampaign = normalizeOptionalUtm(parsed.data.utmCampaign);
    let sessionUtmSource = existingStudent?.utm_source ?? parsedUtmSource;
    let sessionUtmMedium = existingStudent?.utm_medium ?? parsedUtmMedium;
    let sessionUtmCampaign = existingStudent?.utm_campaign ?? parsedUtmCampaign;

    if (existingStudent && existingStudent.section_id !== parsed.data.sectionId) {
      return NextResponse.json(
        {
          success: false,
          error: "You are already registered in a different section.",
        },
        { status: 400 }
      );
    }

    if (
      existingStudent &&
      ((parsedUtmSource && !existingStudent.utm_source) ||
        (parsedUtmMedium && !existingStudent.utm_medium) ||
        (parsedUtmCampaign && !existingStudent.utm_campaign))
    ) {
      const { data: updatedStudent } = await adminClient
        .from("students")
        .update({
          utm_source: existingStudent.utm_source ?? parsedUtmSource,
          utm_medium: existingStudent.utm_medium ?? parsedUtmMedium,
          utm_campaign: existingStudent.utm_campaign ?? parsedUtmCampaign,
        })
        .eq("id", existingStudent.id)
        .select("utm_source, utm_medium, utm_campaign")
        .maybeSingle();

      if (updatedStudent) {
        sessionUtmSource = updatedStudent.utm_source;
        sessionUtmMedium = updatedStudent.utm_medium;
        sessionUtmCampaign = updatedStudent.utm_campaign;
      }
    }

    let teamIdToAssign: string | null = null;

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

        const sectionRegionId = (
          sectionData?.bootcamps as { region_id?: string } | null
        )?.region_id;
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
          utm_source: parsedUtmSource,
          utm_medium: parsedUtmMedium,
          utm_campaign: parsedUtmCampaign,
          ...(parsed.data.niatBootcampId ? { niat_bootcamp_id: parsed.data.niatBootcampId } : {}),
        })
        .select(
          "id, section_id, bootcamp_id, region_id, full_name, mobile, utm_source, utm_medium, utm_campaign"
        )
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

      const { error: submissionsError } = await adminClient
        .from("submissions")
        .insert(baseSubmissions);

      if (submissionsError) {
        console.error("[verify-otp] initial submissions insert failed", {
          code: submissionsError.code,
          message: submissionsError.message,
          details: submissionsError.details,
          hint: submissionsError.hint,
        });
      }
    }

    if (studentId) {
      const { data: existingRows } = await adminClient
        .from("submissions")
        .select("task_id, streak_day")
        .eq("student_id", studentId);

      const hasTask = (taskId: number) =>
        (existingRows || []).some((r) => r.task_id === taskId);

      const missingRows: Array<{
        student_id: string;
        bootcamp_id: string;
        section_id: string;
        region_id: string;
        task_id: number;
        status: SubmissionStatus;
        points: number;
        resubmit_count: number;
        file_url: null;
        file_hash: null;
        ai_reason: null;
        text_response: null;
        verification_attempts: number;
        last_attempted_at: null;
        verified_at: null;
        override_by: null;
        override_note: null;
        created_at: string;
        updated_at: string;
        streak_day?: number;
      }> = [];
      const now = new Date().toISOString();

      for (const taskId of ACTIVE_TASK_IDS) {
        if (!hasTask(taskId)) {
          missingRows.push({
            student_id: studentId,
            bootcamp_id: sessionBootcamp,
            section_id: sessionSection,
            region_id: sessionRegion,
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
          });
        }
      }

      if (missingRows.length > 0) {
        const { error: missingRowsInsertError } = await adminClient
          .from("submissions")
          .insert(missingRows);
        if (missingRowsInsertError) {
          const isDuplicateInit = missingRowsInsertError.code === "23505";
          if (!isDuplicateInit) {
            console.error("[verify-otp] missing submissions insert failed", {
              code: missingRowsInsertError.code,
              message: missingRowsInsertError.message,
              details: missingRowsInsertError.details,
              hint: missingRowsInsertError.hint,
            });
            return NextResponse.json(
              {
                success: false,
                error: "Unable to initialize missing student challenges.",
                details: missingRowsInsertError.message,
              },
              { status: 500 }
            );
          }
        }
      }
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

    const hasTeam = existingStudent 
      ? !!existingStudent.team_id 
      : !!teamIdToAssign;

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
