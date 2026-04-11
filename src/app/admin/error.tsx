"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[50vh] grid place-items-center p-6">
      <div className="card p-6 text-center max-w-md">
        <h2 className="text-xl font-heading font-bold mb-2">Something went wrong</h2>
        <p className="text-[var(--text-muted)] mb-4">
          We could not load this admin page right now.
        </p>
        <button className="btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
