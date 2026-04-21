import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp } from "@/lib/msg91";
import { adminClient } from "../../../../../../utils/supabase/admin";
import { getStudentSession } from "@/lib/session";

const schema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
});

export async function POST(request: Request) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const { data: existingStudent, error: existingStudentError } = await adminClient
      .from("students")
      .select("id")
      .eq("mobile", parsed.data.mobile)
      .neq("id", session.studentId)
      .maybeSingle();

    if (existingStudentError) {
      return NextResponse.json(
        { success: false, error: "Could not validate mobile number right now." },
        { status: 500 }
      );
    }

    if (existingStudent) {
      return NextResponse.json(
        { success: false, error: "This phone number is already registered." },
        { status: 409 }
      );
    }

    const otpResult = await sendOtp(parsed.data.mobile);
    if (!otpResult.success || !otpResult.requestId) {
      return NextResponse.json({ success: false, error: "Failed to send OTP." }, { status: 500 });
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await adminClient.from("otp_attempts").insert({
      mobile: parsed.data.mobile,
      request_id: otpResult.requestId,
      verified: false,
      expires_at: expiresAt,
    });

    if (insertError) {
      return NextResponse.json({ success: false, error: "Failed to send OTP." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { requestId: otpResult.requestId } }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
}
