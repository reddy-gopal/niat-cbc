import {
  NW_API_KEY,
  NW_BASE_URL,
  NW_CLIENT_KEY_DETAILS_ID,
} from "@/lib/env";

type ReferralErrorCode =
  | "USER_DOES_NOT_EXISTS_FOR_GIVEN_PHONE_NUMBER"
  | "USER_ASSOCIATION_DOES_NOT_EXISTS"
  | "INVALID_JOURNEY_STAGE_CODE"
  | "FORBIDDEN"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

interface ReferralCountSuccess {
  success: true;
  referralsCount: number;
}

interface ReferralCountError {
  success: false;
  errorCode: ReferralErrorCode;
  message: string;
}

export type ReferralCountResult = ReferralCountSuccess | ReferralCountError;

type ReferralCountApiSuccess = {
  referrals_count?: number;
};

type ReferralCountApiError = {
  res_status?: string;
  response?: string;
};

type ApiErrorLike = {
  res_status?: string;
  response?: string;
  message?: string;
  error?: string;
};

function isKnownReferralErrorCode(value: string): value is Exclude<
  ReferralErrorCode,
  "NETWORK_ERROR" | "UNKNOWN_ERROR" | "FORBIDDEN"
> {
  return (
    value === "USER_DOES_NOT_EXISTS_FOR_GIVEN_PHONE_NUMBER" ||
    value === "USER_ASSOCIATION_DOES_NOT_EXISTS" ||
    value === "INVALID_JOURNEY_STAGE_CODE"
  );
}

export async function getReferralCountForStage(
  phoneNumber: string,
  stageCode: string,
  countryCode?: string
): Promise<ReferralCountResult> {
  if (!Number.isFinite(NW_CLIENT_KEY_DETAILS_ID)) {
    return {
      success: false,
      errorCode: "UNKNOWN_ERROR",
      message: "Invalid NW client key configuration.",
    };
  }

  const baseUrl = NW_BASE_URL.replace(/\/+$/, "");
  const url = `${baseUrl}/api/nw_user_journey/user/referrals/stage_completions/count/get/v1/`;

  const innerData = {
      phone_number: phoneNumber,
      stage_code: stageCode,
      ...(countryCode ? { country_code: countryCode } : {}),
  };
  // NW API expects `data` as a JSON string wrapped in single quotes.
  const dataString = `'${JSON.stringify(innerData)}'`;
  const payload = {
    data: dataString,
    clientKeyDetailsId: NW_CLIENT_KEY_DETAILS_ID,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NW_API_KEY,
        "api-key": NW_API_KEY,
        Authorization: `Bearer ${NW_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as ReferralCountApiSuccess;
      return { success: true, referralsCount: data.referrals_count ?? 0 };
    }

    const rawBody = await response.text();
    let parsedBody: ApiErrorLike | null = null;
    try {
      parsedBody = JSON.parse(rawBody) as ApiErrorLike;
    } catch {
      parsedBody = null;
    }

    const rawCode =
      parsedBody?.res_status ??
      parsedBody?.error ??
      parsedBody?.message ??
      "UNKNOWN_ERROR";
    const statusDerivedCode: ReferralErrorCode | null =
      response.status === 403 ? "FORBIDDEN" : null;
    const errorCode = isKnownReferralErrorCode(rawCode)
      ? rawCode
      : statusDerivedCode ?? "UNKNOWN_ERROR";
    const message =
      parsedBody?.response ??
      parsedBody?.message ??
      rawBody?.trim() ??
      `Unexpected HTTP status: ${response.status}`;

    console.error("[nw-referral] Upstream NW API error", {
      status: response.status,
      errorCode,
      message,
      phoneNumber,
      stageCode,
    });

    return {
      success: false,
      errorCode,
      message,
    };

  } catch (error) {
    console.error("[nw-referral] Network error calling referral count API:", {
      error,
      phoneNumber,
      stageCode,
      hasCountryCode: Boolean(countryCode),
    });
    return {
      success: false,
      errorCode: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}
