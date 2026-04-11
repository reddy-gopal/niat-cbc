export default function AdminDashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-56 rounded bg-[var(--card-border)]" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="h-24 rounded bg-[var(--card-border)]" />
        <div className="h-24 rounded bg-[var(--card-border)]" />
        <div className="h-24 rounded bg-[var(--card-border)]" />
        <div className="h-24 rounded bg-[var(--card-border)]" />
      </div>
    </div>
  );
}
