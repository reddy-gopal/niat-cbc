import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute = pathname === "/admin/login";

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-path", pathname);

  if (isAuthRoute) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Fast path: cookie presence check only in proxy.
  const supabaseAccessToken =
    request.cookies.get("sb-access-token") ??
    request.cookies.get("sb-rdamfrqzccwzlnuymlho-auth-token");

  if (!supabaseAccessToken?.value) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
