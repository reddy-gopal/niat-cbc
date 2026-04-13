import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/msg91";
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
});

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
      .select("id, section_id, bootcamp_id, region_id, full_name, mobile, team_id")
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

    if (existingStudent && existingStudent.section_id !== parsed.data.sectionId) {
      return NextResponse.json(
        {
          success: false,
          error: "You are already registered in a different section.",
        },
        { status: 400 }
      );
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
        })
        .select("id, section_id, bootcamp_id, region_id, full_name, mobile")
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

      const baseSubmissions = Array.from({ length: 9 }, (_, index) => ({
        student_id: insertedStudent.id,
        bootcamp_id: insertBootcampId,
        section_id: insertSectionId,
        region_id: insertRegionId,
        task_id: index + 1,
        status: "not_started" as SubmissionStatus,
        points: 0,
        resubmit_count: 0,
      }));

      const submissions = baseSubmissions.flatMap((sub) => {
        if (sub.task_id === 9) {
          return [
            { ...sub, streak_day: 1 },
            { ...sub, streak_day: 2 },
            { ...sub, streak_day: 3 },
          ];
        }
        return sub;
      });

      const { error: submissionsError } = await adminClient
        .from("submissions")
        .insert(submissions);

      if (submissionsError) {
        return NextResponse.json(
          { success: false, error: "Unable to initialize student challenges." },
          { status: 500 }
        );
      }
    }

    if (existingStudent) {
      const { data: existingRows } = await adminClient
        .from("submissions")
        .select("task_id, streak_day")
        .eq("student_id", existingStudent.id);

      const hasTask = (taskId: number) =>
        (existingRows || []).some((r) => r.task_id === taskId);
      const hasTask9Day = (day: number) =>
        (existingRows || []).some((r) => r.task_id === 9 && r.streak_day === day);

      const missingRows: Array<{
        student_id: string;
        bootcamp_id: string;
        section_id: string;
        region_id: string;
        task_id: number;
        status: SubmissionStatus;
        points: number;
        resubmit_count: number;
        streak_day?: number;
      }> = [];

      for (const taskId of [1, 2, 3, 4, 5, 6, 7, 8]) {
        if (!hasTask(taskId)) {
          missingRows.push({
            student_id: existingStudent.id,
            bootcamp_id: existingStudent.bootcamp_id,
            section_id: existingStudent.section_id,
            region_id: existingStudent.region_id,
            task_id: taskId,
            status: "not_started" as SubmissionStatus,
            points: 0,
            resubmit_count: 0,
          });
        }
      }

      for (const day of [1, 2, 3]) {
        if (!hasTask9Day(day)) {
          missingRows.push({
            student_id: existingStudent.id,
            bootcamp_id: existingStudent.bootcamp_id,
            section_id: existingStudent.section_id,
            region_id: existingStudent.region_id,
            task_id: 9,
            streak_day: day,
            status: "not_started" as SubmissionStatus,
            points: 0,
            resubmit_count: 0,
          });
        }
      }

      if (missingRows.length > 0) {
        await adminClient.from("submissions").insert(missingRows);
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
