import {
  NW_API_KEY,
  NW_BASE_URL,
  NW_CLIENT_KEY_DETAILS_ID,
} from "@/lib/env";

type ReferralErrorCode =
  | "USER_DOES_NOT_EXISTS_FOR_GIVEN_PHONE_NUMBER"
  | "USER_ASSOCIATION_DOES_NOT_EXISTS"
  | "INVALID_JOURNEY_STAGE_CODE"
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

function isKnownReferralErrorCode(value: string): value is Exclude<
  ReferralErrorCode,
  "NETWORK_ERROR" | "UNKNOWN_ERROR"
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
  const url = `${NW_BASE_URL}/api/nw_user_journey/user/referrals/stage_completions/count/get/v1/`;

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
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as ReferralCountApiSuccess;
      return { success: true, referralsCount: data.referrals_count ?? 0 };
    }

    if (response.status === 400) {
      const data = (await response.json()) as ReferralCountApiError;
      const errorCode = data.res_status ?? "UNKNOWN_ERROR";
      return {
        success: false,
        errorCode: isKnownReferralErrorCode(errorCode)
          ? errorCode
          : "UNKNOWN_ERROR",
        message: data.response ?? "Unknown error from NW API",
      };
    }

    return {
      success: false,
      errorCode: "UNKNOWN_ERROR",
      message: `Unexpected HTTP status: ${response.status}`,
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
