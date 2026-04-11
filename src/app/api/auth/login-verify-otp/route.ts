import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/msg91";
import { createSessionCookie, signStudentSession } from "@/lib/session";
import { adminClient } from "../../../../../utils/supabase/admin";

const loginVerifySchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().regex(/^\d{4}$/),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginVerifySchema.safeParse(body);
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

    const { data: student, error: studentError } = await adminClient
      .from("students")
      .select("id, full_name, mobile, section_id, bootcamp_id, region_id")
      .eq("mobile", parsed.data.mobile)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Account not found. Ask your success coach for your registration link.",
        },
        { status: 404 }
      );
    }

    const token = await signStudentSession({
      studentId: student.id as string,
      sectionId: student.section_id as string,
      bootcampId: student.bootcamp_id as string,
      regionId: student.region_id as string,
      fullName: student.full_name as string,
      mobile: student.mobile as string,
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
