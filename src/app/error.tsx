"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen grid place-items-center bg-[var(--bg)] text-[var(--text)] px-4">
      <div className="card p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
        <p className="text-[var(--text-muted)] mb-6">
          We could not complete that action right now. Please try again.
        </p>
        <button className="btn-primary" onClick={reset}>
          Try Again
        </button>
      </div>
    </main>
  );
}
