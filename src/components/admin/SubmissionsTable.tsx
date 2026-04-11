"use client";

import { useMemo, useState } from "react";
import { CHALLENGES } from "@/lib/challenges";
import Image from "next/image";
import { Eye, Pencil, LockOpen, Check, X } from "lucide-react";

type Row = {
  id: string;
  status: string;
  task_id: number;
  file_url: string | null;
  ai_reason: string | null;
  resubmit_count: number;
  created_at: string;
  students?: { full_name: string } | null;
  sections?: { label: string } | null;
  bootcamps?: { name: string } | null;
};

type Props = {
  rows: Row[];
  signedImageMap: Record<string, string>;
};

export default function SubmissionsTable({ rows, signedImageMap }: Props) {
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [note, setNote] = useState<Record<string, string>>({});

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

  const selectedChallengeTitle = useMemo(() => {
    if (!selectedRow) return "";
    return CHALLENGES.find((c) => c.id === selectedRow.task_id)?.title ?? `Task ${selectedRow.task_id}`;
  }, [selectedRow]);

  return (
    <div className="card p-4 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
            <th>Challenge</th>
            <th>Image</th>
            <th>Status</th>
            <th>AI Reason</th>
            <th>Submitted At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--border)] align-top">
              <td className="py-3 font-semibold">
                {CHALLENGES.find((c) => c.id === row.task_id)?.title ?? `Task ${row.task_id}`}
              </td>
              <td>
                {row.file_url && signedImageMap[row.file_url] ? (
                  <button
                    type="button"
                    className="relative w-16 h-12 rounded overflow-hidden border border-[var(--card-border)]"
                    onClick={() => setSelectedImage(signedImageMap[row.file_url!])}
                  >
                    <Image
                      src={signedImageMap[row.file_url]}
                      alt="Submission preview"
                      fill
                      unoptimized
                      className="object-contain bg-[var(--bg-base)]"
                    />
                  </button>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">No image</span>
                )}
              </td>
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
              <td>{new Date(row.created_at).toLocaleString()}</td>
              <td>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-outline !py-1.5 !px-2"
                    title="View submission details"
                    onClick={() => {
                      setModalMode("view");
                      setSelectedRow(row);
                      setSelectedImage(
                        row.file_url ? signedImageMap[row.file_url] ?? null : null
                      );
                    }}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-outline !py-1.5 !px-2"
                    title="Edit submission status"
                    onClick={() => {
                      setModalMode("edit");
                      setSelectedRow(row);
                      setSelectedImage(
                        row.file_url ? signedImageMap[row.file_url] ?? null : null
                      );
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedRow ? (
        <div
          className="fixed inset-0 bg-black/70 z-50 grid place-items-center p-6"
          onClick={() => {
            setSelectedRow(null);
            setSelectedImage(null);
          }}
        >
          <div
            className="w-full max-w-3xl card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                {selectedImage ? (
                  <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden border border-[var(--card-border)]">
                    <Image
                      src={selectedImage}
                      alt="Submission image"
                      fill
                      unoptimized
                      className="object-contain bg-[var(--bg-base)]"
                    />
                  </div>
                ) : (
                  <div className="h-64 md:h-80 rounded-lg border border-[var(--card-border)] grid place-items-center text-[var(--text-muted)]">
                    No image available
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-heading font-bold text-[var(--text-dark)]">
                  Submission Details
                </h3>
                <p><span className="font-semibold">Student:</span> {selectedRow.students?.full_name ?? "-"}</p>
                <p><span className="font-semibold">Section:</span> {selectedRow.sections?.label ?? "-"}</p>
                <p><span className="font-semibold">Challenge:</span> {selectedChallengeTitle}</p>
                <p><span className="font-semibold">Status:</span> {selectedRow.status}</p>
                <p><span className="font-semibold">AI Reason:</span> {selectedRow.ai_reason ?? "-"}</p>
                <p><span className="font-semibold">Attempts:</span> {selectedRow.resubmit_count}</p>
                <p><span className="font-semibold">Submitted:</span> {new Date(selectedRow.created_at).toLocaleString()}</p>

                {modalMode === "edit" ? (
                  <div className="space-y-2 pt-2">
                    <input
                      className="input-field"
                      placeholder="Override note"
                      value={note[selectedRow.id] ?? ""}
                      onChange={(e) =>
                        setNote((prev) => ({ ...prev, [selectedRow.id]: e.target.value }))
                      }
                    />
                    <div className="flex items-center gap-2">
                      <button
                        className="btn-primary !py-2 !px-3 inline-flex items-center gap-1"
                        onClick={() => override(selectedRow.id, "accepted")}
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        className="btn-outline !py-2 !px-3 inline-flex items-center gap-1"
                        onClick={() => override(selectedRow.id, "rejected")}
                      >
                        <X size={14} /> Reject
                      </button>
                      {selectedRow.status === "rejected" &&
                      selectedRow.resubmit_count >= 3 ? (
                        <button
                          className="btn-outline !py-2 !px-3 inline-flex items-center gap-1"
                          onClick={() => unlock(selectedRow.id)}
                        >
                          <LockOpen size={14} /> Unlock
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
