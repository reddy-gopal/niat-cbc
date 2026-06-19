import { NextResponse } from "next/server";
import { z } from "zod";
import { validateAuthToken } from "@/lib/auth-token";

const bodySchema = z.object({
  auth_token: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "auth_token is required." }, { status: 400 });
  }

  try {
    const result = await validateAuthToken(parsed.data.auth_token);
    return NextResponse.json({
      valid: result.valid,
      user_id: result.userId ?? null,
      reason: result.reason ?? null,
    });
  } catch {
    return NextResponse.json({ message: "Failed to validate auth token." }, { status: 500 });
  }
}
