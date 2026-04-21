import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp } from "@/lib/msg91";
import { adminClient } from "../../../../../utils/supabase/admin";

const loginSendSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const { data: student, error: studentError } = await adminClient
      .from("students")
      .select("id")
      .eq("mobile", parsed.data.mobile)
      .maybeSingle();

    if (studentError) {
      return NextResponse.json(
        { success: false, error: "Could not look up your account." },
        { status: 500 }
      );
    }

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No account found for this number. Ask your success coach for your registration link.",
        },
        { status: 404 }
      );
    }

    const otpResult = await sendOtp(parsed.data.mobile);
    if (!otpResult.success || !otpResult.requestId) {
      return NextResponse.json(
        { success: false, error: "Failed to send OTP. Please try again." },
        { status: 500 }
      );
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await adminClient.from("otp_attempts").insert({
      mobile: parsed.data.mobile,
      request_id: otpResult.requestId,
      verified: false,
      expires_at: expiresAt,
    });

    if (insertError) {
      return NextResponse.json(
        { success: false, error: "Failed to send OTP. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { requestId: otpResult.requestId },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }
}
