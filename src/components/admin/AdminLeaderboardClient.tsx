"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Loader2, RefreshCw, Users, User } from "lucide-react";
import { CHALLENGES } from "@/lib/challenges";

type Row = {
  id: string;
  full_name: string;
  region_name: string;
  bootcamp_name: string;
  section_label: string;
  total_points: number;
  completed: number;
};

type TeamRow = {
  id: string;
  name: string;
  average_points: number;
  total_points: number;
  member_count: number;
  members: string[];
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
  rows: Row[];
  teamRows: TeamRow[];
  regionOptions: RegionOption[];
  bootcampOptions: BootcampOption[];
  sectionOptions: Array<{ id: string; label: string }>;
  selectedRegionId: string;
  selectedBootcampId: string;
  selectedSectionId: string;
  scoringError?: string;
};

export default function AdminLeaderboardClient({
  rows,
  teamRows,
  regionOptions,
  bootcampOptions,
  sectionOptions,
  selectedRegionId,
  selectedBootcampId,
  selectedSectionId,
  scoringError,
}: Props) {
  const totalChallenges = CHALLENGES.length;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"individual" | "team">("individual");

  function navigateWithFilters(regionId: string, bootcampId: string, sectionId: string) {
    const query = new URLSearchParams();
    if (regionId) query.set("regionId", regionId);
    if (bootcampId) query.set("bootcampId", bootcampId);
    if (sectionId) query.set("sectionId", sectionId);
    startTransition(() => {
      router.push(`/admin/leaderboard?${query.toString()}`);
    });
  }

  function refreshLeaderboard() {
    startTransition(() => {
      router.refresh();
    });
  }

  function exportCsv() {
    if (view === "individual") {
      const header = ["name", "region", "bootcamp", "section", "points", "completed"].join(",");
      const lines = rows.map((r) =>
        [r.full_name, r.region_name, r.bootcamp_name, r.section_label, r.total_points, r.completed]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leaderboard_individual_${selectedSectionId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const header = ["tribe_name", "avg_points", "total_points", "members_count", "members"].join(",");
      const lines = teamRows.map((r) =>
        [r.name, r.average_points.toFixed(2), r.total_points, r.member_count, r.members.join("; ")]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leaderboard_tribe_${selectedSectionId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--hero-to)] bg-clip-text text-transparent">
          Section standings
        </h1>
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-lg border border-[var(--border)] shadow-sm flex mr-2">
             <button 
                onClick={() => setView("individual")}
                className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${view === "individual" ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
             >
                <User size={14} /> Individual
             </button>
             <button 
                onClick={() => setView("team")}
                className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${view === "team" ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
             >
                <Users size={14} /> Tribe
             </button>
          </div>
          <button
            className="btn-outline inline-flex items-center gap-2"
            onClick={refreshLeaderboard}
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

      <div className="card p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1 font-bold">Region</label>
          <select
            className="input-field"
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
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1 font-bold">Bootcamp</label>
          <select
            className="input-field"
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
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1 font-bold">Section</label>
          <select
            className="input-field"
            value={selectedSectionId}
            disabled={!selectedBootcampId || sectionOptions.length === 0}
            onChange={(e) => navigateWithFilters(selectedRegionId, selectedBootcampId, e.target.value)}
          >
            {sectionOptions.map((s) => (
              <option key={s.id} value={s.id}>Section {s.label}</option>
            ))}
          </select>
        </div>
      </div>
      {scoringError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {scoringError}
        </div>
      )}

      <div className="card p-0 overflow-hidden shadow-xl border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-gray-50 border-b border-[var(--border)] text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px]">
              {view === "individual" ? (
                <>
                  <th className="py-4 px-6 text-center w-16">#</th>
                  <th className="py-4">Student Name</th>
                  <th>Region</th>
                  <th>Total Points</th>
                  <th className="text-center">Challenges</th>
                </>
              ) : (
                <>
                  <th className="py-4 px-6 text-center w-16">#</th>
                  <th className="py-4">Tribe Name</th>
                  <th>Members</th>
                  <th className="text-right">Avg Pts</th>
                  <th className="text-center w-24">Size</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] bg-white">
            {isPending && (
              <tr>
                <td className="py-20 text-center" colSpan={6}>
                  <div className="inline-flex flex-col items-center gap-3 text-[var(--text-muted)]">
                    <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
                    <p className="font-bold text-sm">Calculating rankings...</p>
                  </div>
                </td>
              </tr>
            )}
            
            {!isPending && view === "individual" && rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="py-4 px-6 text-center font-bold text-gray-400">#{idx + 1}</td>
                <td className="py-4">
                  <div className="font-bold text-gray-900">{row.full_name}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{row.bootcamp_name} · Section {row.section_label}</div>
                </td>
                <td className="text-gray-600 font-medium">{row.region_name}</td>
                <td className="font-black text-[var(--primary)]">{row.total_points}</td>
                <td className="text-center">
                   <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md font-bold text-xs border border-green-100">{row.completed}/{totalChallenges}</span>
                </td>
              </tr>
            ))}

            {!isPending && view === "team" && teamRows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="py-4 px-6 text-center font-bold text-gray-400">#{idx + 1}</td>
                <td className="py-4">
                   <div className="font-bold text-[var(--primary)]">{row.name}</div>
                   <div className="text-[10px] text-gray-400 uppercase font-black">Total Pts: {row.total_points}</div>
                </td>
                <td className="py-4">
                   <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{row.members.join(", ")}</p>
                </td>
                <td className="text-right py-4 pr-10">
                   <div className="font-black text-lg text-gray-900">{row.average_points.toFixed(1)}</div>
                </td>
                <td className="text-center py-4">
                   <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg font-black text-xs">{row.member_count}</span>
                </td>
              </tr>
            ))}

            {((view === "individual" && rows.length === 0) || (view === "team" && teamRows.length === 0)) && !isPending && (
              <tr>
                <td className="py-20 text-center text-[var(--text-muted)]" colSpan={6}>
                   <Users size={48} className="mx-auto mb-4 opacity-10" />
                   <p className="font-bold text-lg">No data found</p>
                   <p className="text-sm">Try selecting a different bootcamp or section.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
