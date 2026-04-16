import { NextRequest, NextResponse } from "next/server";

type StageCountRequestBody = {
  phone_number?: string;
  stage_code?: string;
  country_code?: string;
};

type ExternalSuccessResponse = {
  referrals_count?: number;
};

type ExternalErrorResponse = {
  res_status?: string;
  response?: string;
};

const REFERRALS_STAGE_COUNT_URL =
  "https://nw-payouts-backend-gamma.earlywave.in/api/nw_user_journey/user/referrals/stage_completions/count/get/v1/";
const CLIENT_KEY_DETAILS_ID = 1;

export async function POST(request: NextRequest) {
  const apiKey = process.env.NW_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        res_status: "MISSING_API_KEY",
        message: "NW_API_KEY is not configured.",
      },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as StageCountRequestBody;
    const phoneNumber = body.phone_number?.trim();
    const stageCode = body.stage_code?.trim();
    const countryCode = body.country_code?.trim();

    if (!phoneNumber || !stageCode) {
      return NextResponse.json(
        {
          success: false,
          res_status: "INVALID_REQUEST",
          message: "phone_number and stage_code are required.",
        },
        { status: 400 }
      );
    }

    const dataObject = {
      phone_number: phoneNumber,
      stage_code: stageCode,
      ...(countryCode ? { country_code: countryCode } : {}),
    };
    const dataString = `'${JSON.stringify(dataObject)}'`;
    const payload = {
      clientKeyDetailsId: CLIENT_KEY_DETAILS_ID,
      data: dataString,
    };

    const externalResponse = await fetch(REFERRALS_STAGE_COUNT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (externalResponse.ok) {
      const json =
        (await externalResponse.json()) as ExternalSuccessResponse;
      return NextResponse.json(
        {
          success: true,
          referrals_count: json.referrals_count ?? 0,
        },
        { status: 200 }
      );
    }

    let errorJson: ExternalErrorResponse | null = null;
    try {
      errorJson = (await externalResponse.json()) as ExternalErrorResponse;
    } catch {
      errorJson = null;
    }

    return NextResponse.json(
      {
        success: false,
        res_status: errorJson?.res_status ?? "UNKNOWN_ERROR",
        message:
          errorJson?.response ??
          `Referral stage count API failed with status ${externalResponse.status}.`,
      },
      { status: externalResponse.status }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        res_status: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Unable to process referral stage count request.",
      },
      { status: 500 }
    );
  }
}
