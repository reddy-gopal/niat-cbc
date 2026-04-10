import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/session";
import { adminClient } from "../../../../../utils/supabase/admin";

export async function POST() {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await adminClient.from("students").delete().eq("id", session.studentId);

    if (error) {
       return NextResponse.json({ success: false, error: "Failed to delete account" }, { status: 500 });
    }

    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const expiredCookie = `cbc_student=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": expiredCookie,
      },
    });
  } catch {
     return NextResponse.json({ success: false, error: "Error" }, { status: 500 });
  }
}
