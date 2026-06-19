import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { generateAuthToken, storeAuthToken } from "@/lib/auth-token";

const bodySchema = z.object({
  user_id: z.string().min(1),
});

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== env.TOKEN_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "user_id is required." }, { status: 400 });
  }

  try {
    const token = generateAuthToken();
    const { expiresAt } = await storeAuthToken(token, parsed.data.user_id);
    return NextResponse.json({ auth_token: token, expires_at: expiresAt });
  } catch {
    return NextResponse.json({ message: "Failed to generate auth token." }, { status: 500 });
  }
}
