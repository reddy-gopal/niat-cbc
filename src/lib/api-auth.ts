import { verifyStudentSession } from "@/lib/session";

function getCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";").map((item) => item.trim());
  const match = pairs.find((item) => item.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.slice(key.length + 1)) : null;
}

export async function getStudentFromRequest(request: Request) {
  const token = getCookieValue(request.headers.get("cookie"), "cbc_student");
  if (!token) {
    return { student: null, error: "Unauthorized" };
  }

  const student = await verifyStudentSession(token);
  if (!student) {
    return { student: null, error: "Unauthorized" };
  }

  return { student, error: null };
}
