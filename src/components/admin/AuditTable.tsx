"use client";

import Link from "next/link";
import { useState } from "react";

type Row = {
  id: string;
  created_at: string;
  action: string;
  entity: string;
  entity_id: string;
  note: string | null;
  metadata: Record<string, unknown> | null;
  profiles?: { email?: string } | null;
};

export default function AuditTable({
  rows,
  total,
  page,
}: {
  rows: Row[];
  total: number;
  page: number;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="card p-3 sm:p-4 overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="text-left border-b border-[var(--border)] text-[var(--text-muted)]">
            <th className="py-2">Timestamp</th>
            <th>Admin Email</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Entity ID</th>
            <th>Note</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--border)] align-top">
              <td className="py-2">{new Date(row.created_at).toLocaleString()}</td>
              <td>{row.profiles?.email ?? "-"}</td>
              <td>{row.action}</td>
              <td>{row.entity}</td>
              <td>{row.entity_id}</td>
              <td>{row.note ?? "-"}</td>
              <td>
                <button
                  className="btn-outline !py-1 !px-2"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                  }
                >
                  {expanded[row.id] ? "Hide" : "View"}
                </button>
                {expanded[row.id] && row.metadata ? (
                  <pre className="mt-2 text-xs bg-black/30 p-2 rounded overflow-auto">
                    {JSON.stringify(row.metadata, null, 2)}
                  </pre>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2 mt-4">
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <Link
            key={p}
            href={`/admin/audit?page=${p}`}
            className={`btn-outline ${p === page ? "!border-[var(--primary)]" : ""}`}
          >
            {p}
          </Link>
        ))}
      </div>
    </div>
  );
}
