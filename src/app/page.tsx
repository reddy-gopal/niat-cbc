import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/session";
import { Logo } from "@/components/ui/Logo";

export default async function Home() {
  const session = await getStudentSession();
  if (session) {
    redirect("/dashboard");
  }
  return (
    <main className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] grid place-items-center px-4 relative">
      <div className="card p-10 w-full max-w-xl text-center relative z-10">
        <Logo size="lg" className="mx-auto mb-6" />
        <h1 className="text-4xl font-heading font-bold mb-4 text-[var(--text-dark)]">Community Building Championship</h1>
        <p className="text-[var(--text-muted)]">
          Use the link provided by your section coordinator to join.
        </p>
      </div>
    </main>
  );
}
