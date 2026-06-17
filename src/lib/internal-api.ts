/** Shared secret for internal verify routes (upload → verify, cron batch). */
export function getInternalApiSecret(): string {
  return process.env.INTERNAL_API_SECRET ?? process.env.INTERNAL_SECRET ?? "";
}

export function isValidInternalSecret(header: string | null): boolean {
  const secret = getInternalApiSecret();
  return Boolean(secret) && header === secret;
}
