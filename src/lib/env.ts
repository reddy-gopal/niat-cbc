type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "ANTHROPIC_API_KEY"
  | "STUDENT_SESSION_SECRET"
  | "MSG91_TEMPLATE_ID";

type OptionalEnvKey =
  | "MSG91_API_KEY"
  | "MSG91_AUTH_KEY"
  | "MSG91_SENDER_ID";

const requiredEnv: EnvKey[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "STUDENT_SESSION_SECRET",
  "MSG91_TEMPLATE_ID",
];

function getEnv(): Record<EnvKey | OptionalEnvKey, string> {
  const missing: string[] = requiredEnv.filter((key) => !process.env[key]);
  const hasMsg91Key = Boolean(
    process.env.MSG91_API_KEY || process.env.MSG91_AUTH_KEY
  );
  if (!hasMsg91Key) {
    missing.push("MSG91_API_KEY or MSG91_AUTH_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    STUDENT_SESSION_SECRET: process.env.STUDENT_SESSION_SECRET!,
    MSG91_API_KEY:
      process.env.MSG91_API_KEY ?? process.env.MSG91_AUTH_KEY ?? "",
    MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID!,
    MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY ?? "",
    MSG91_SENDER_ID: process.env.MSG91_SENDER_ID ?? "",
  };
}

export const env = getEnv();
