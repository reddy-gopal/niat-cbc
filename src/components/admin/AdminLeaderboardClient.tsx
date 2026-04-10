"use client";

type Row = {
  id: string;
  full_name: string;
  region_name: string;
  bootcamp_name: string;
  section_label: string;
  total_points: number;
  completed: number;
};

export default function AdminLeaderboardClient({ rows }: { rows: Row[] }) {
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
        <h1 className="text-2xl font-bold">Global Leaderboard</h1>
        <button className="btn-outline" onClick={exportCsv}>
          Export CSV
        </button>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
