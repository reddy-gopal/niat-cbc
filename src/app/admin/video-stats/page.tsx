import { adminClient } from "../../../../utils/supabase/admin";
import VideoStatsExport from "@/components/admin/VideoStatsExport";
import VideoStatsRefresh from "@/components/admin/VideoStatsRefresh";

export default async function VideoStatsPage() {
  const [
    { count: totalVisits },
    { data: uniqueVisitorsData },
    { count: totalDownloads },
    { count: totalShares },
    { data: byBootcamp },
    { data: recentEvents },
  ] = await Promise.all([
    adminClient.from("video_events").select("id", { count: "exact", head: true }).eq("event_type", "visit"),
    adminClient.from("video_events").select("student_id").eq("event_type", "visit"),
    adminClient.from("video_events").select("id", { count: "exact", head: true }).eq("event_type", "download"),
    adminClient.from("video_events").select("id", { count: "exact", head: true }).eq("event_type", "share"),
    adminClient.from("video_events").select("bootcamp_id, event_type").order("created_at", { ascending: false }),
    adminClient
      .from("video_events")
      .select("event_type, created_at, students(full_name), bootcamps(name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const uniqueVisitors = new Set((uniqueVisitorsData ?? []).map((r) => r.student_id)).size;

  // Aggregate by bootcamp
  const bootcampMap = new Map<string, { name: string; visits: number; shares: number; downloads: number }>();
  for (const row of byBootcamp ?? []) {
    const id = row.bootcamp_id as string;
    if (!bootcampMap.has(id)) bootcampMap.set(id, { name: id, visits: 0, shares: 0, downloads: 0 });
    const e = bootcampMap.get(id)!;
    if (row.event_type === "visit") e.visits++;
    else if (row.event_type === "share") e.shares++;
    else if (row.event_type === "download") e.downloads++;
  }

  const bootcampIds = [...bootcampMap.keys()];
  if (bootcampIds.length > 0) {
    const { data: names } = await adminClient.from("bootcamps").select("id, name").in("id", bootcampIds);
    for (const b of names ?? []) {
      const e = bootcampMap.get(b.id); if (e) e.name = b.name as string;
    }
  }

  const bootcampRows = [...bootcampMap.values()].sort((a, b) => b.downloads - a.downloads);

  const exportRows = (recentEvents ?? []).map((ev) => {
    const student = ev.students as { full_name?: string } | null;
    const bootcamp = ev.bootcamps as { name?: string } | null;
    return { student: student?.full_name ?? "", bootcamp: bootcamp?.name ?? "", event: ev.event_type as string, time: ev.created_at as string };
  });

  const statCards = [
    { label: "USERS VISITED COUNT",         value: totalVisits ?? 0,  sub: "all time" },
    { label: "UNIQUE USERS COUNT",           value: uniqueVisitors,    sub: "by session" },
    { label: "DOWNLOADED COUNT",             value: totalDownloads ?? 0, sub: "all time" },
    { label: "SHARED THROUGH WHATSAPP COUNT", value: totalShares ?? 0,  sub: "all time" },
  ];

  const eventBadge: Record<string, string> = {
    visit:    "bg-blue-500/20 text-blue-400",
    download: "bg-green-500/20 text-green-400",
    share:    "bg-[#25D366]/20 text-[#25D366]",
    preview:  "bg-purple-500/20 text-purple-400",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-dark)]">Video · Analytics</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">All-time totals · Auto-refreshes every 15s</p>
        </div>
        <div className="flex items-center gap-3">
          <VideoStatsRefresh />
          <VideoStatsExport rows={exportRows} />
        </div>
      </div>

      {/* Stat cards — matches reference layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">
        {statCards.map((s) => (
          <div key={s.label} className="card p-6">
            <p className="text-xs font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-4">
              {s.label}
            </p>
            <p className="text-5xl font-bold text-[var(--text-dark)] mb-2">{s.value.toLocaleString()}</p>
            <p className="text-sm text-[var(--text-muted)]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* By Bootcamp */}
      {bootcampRows.length > 0 && (
        <section className="card p-5 mb-8">
          <h2 className="text-base font-semibold mb-4">By Bootcamp</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)] text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-6">Bootcamp</th>
                  <th className="pb-3 pr-6">Visits</th>
                  <th className="pb-3 pr-6">Shares</th>
                  <th className="pb-3">Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {bootcampRows.map((row) => (
                  <tr key={row.name}>
                    <td className="py-3 pr-6 font-medium">{row.name}</td>
                    <td className="py-3 pr-6 text-blue-400">{row.visits}</td>
                    <td className="py-3 pr-6 text-[#25D366]">{row.shares}</td>
                    <td className="py-3 text-green-400">{row.downloads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section className="card p-5">
        <h2 className="text-base font-semibold mb-4">Recent Activity</h2>
        {(recentEvents ?? []).length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">No events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)] text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-6">Student</th>
                  <th className="pb-3 pr-6">Bootcamp</th>
                  <th className="pb-3 pr-6">Event</th>
                  <th className="pb-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(recentEvents ?? []).map((ev, i) => {
                  const student = ev.students as { full_name?: string } | null;
                  const bootcamp = ev.bootcamps as { name?: string } | null;
                  const type = ev.event_type as string;
                  return (
                    <tr key={i}>
                      <td className="py-3 pr-6">{student?.full_name ?? "—"}</td>
                      <td className="py-3 pr-6 text-[var(--text-muted)]">{bootcamp?.name ?? "—"}</td>
                      <td className="py-3 pr-6">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${eventBadge[type] ?? "bg-white/10 text-white"}`}>
                          {type}
                        </span>
                      </td>
                      <td className="py-3 text-[var(--text-muted)]">
                        {new Date(ev.created_at as string).toLocaleString("en-IN", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
