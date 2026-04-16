type ReferralsRouteSuccess = {
  success: true;
  referrals_count: number;
};

type ReferralsRouteError = {
  success: false;
  res_status: string;
  message: string;
};

type ReferralsRouteResponse = ReferralsRouteSuccess | ReferralsRouteError;

export class ReferralStageCountError extends Error {
  readonly resStatus: string;
  readonly statusCode: number;

  constructor(message: string, resStatus: string, statusCode: number) {
    super(message);
    this.name = "ReferralStageCountError";
    this.resStatus = resStatus;
    this.statusCode = statusCode;
  }
}

function resolveAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function getReferralCountForStage(
  phone_number: string,
  stage_code: string,
  country_code?: string
): Promise<number> {
  const baseUrl = resolveAppBaseUrl();
  const response = await fetch(`${baseUrl}/api/referrals/stage-count`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone_number,
      stage_code,
      ...(country_code ? { country_code } : {}),
    }),
    cache: "no-store",
  });

  const json = (await response.json()) as ReferralsRouteResponse;

  if (!response.ok || !json.success) {
    const resStatus =
      "res_status" in json && typeof json.res_status === "string"
        ? json.res_status
        : "UNKNOWN_ERROR";
    const message =
      "message" in json && typeof json.message === "string"
        ? json.message
        : "Failed to fetch referral count.";
    throw new ReferralStageCountError(message, resStatus, response.status);
  }

  return json.referrals_count;
}
