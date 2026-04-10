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

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count, error: countError } = await adminClient
      .from("otp_attempts")
      .select("id", { count: "exact", head: true })
      .eq("mobile", parsed.data.mobile)
      .gt("created_at", tenMinutesAgo);

    if (countError) {
      return NextResponse.json({ success: false, error: "Could not process OTP request." }, { status: 500 });
    }

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ success: false, error: "Too many OTP requests. Please wait 10 minutes." }, { status: 429 });
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
