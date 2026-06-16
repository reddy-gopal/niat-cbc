import { adminClient } from "../../../../utils/supabase/admin";
import VideoStatsExport from "@/components/admin/VideoStatsExport";
import VideoStatsRefresh from "@/components/admin/VideoStatsRefresh";

export const dynamic = "force-dynamic";

export default async function VideoStatsPage() {
  // Single query — fetch all events, aggregate in JS
  const [{ data: allEvents }, { data: recentEvents }] = await Promise.all([
    adminClient
      .from("video_events")
      .select("student_id, bootcamp_id, event_type"),
    adminClient
      .from("video_events")
      .select("event_type, created_at, students(full_name), bootcamps(name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const events = allEvents ?? [];

  // Aggregate counts per event type
  const counts: Record<string, number> = {
    visit: 0, preview: 0, photo_upload: 0, download: 0, share: 0,
  };
  const bootcampMap = new Map<string, { id: string; name: string; visits: number; previews: number; downloads: number; shares: number }>();

  for (const ev of events) {
    const type = ev.event_type as string;
    if (type in counts) counts[type]++;

    const bid = ev.bootcamp_id as string;
    if (bid) {
      if (!bootcampMap.has(bid)) bootcampMap.set(bid, { id: bid, name: bid, visits: 0, previews: 0, downloads: 0, shares: 0 });
      const b = bootcampMap.get(bid)!;
      if (type === "visit")    b.visits++;
      if (type === "preview")  b.previews++;
      if (type === "download") b.downloads++;
      if (type === "share")    b.shares++;
    }
  }

  // Resolve bootcamp names
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
    { label: "USERS VISITED",    value: counts.visit,        sub: "unique students" },
    { label: "PREVIEWED REEL",   value: counts.preview,      sub: "unique students" },
    { label: "PHOTO UPLOADS",    value: counts.photo_upload, sub: "unique students" },
    { label: "DOWNLOADED",       value: counts.download,     sub: "unique students" },
    { label: "SHARED",           value: counts.share,        sub: "unique students" },
  ];

  const eventBadge: Record<string, string> = {
    visit:        "bg-blue-500/20 text-blue-400",
    preview:      "bg-purple-500/20 text-purple-400",
    photo_upload: "bg-yellow-500/20 text-yellow-400",
    download:     "bg-green-500/20 text-green-400",
    share:        "bg-[#25D366]/20 text-[#25D366]",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-dark)]">Video · Analytics</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Unique students per action · Auto-refreshes every 15s</p>
        </div>
        <div className="flex items-center gap-3">
          <VideoStatsRefresh />
          <VideoStatsExport rows={exportRows} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-3">
              {s.label}
            </p>
            <p className="text-4xl font-bold text-[var(--text-dark)] mb-1">{s.value.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)]">{s.sub}</p>
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
                  <th className="pb-3 pr-6">Previews</th>
                  <th className="pb-3 pr-6">Downloads</th>
                  <th className="pb-3">Shares</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {bootcampRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-6 font-medium">{row.name}</td>
                    <td className="py-3 pr-6 text-blue-400">{row.visits}</td>
                    <td className="py-3 pr-6 text-purple-400">{row.previews}</td>
                    <td className="py-3 pr-6 text-green-400">{row.downloads}</td>
                    <td className="py-3 text-[#25D366]">{row.shares}</td>
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
