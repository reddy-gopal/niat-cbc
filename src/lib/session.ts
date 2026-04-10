import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import type { StudentSession } from "@/types/app";

const studentSessionSecret = new TextEncoder().encode(env.STUDENT_SESSION_SECRET);

export async function signStudentSession(
  payload: StudentSession
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(studentSessionSecret);
}

export async function verifyStudentSession(
  token: string
): Promise<StudentSession | null> {
  try {
    const { payload } = await jwtVerify(token, studentSessionSecret);
    return payload as StudentSession;
  } catch {
    return null;
  }
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("cbc_student")?.value;

  if (!token) {
    return null;
  }

  return verifyStudentSession(token);
}

export function createSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `cbc_student=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`;
}
