"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./SiteFooter";

export function ConditionalFooter() {
  const pathname = usePathname();

  // Define routes where footer should be hidden:
  // 1. Sign in (root or /login)
  // 2. Onboarding (/join)
  // 3. Admin (/admin)
  const isHiddenRoute =
    pathname === "/" ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/join") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/invalid");

  if (isHiddenRoute) {
    return null;
  }

  return <SiteFooter />;
}
