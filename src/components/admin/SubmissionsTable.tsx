"use client";

import { useState } from "react";
import { CHALLENGES } from "@/lib/challenges";

type Row = {
  id: string;
  status: string;
  task_id: number;
  ai_reason: string | null;
  resubmit_count: number;
  created_at: string;
  students?: { full_name: string } | null;
  sections?: { label: string } | null;
  bootcamps?: { name: string } | null;
};

type Props = {
  rows: Row[];
};

export default function SubmissionsTable({ rows }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  async function viewImage(id: string) {
    const res = await fetch(`/api/admin/submissions/${id}/image`);
    const json = (await res.json()) as { data?: { signedUrl: string } };
    setSelectedImage(json.data?.signedUrl ?? null);
  }

  async function override(id: string, verdict: "accepted" | "rejected") {
    await fetch(`/api/admin/submissions/${id}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict, note: note[id] ?? "" }),
    });
    location.reload();
  }

  async function unlock(id: string) {
    await fetch(`/api/admin/submissions/${id}/unlock`, { method: "POST" });
    location.reload();
  }

  return (
    <div className="card p-4 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
            <th className="py-2">Student Name</th>
            <th>Section</th>
            <th>Challenge</th>
            <th>Status</th>
            <th>AI Reason</th>
            <th>Attempts</th>
            <th>Submitted At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--border)] align-top">
              <td className="py-3">{row.students?.full_name ?? "-"}</td>
              <td>Section {row.sections?.label ?? "-"}</td>
              <td>{CHALLENGES.find((c) => c.id === row.task_id)?.title ?? `Task ${row.task_id}`}</td>
              <td>
                <span className={`badge ${
                  row.status === "accepted"
                    ? "badge-accepted"
                    : row.status === "rejected"
                    ? "badge-rejected"
                    : row.status === "pending"
                    ? "badge-pending"
                    : "badge-not-started"
                }`}>
                  {row.status}
                </span>
              </td>
              <td className="max-w-64">{row.ai_reason ?? "-"}</td>
              <td>{row.resubmit_count}</td>
              <td>{new Date(row.created_at).toLocaleString()}</td>
              <td>
                <div className="flex flex-col gap-2">
                  <button className="btn-outline !py-1 !px-2" onClick={() => viewImage(row.id)}>
                    View
                  </button>
                  <input
                    className="input-field !py-1 !px-2 !w-44"
                    placeholder="Override note"
                    value={note[row.id] ?? ""}
                    onChange={(e) =>
                      setNote((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                  />
                  <div className="flex gap-1">
                    <button
                      className="btn-primary !py-1 !px-2"
                      onClick={() => override(row.id, "accepted")}
                    >
                      Accept
                    </button>
                    <button
                      className="btn-outline !py-1 !px-2"
                      onClick={() => override(row.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                  {row.status === "rejected" && row.resubmit_count >= 3 ? (
                    <button className="btn-outline !py-1 !px-2" onClick={() => unlock(row.id)}>
                      Unlock
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedImage ? (
        <div
          className="fixed inset-0 bg-black/70 z-50 grid place-items-center p-6"
          onClick={() => setSelectedImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedImage} alt="submission" className="max-h-[90vh] max-w-[90vw]" />
        </div>
      ) : null}
    </div>
  );
}
