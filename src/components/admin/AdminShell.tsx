"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileCheck,
  LayoutDashboard,
  MapPin,
  ScrollText,
  Trophy,
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";
import { Logo } from "../ui/Logo";

type AdminShellProps = {
  adminEmail: string;
  children: React.ReactNode;
};

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bootcamps", label: "Bootcamps", icon: MapPin },
  { href: "/admin/submissions", label: "Submissions", icon: FileCheck },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

export default function AdminShell({ adminEmail, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)]">
      <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[var(--hero-from)] text-white p-4 flex flex-col shadow-xl">
        <div className="flex items-center mb-8">
          <Logo size="lg" />
        </div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-all border-l-4 ${
                  active
                    ? "border-l-[var(--yellow)] bg-white/10 text-white font-semibold"
                    : "border-l-transparent text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-white/10">
          <p className="text-xs text-white/50 truncate mb-4 px-2">{adminEmail}</p>
          <button onClick={signOut} className="w-full py-2 bg-red-500/20 text-red-100 hover:bg-red-500/30 rounded-lg text-sm font-semibold transition-colors">
            Sign Out
          </button>
        </div>
      </aside>
      <main className="ml-[240px] p-6">{children}</main>
    </div>
  );
}
