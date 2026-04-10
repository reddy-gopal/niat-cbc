import { NextResponse } from "next/server";

export async function POST() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const expiredCookie = `cbc_student=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;

  return new NextResponse(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": expiredCookie,
    },
  });
}
