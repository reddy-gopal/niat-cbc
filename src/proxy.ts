import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "../utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Avoid intercepting API routes with Supabase session refresh.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") {
      const { response } = await updateSession(request);
      return response;
    }

    const { response, user } = await updateSession(request);
    if (!user) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const { response } = await updateSession(request);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
