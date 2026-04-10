import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function InvalidPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] grid place-items-center px-4">
      <div className="card w-full max-w-md p-10 text-center">
        <Logo size="md" className="mx-auto mb-6" />
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--primary)]/20 bg-[var(--status-rejected-bg)]">
          <AlertTriangle className="h-8 w-8 text-[var(--primary)]" />
        </div>
        <h1 className="text-3xl font-heading font-bold mb-3 text-[var(--text-dark)]">Invalid Link</h1>
        <p className="text-[var(--text-muted)]">
          This link is invalid or has expired. Please contact your section
          coordinator.
        </p>
      </div>
    </main>
  );
}
