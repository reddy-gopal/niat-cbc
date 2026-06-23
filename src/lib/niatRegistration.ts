import { env } from "@/lib/env";

type UserIdLookupSuccess = {
  user_id: string;
};

type ApplicationCheckError = {
  response?: string;
  http_status_code?: number;
  res_status?: string;
};

type ValidateResult = {
  valid: boolean;
  errorMessage?: string;
};

const NOT_REGISTERED_ERROR =
  "You are not registered as a NIAT 2026 applicant. Please register with your SR done number first.";

const USER_ID_ENDPOINT =
  "/api/ib_user_accounts/user/phone_number/user_id/v1/";
const APPLICATION_ENDPOINT =
  "/api/nw_application/user/application/sections_completion/get/v1/";

function buildPayload(data: Record<string, unknown>): string {
  return `'${JSON.stringify(data)}'`;
}

export async function validateNIATRegistration(
  phoneNumber: string
): Promise<ValidateResult> {
  // Bypass for testing
  if (phoneNumber === "9999999999") {
    return { valid: true };
  }

  try {
    const clientKeyDetailsId = Number(env.NEXT_PUBLIC_CLIENT_KEY_DETAILS_ID);

    const userIdResponse = await fetch(
      `${env.NEXT_PUBLIC_IB_USER_ACCOUNTS_BASE_URL}${USER_ID_ENDPOINT}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.NEXT_API_KEY,
        },
        body: JSON.stringify({
          clientKeyDetailsId,
          data: buildPayload({
            phone_number: phoneNumber,
            country_code: "+91",
          }),
        }),
      }
    );

    if (!userIdResponse.ok) {
      return {
        valid: false,
        errorMessage: NOT_REGISTERED_ERROR,
      };
    }

    const userIdResult = (await userIdResponse.json()) as UserIdLookupSuccess;
    if (!userIdResult.user_id) {
      return {
        valid: false,
        errorMessage: NOT_REGISTERED_ERROR,
      };
    }

    const applicationResponse = await fetch(
      `${env.NEXT_PUBLIC_NW_APPLICATION_BASE_URL}${APPLICATION_ENDPOINT}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.NEXT_API_KEY,
        },
        body: JSON.stringify({
          clientKeyDetailsId,
          data: buildPayload({
            user_id: userIdResult.user_id,
            application_name_enum: env.NEXT_PUBLIC_NIAT_APPLICATION_NAME_ENUM,
            section_entity_config_ids: [
              env.NEXT_PUBLIC_NIAT_SECTION_ENTITY_CONFIG_ID,
            ],
          }),
        }),
      }
    );

    if (!applicationResponse.ok) {
      const errorBody = (await applicationResponse.json()) as ApplicationCheckError;
      if (errorBody.res_status === "USER_APPLICATION_NOT_EXISTS") {
        return {
          valid: false,
          errorMessage: NOT_REGISTERED_ERROR,
        };
      }

      return {
        valid: false,
        errorMessage: "Could not validate NIAT registration right now. Please try again.",
      };
    }

    const appData = await applicationResponse.json();
    console.log("NW_APPLICATION API Response:", JSON.stringify(appData, null, 2));

    // Deep search helper to find completion_percentage == 100 anywhere in the JSON
    const findCompletionPercentage100 = (obj: any): boolean => {
      if (obj === null || typeof obj !== "object") return false;
      if (Array.isArray(obj)) return obj.some(findCompletionPercentage100);
      
      for (const key in obj) {
        if (key === "completion_percentage") {
          const val = obj[key];
          if (val === 100 || val === "100" || val === "100%" || String(val).startsWith("100")) {
            return true;
          }
        }
        if (typeof obj[key] === "object") {
          if (findCompletionPercentage100(obj[key])) return true;
        }
      }
      return false;
    };

    const isActuallyCompleted = findCompletionPercentage100(appData);

    if (!isActuallyCompleted) {
      return {
        valid: false,
        errorMessage: NOT_REGISTERED_ERROR,
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("validateNIATRegistration Error:", error);
    return {
      valid: false,
      errorMessage: "Could not validate NIAT registration right now. Please try again.",
    };
  }
}
