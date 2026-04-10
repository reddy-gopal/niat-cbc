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
      .select("id, section_id, bootcamp_id, region_id, full_name, mobile")
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

    if (!existingStudent) {
      const { data: insertedStudent, error: insertStudentError } = await adminClient
        .from("students")
        .insert({
          full_name: parsed.data.fullName,
          mobile: parsed.data.mobile,
          section_id: parsed.data.sectionId,
          bootcamp_id: parsed.data.bootcampId,
          region_id: parsed.data.regionId,
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

      const submissions = Array.from({ length: 9 }, (_, index) => ({
        student_id: insertedStudent.id,
        bootcamp_id: parsed.data.bootcampId,
        section_id: parsed.data.sectionId,
        region_id: parsed.data.regionId,
        task_id: index + 1,
        status: "not_started" as SubmissionStatus,
        points: 0,
        resubmit_count: 0,
      }));

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

    return new NextResponse(JSON.stringify({ success: true }), {
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
