"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./SiteFooter";

export function ConditionalFooter() {
  const pathname = usePathname();

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
