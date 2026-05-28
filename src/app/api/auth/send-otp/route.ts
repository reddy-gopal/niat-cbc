import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp } from "@/lib/msg91";
import { validateNIATRegistration } from "@/lib/niatRegistration";
import { adminClient } from "../../../../../utils/supabase/admin";

const sendOtpSchema = z.object({
  fullName: z.string().trim().min(2).max(60),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  sectionId: z.string().uuid(),
  bootcampId: z.string().uuid(),
  regionId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const niatValidation = await validateNIATRegistration(parsed.data.mobile);
    if (!niatValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error:
            niatValidation.errorMessage ??
            "Could not validate NIAT registration right now. Please try again.",
        },
        { status: 400 }
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
