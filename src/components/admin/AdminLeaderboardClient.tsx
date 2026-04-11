"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";

type Row = {
  id: string;
  full_name: string;
  region_name: string;
  bootcamp_name: string;
  section_label: string;
  total_points: number;
  completed: number;
};

type BootcampOption = {
  id: string;
  name: string;
  sections: Array<{ id: string; label: string }>;
};

type Props = {
  rows: Row[];
  bootcampOptions: BootcampOption[];
  sectionOptions: Array<{ id: string; label: string }>;
  selectedBootcampId: string;
  selectedSectionId: string;
};

export default function AdminLeaderboardClient({
  rows,
  bootcampOptions,
  sectionOptions,
  selectedBootcampId,
  selectedSectionId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigateWithFilters(bootcampId: string, sectionId: string) {
    const query = new URLSearchParams();
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
    const header = [
      "name",
      "region",
      "bootcamp",
      "section",
      "points",
      "completed",
    ].join(",");
    const lines = rows.map((r) =>
      [
        r.full_name,
        r.region_name,
        r.bootcamp_name,
        r.section_label,
        r.total_points,
        r.completed,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leaderboard.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Section Leaderboard</h1>
        <div className="flex items-center gap-2">
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
      <div className="card p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1">
            Bootcamp
          </label>
          <select
            className="input-field"
            value={selectedBootcampId}
            onChange={(e) => {
              const bootcampId = e.target.value;
              const bootcamp = bootcampOptions.find((item) => item.id === bootcampId);
              const firstSectionId = bootcamp?.sections?.[0]?.id ?? "";
              navigateWithFilters(bootcampId, firstSectionId);
            }}
          >
            {bootcampOptions.map((bootcamp) => (
              <option key={bootcamp.id} value={bootcamp.id}>
                {bootcamp.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1">
            Section
          </label>
          <select
            className="input-field"
            value={selectedSectionId}
            onChange={(e) =>
              navigateWithFilters(selectedBootcampId, e.target.value)
            }
          >
            {sectionOptions.map((section) => (
              <option key={section.id} value={section.id}>
                Section {section.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="card p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--border)] text-[var(--text-muted)]">
              <th className="py-2">Name</th>
              <th>Region</th>
              <th>Bootcamp</th>
              <th>Section</th>
              <th>Points</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr>
                <td className="py-10 text-center" colSpan={6}>
                  <div className="inline-flex items-center gap-2 text-[var(--text-muted)]">
                    <Loader2 size={16} className="animate-spin" />
                    Loading leaderboard...
                  </div>
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)]">
                <td className="py-2">{row.full_name}</td>
                <td>{row.region_name}</td>
                <td>{row.bootcamp_name}</td>
                <td>{row.section_label}</td>
                <td>{row.total_points}</td>
                <td>{row.completed}</td>
              </tr>
            ))}
            {rows.length === 0 && !isPending ? (
              <tr>
                <td
                  className="py-6 text-center text-[var(--text-muted)]"
                  colSpan={6}
                >
                  No students found for this section.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
