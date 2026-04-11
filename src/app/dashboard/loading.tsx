export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[var(--bg-tint)] p-6">
      <div className="mx-auto max-w-6xl space-y-4 animate-pulse">
        <div className="h-10 w-64 rounded bg-[var(--card-border)]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 rounded bg-[var(--card-border)]" />
          <div className="h-24 rounded bg-[var(--card-border)]" />
          <div className="h-24 rounded bg-[var(--card-border)]" />
        </div>
      </div>
    </main>
  );
}
