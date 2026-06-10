"use client";

import { Download } from "lucide-react";

type Row = { student: string; bootcamp: string; event: string; time: string };

export default function VideoStatsExport({ rows }: { rows: Row[] }) {
  function handleExport() {
    const header = "Student,Bootcamp,Event,Time";
    const lines = rows.map((r) =>
      [r.student, r.bootcamp, r.event, new Date(r.time).toLocaleString("en-IN")].map((v) => `"${v}"`).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `video-stats-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-warm)] text-[var(--text-base)] text-sm font-semibold hover:opacity-80 transition border border-[var(--border)]"
    >
      <Download className="w-4 h-4" /> Export CSV
    </button>
  );
}
