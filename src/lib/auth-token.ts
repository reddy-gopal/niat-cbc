import "server-only";
import { adminClient } from "../../utils/supabase/admin";
import crypto from "crypto";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateAuthToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function storeAuthToken(
  token: string,
  userId: string
): Promise<{ expiresAt: string }> {
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error } = await adminClient.from("auth_tokens").insert({
    token,
    user_id: userId,
    expires_at: expiresAt,
    used: false,
  });

  if (error) {
    throw new Error(`Failed to store auth token: ${error.message}`);
  }

  return { expiresAt };
}

export async function validateAuthToken(authToken: string): Promise<{
  valid: boolean;
  userId?: string;
  reason?: string;
}> {
  const { data: stored, error } = await adminClient
    .from("auth_tokens")
    .select("token, user_id, expires_at, used")
    .eq("token", authToken)
    .maybeSingle();

  if (error || !stored) {
    return { valid: false, reason: "Auth token not found" };
  }

  if (stored.used) {
    return { valid: false, reason: "Auth token already used" };
  }

  if (new Date(stored.expires_at).getTime() <= Date.now()) {
    return { valid: false, reason: "Auth token expired" };
  }

  await adminClient
    .from("auth_tokens")
    .update({ used: true })
    .eq("token", authToken);

  return { valid: true, userId: stored.user_id };
}
