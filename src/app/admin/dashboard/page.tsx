import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";
import { adminClient } from "../../../../utils/supabase/admin";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);
  const [{ count: bootcamps }, { count: students }, { count: todaySubmissions }] =
    await Promise.all([
      adminClient.from("bootcamps").select("id", { count: "exact", head: true }),
      adminClient.from("students").select("id", { count: "exact", head: true }),
      adminClient
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .gt("created_at", oneDayAgo.toISOString())
        .neq("status", "not_started"),
    ]);

  const { data: allSubs } = await adminClient.from("submissions").select("status");
  const reviewed = (allSubs ?? []).filter(
    (item) => item.status === "accepted" || item.status === "rejected"
  );
  const accepted = reviewed.filter((item) => item.status === "accepted").length;
  const acceptanceRate = reviewed.length
    ? (accepted * 100) / reviewed.length
    : 0;

  const { data: regions } = await adminClient.from("regions").select("id, name");
  const { data: studentsData } = await adminClient.from("students").select("region_id");
  const total = studentsData?.length ?? 0;
  const byRegion = (regions ?? []).map((region) => {
    const count = (studentsData ?? []).filter(
      (student) => student.region_id === region.id
    ).length;
    return { name: region.name, count, pct: total ? (count * 100) / total : 0 };
  });

  return (
    <AdminShell adminEmail={admin.email}>
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-[var(--text-muted)]">Total Bootcamps</p>
          <p className="text-3xl font-bold mt-2">{bootcamps ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-[var(--text-muted)]">Total Students</p>
          <p className="text-3xl font-bold mt-2">{students ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-[var(--text-muted)]">Submissions Today</p>
          <p className="text-3xl font-bold mt-2">{todaySubmissions ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-[var(--text-muted)]">AI Acceptance Rate</p>
          <p className="text-3xl font-bold mt-2">{acceptanceRate.toFixed(1)}%</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-xl font-semibold mb-4">Students by Region</h2>
        <div className="space-y-3">
          {byRegion.map((row) => (
            <div key={row.name}>
              <div className="flex justify-between text-sm mb-1">
                <span>{row.name}</span>
                <span className="text-[var(--text-muted)]">{row.count}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--primary)]"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
    </AdminShell>
  );
}
