"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Home", shortLabel: "Home", emoji: "🏠" },
  { href: "/submissions", label: "Submissions", shortLabel: "Subs", emoji: "📋" },
  { href: "/leaderboard", label: "Leaderboard", shortLabel: "Board", emoji: "🏆" },
  { href: "/profile", label: "Profile", shortLabel: "You", emoji: "👤" },
] as const;

export function StudentBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-0 px-1 pt-1">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-bold transition-colors touch-manipulation ${
                active
                  ? "text-[var(--primary)] bg-[var(--bg-tint)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-dark)] hover:bg-slate-50"
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {item.emoji}
              </span>
              <span className="truncate max-w-full">{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
