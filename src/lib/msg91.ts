import { env } from "@/lib/env";

type Msg91SendOtpResponse = {
  type?: string;
  request_id?: string;
  message?: string;
};

type Msg91VerifyOtpResponse = {
  type?: string;
  message?: string;
};

export async function sendOtp(
  mobile: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const response = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        authkey: env.MSG91_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: env.MSG91_TEMPLATE_ID,
        mobile: `91${mobile}`,
        realTimeResponse: "1",
      }),
    });

    const data = (await response.json()) as Msg91SendOtpResponse;

    if (response.ok && data.request_id) {
      return { success: true, requestId: data.request_id };
    }

    return {
      success: false,
      error: data.message ?? "Failed to send OTP",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send OTP",
    };
  }
}

export async function verifyOtp(
  mobile: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const endpoint = `https://control.msg91.com/api/v5/otp/verify?mobile=91${mobile}&otp=${otp}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        authkey: env.MSG91_API_KEY,
      },
    });

    const data = (await response.json()) as Msg91VerifyOtpResponse;

    if (response.ok && data.type === "success") {
      return { success: true };
    }

    return {
      success: false,
      error: data.message ?? "OTP verification failed",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "OTP verification failed",
    };
  }
}
