"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { AvatarMenu } from "@/components/ui/AvatarMenu";

type StudentNavbarProps = {
  firstName: string;
};

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/submissions", label: "Submissions" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

function desktopLinkClass(href: string, pathname: string | null): string {
  const active =
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname === "/"
      : pathname === href || (pathname?.startsWith(href + "/") ?? false);
  return `shrink-0 rounded-lg px-2.5 py-2 text-sm font-bold transition-colors whitespace-nowrap ${
    active
      ? "bg-[var(--bg-tint)] text-[var(--primary)] ring-1 ring-[var(--primary)]/20"
      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tint)] hover:text-[var(--primary)]"
  }`;
}

/**
 * Fixed student top bar: logo (left), nav + account menu (right on md+).
 */
export function StudentNavbar({ firstName }: StudentNavbarProps) {
  const pathname = usePathname();

  return (
    <header
      className="fixed top-0 inset-x-0 z-30 bg-white border-b border-[var(--border)] shadow-sm pt-[env(safe-area-inset-top,0px)]"
      role="banner"
    >
      <div className="mx-auto max-w-6xl h-14 sm:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 min-w-0">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center min-h-[44px] min-w-[44px] -ml-1 pl-1 touch-manipulation rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          aria-label="Go to dashboard"
        >
          <Logo
            size="md"
            className="!h-8 w-auto sm:!h-12 object-contain object-left"
          />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2 md:gap-3">
          <nav
            className="hidden md:flex items-center justify-end gap-1 lg:gap-2 shrink min-w-0 overflow-x-auto"
            aria-label="Primary"
          >
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={desktopLinkClass(item.href, pathname)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <AvatarMenu firstName={firstName} compact />
        </div>
      </div>
    </header>
  );
}

/**
 * Padding-top for content below the fixed student navbar.
 * Uses `--student-nav-height` from globals.css (safe area + bar + buffer).
 * Pair with `pb-*` only — never `py-*` on the same node (can override `pt` at md+).
 */
export const studentMainTopPaddingClass = "pt-[var(--student-nav-height)]";
