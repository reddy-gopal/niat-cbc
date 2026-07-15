"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Loader2, RefreshCw, ChevronDown } from "lucide-react";

type StudentRow = {
  id: string;
  full_name: string;
  visits: number;
  previews: number;
  photo_uploads: number;
  downloads: number;
  shares: number;
};

type RecentEventRow = {
  studentName: string;
  eventType: string;
  createdAt: string;
};

type BootcampOption = {
  id: string;
  name: string;
  sections: Array<{ id: string; label: string }>;
};

type RegionOption = {
  id: string;
  name: string;
  bootcamps: BootcampOption[];
};

type Props = {
  studentRows: StudentRow[];
  recentEvents: RecentEventRow[];
  statCards: Array<{ label: string; value: number; sub: string }>;
  regionOptions: RegionOption[];
  bootcampOptions: BootcampOption[];
  sectionOptions: Array<{ id: string; label: string }>;
  selectedRegionId: string;
  selectedBootcampId: string;
  selectedSectionId: string;
  exportRows: Array<{ student: string; bootcamp: string; event: string; time: string }>;
};

export default function VideoStatsClient({
  studentRows,
  recentEvents,
  statCards,
  regionOptions,
  bootcampOptions,
  sectionOptions,
  selectedRegionId,
  selectedBootcampId,
  selectedSectionId,
  exportRows,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const eventBadge: Record<string, string> = {
    visit:        "bg-blue-500/20 text-blue-400",
    preview:      "bg-purple-500/20 text-purple-400",
    photo_upload: "bg-yellow-500/20 text-yellow-400",
    download:     "bg-green-500/20 text-green-400",
    share:        "bg-[#25D366]/20 text-[#25D366]",
  };

  function navigateWithFilters(regionId: string, bootcampId: string, sectionId: string) {
    const query = new URLSearchParams();
    if (regionId) query.set("regionId", regionId);
    if (bootcampId) query.set("bootcampId", bootcampId);
    if (sectionId) query.set("sectionId", sectionId);
    startTransition(() => {
      router.push(`/admin/video-stats?${query.toString()}`);
    });
  }

  function refreshStats() {
    startTransition(() => {
      router.refresh();
    });
  }

  function exportCsv() {
    const header = ["Student Name", "Visits", "Previews", "Photo Uploads", "Downloads", "Shares"].join(",");
    const lines = studentRows.map((r) =>
      [r.full_name, r.visits, r.previews, r.photo_uploads, r.downloads, r.shares]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video_stats_section_${selectedSectionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--hero-to)] bg-clip-text text-transparent">
            Video · Analytics
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Unique students per action · Auto-refreshes every 15s</p>
        </div>
        <div className="flex w-full lg:w-auto flex-wrap items-center gap-2">
          <button
            className="btn-outline inline-flex items-center gap-2"
            onClick={refreshStats}
            disabled={isPending}
          >
            <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
            Refresh
          </button>
          <button className="btn-outline" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-8 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1 font-bold">Region</label>
          <div className="relative">
            <select
              className="input-field appearance-none pr-10"
              value={selectedRegionId}
              onChange={(e) => {
                const rId = e.target.value;
                const region = regionOptions.find((item) => item.id === rId);
                const bId = region?.bootcamps?.[0]?.id ?? "";
                const sId = region?.bootcamps?.[0]?.sections?.[0]?.id ?? "";
                navigateWithFilters(rId, bId, sId);
              }}
            >
              {regionOptions.map((region) => (
                <option key={region.id} value={region.id}>{region.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1 font-bold">Bootcamp</label>
          <div className="relative">
            <select
              className="input-field appearance-none pr-10"
              value={selectedBootcampId}
              disabled={!selectedRegionId || bootcampOptions.length === 0}
              onChange={(e) => {
                const bId = e.target.value;
                const b = bootcampOptions.find((i) => i.id === bId);
                const sId = b?.sections?.[0]?.id ?? "";
                navigateWithFilters(selectedRegionId, bId, sId);
              }}
            >
              {bootcampOptions.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1 font-bold">Section</label>
          <div className="relative">
            <select
              className="input-field appearance-none pr-10"
              value={selectedSectionId}
              disabled={!selectedBootcampId || sectionOptions.length === 0}
              onChange={(e) => navigateWithFilters(selectedRegionId, selectedBootcampId, e.target.value)}
            >
              {sectionOptions.map((s) => (
                <option key={s.id} value={s.id}>Section {s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-3">
              {s.label}
            </p>
            <p className="text-4xl font-bold text-[var(--text-dark)] mb-1">
              {isPending ? "..." : s.value.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table grid / Loader */}
      {isPending ? (
        <div className="card p-20 text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3 text-[var(--text-muted)]">
            <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
            <p className="font-bold text-sm">Loading stats...</p>
          </div>
        </div>
      ) : (
        <>
          {/* By Student */}
          <section className="card p-5 mb-8">
            <h2 className="text-base font-semibold mb-4">Student Activity</h2>
            {studentRows.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm">No students registered in this section yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)] text-xs uppercase tracking-wider">
                      <th className="pb-3 pr-6">Student Name</th>
                      <th className="pb-3 pr-6">Visits</th>
                      <th className="pb-3 pr-6">Previews</th>
                      <th className="pb-3 pr-6">Photo Uploads</th>
                      <th className="pb-3 pr-6">Downloads</th>
                      <th className="pb-3">Shares</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {studentRows.map((row) => (
                      <tr key={row.id}>
                        <td className="py-3 pr-6 font-medium text-gray-900">{row.full_name}</td>
                        <td className="py-3 pr-6 text-blue-400 font-bold">{row.visits}</td>
                        <td className="py-3 pr-6 text-purple-400 font-bold">{row.previews}</td>
                        <td className="py-3 pr-6 text-yellow-500 font-bold">{row.photo_uploads}</td>
                        <td className="py-3 pr-6 text-green-400 font-bold">{row.downloads}</td>
                        <td className="py-3 text-[#25D366] font-bold">{row.shares}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent Activity */}
          <section className="card p-5">
            <h2 className="text-base font-semibold mb-4">Recent Activity</h2>
            {recentEvents.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm">No events recorded in this section yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)] text-xs uppercase tracking-wider">
                      <th className="pb-3 pr-6">Student</th>
                      <th className="pb-3 pr-6">Event</th>
                      <th className="pb-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {recentEvents.map((ev, i) => (
                      <tr key={i}>
                        <td className="py-3 pr-6 font-medium">{ev.studentName}</td>
                        <td className="py-3 pr-6">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${eventBadge[ev.eventType] ?? "bg-white/10 text-white"}`}>
                            {ev.eventType}
                          </span>
                        </td>
                        <td className="py-3 text-[var(--text-muted)]">
                          {new Date(ev.createdAt).toLocaleString("en-IN", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
