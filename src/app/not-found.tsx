import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center bg-[var(--bg)] text-[var(--text)] px-4">
      <div className="card p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-3">Page Not Found</h1>
        <p className="text-[var(--text-muted)] mb-6">
          The page you are looking for does not exist.
        </p>
        <Link href="/dashboard" className="btn-primary inline-block">
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
