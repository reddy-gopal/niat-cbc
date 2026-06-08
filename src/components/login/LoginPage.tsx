"use client";

import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] grid place-items-center px-4 py-10">
      <div className="card p-8 sm:p-10 w-full max-w-md shadow-lg text-center">
        <Logo size="lg" className="mx-auto mb-6" />
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-dark)] mb-2">
          Community Building Championship
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          Please use your registration link to access this platform.
        </p>
        <p className="text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-5 leading-relaxed">
          Contact your success coach if you need help accessing your link.
        </p>
      </div>
    </main>
  );
}
