"use client";

type Row = {
  id: string;
  student_id: string;
  status: string;
  students?: { full_name: string } | null;
  sections?: { label: string } | null;
};

export default function Challenge8List({ rows }: { rows: Row[] }) {
  async function award(studentId: string) {
    await fetch("/api/admin/submissions/award-challenge8", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    location.reload();
  }

  return (
    <div className="card p-4">
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] rounded px-3 py-2"
          >
            <div>
              <p className="font-medium">{row.students?.full_name}</p>
              <p className="text-sm text-[var(--text-muted)]">
                Section {row.sections?.label} · {row.status}
              </p>
            </div>
            <button className="btn-primary" onClick={() => award(row.student_id)}>
              Award 5 Points
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
