export default function LeaderboardLoading() {
  return (
    <main className="min-h-screen bg-[var(--bg-tint)] p-6">
      <div className="mx-auto max-w-5xl space-y-4 animate-pulse">
        <div className="h-8 w-56 rounded bg-[var(--card-border)]" />
        <div className="h-64 rounded bg-[var(--card-border)]" />
      </div>
    </main>
  );
}
