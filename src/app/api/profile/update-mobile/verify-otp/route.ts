import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/msg91";
import { createSessionCookie, getStudentSession, signStudentSession } from "@/lib/session";
import { adminClient } from "../../../../../../utils/supabase/admin";

const schema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().regex(/^\d{4}$/),
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
      return NextResponse.json({ success: false, error: "OTP expired." }, { status: 400 });
    }

    const verifyResult = await verifyOtp(parsed.data.mobile, parsed.data.otp);
    if (!verifyResult.success) {
      return NextResponse.json({ success: false, error: "Invalid OTP." }, { status: 400 });
    }

    await adminClient.from("otp_attempts").update({ verified: true }).eq("id", otpAttempt.id);

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

    const { error: updateError } = await adminClient
      .from("students")
      .update({ mobile: parsed.data.mobile })
      .eq("id", session.studentId);

    if (updateError) {
      if ((updateError as { code?: string }).code === "23505") {
        return NextResponse.json(
          { success: false, error: "This phone number is already registered." },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: false, error: "Unable to update mobile." }, { status: 500 });
    }

    const newToken = await signStudentSession({
      ...session,
      mobile: parsed.data.mobile,
    });

    const cookieValue = createSessionCookie(newToken);

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieValue,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
}
