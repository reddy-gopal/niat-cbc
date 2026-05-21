"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  ticketCategoryLabel,
  ticketStatusBadgeClass,
  type TicketStatus,
} from "@/lib/help-tickets";

type StudentRef = {
  id: string;
  full_name: string;
  mobile: string;
};

export type TicketTableRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  image_path: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  student: StudentRef | null;
};

export default function TicketsTable({
  rows,
  total,
  page,
  filters,
}: {
  rows: TicketTableRow[];
  total: number;
  page: number;
  filters: { status: string; category: string; q: string };
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<Record<string, string>>({});
  const [draftNote, setDraftNote] = useState<Record<string, string>>({});

  const pages = Math.max(1, Math.ceil(total / 20));

  function buildPageUrl(overrides: Partial<typeof filters & { page?: string }>) {
    const p = new URLSearchParams();
    const merged = { ...filters, page: String(page), ...overrides };
    if (merged.q) p.set("q", merged.q);
    if (merged.status) p.set("status", merged.status);
    if (merged.category) p.set("category", merged.category);
    if (merged.page && merged.page !== "1") p.set("page", merged.page);
    const qs = p.toString();
    return `/admin/tickets${qs ? `?${qs}` : ""}`;
  }

  const handleSave = async (row: TicketTableRow) => {
    const status = draftStatus[row.id] ?? row.status;
    const adminNote = draftNote[row.id] ?? row.admin_note ?? "";
    setSavingId(row.id);
    try {
      const res = await fetch(`/api/admin/tickets/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote }),
      });
      const data = await res.json();
      if (data.success) {
        setDraftStatus((prev) => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        setDraftNote((prev) => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        router.refresh();
      } else {
        alert(data.error || "Failed to update ticket.");
      }
    } catch {
      alert("Failed to update ticket.");
    } finally {
      setSavingId(null);
    }
  };

  const viewImage = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/image`);
      const data = await res.json();
      if (data.success && data.data?.signedUrl) {
        window.open(data.data.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        alert(data.error || "Unable to load image.");
      }
    } catch {
      alert("Unable to load image.");
    }
  };

  return (
    <div className="space-y-4">
      <form
        className="card p-3 sm:p-4 flex flex-wrap gap-3 items-end"
        action="/admin/tickets"
        method="get"
      >
        <div>
          <label className="block text-xs font-semibold mb-1">Search</label>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Title or description"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm min-w-[200px]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Status</label>
          <select
            name="status"
            defaultValue={filters.status}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-white"
          >
            <option value="">All</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TICKET_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Category</label>
          <select
            name="category"
            defaultValue={filters.category}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-white"
          >
            <option value="">All</option>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary !py-2">
          Filter
        </button>
        <Link href="/admin/tickets" className="btn-outline !py-2">
          Reset
        </Link>
      </form>

      <div className="card p-3 sm:p-4 overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--border)] text-[var(--text-muted)]">
              <th className="py-2">Created</th>
              <th>Student</th>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                  No tickets found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const student = row.student;
                const isOpen = expanded[row.id];
                const statusVal = draftStatus[row.id] ?? row.status;
                const noteVal = draftNote[row.id] ?? row.admin_note ?? "";

                return (
                  <Fragment key={row.id}>
                    <tr className="border-b border-[var(--border)] align-top">
                      <td className="py-2 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td>
                        <div className="font-medium">{student?.full_name ?? "—"}</div>
                        <div className="text-xs text-[var(--text-muted)]">{student?.mobile ?? ""}</div>
                      </td>
                      <td className="max-w-[200px]">
                        <button
                          type="button"
                          className="text-left font-medium text-[var(--primary)] hover:underline"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                          }
                        >
                          {row.title}
                        </button>
                      </td>
                      <td>{ticketCategoryLabel(row.category)}</td>
                      <td>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ticketStatusBadgeClass(
                            row.status as TicketStatus
                          )}`}
                        >
                          {TICKET_STATUS_LABELS[row.status as TicketStatus] ?? row.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-outline !py-1 !px-2 text-xs"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                          }
                        >
                          {isOpen ? "Hide" : "Manage"}
                        </button>
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-tint)]/50">
                        <td colSpan={6} className="py-4 px-2">
                          <p className="text-sm whitespace-pre-wrap mb-3">{row.description}</p>
                          {row.image_path ? (
                            <button
                              type="button"
                              className="btn-outline !py-1 !px-3 text-xs mb-3"
                              onClick={() => viewImage(row.id)}
                            >
                              View screenshot
                            </button>
                          ) : null}
                          <div className="flex flex-wrap gap-3 items-end max-w-2xl">
                            <div>
                              <label className="block text-xs font-semibold mb-1">Status</label>
                              <select
                                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-white"
                                value={statusVal}
                                onChange={(e) =>
                                  setDraftStatus((prev) => ({ ...prev, [row.id]: e.target.value }))
                                }
                              >
                                {TICKET_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {TICKET_STATUS_LABELS[s]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1 min-w-[240px]">
                              <label className="block text-xs font-semibold mb-1">
                                Note to student (optional)
                              </label>
                              <textarea
                                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm min-h-[72px]"
                                value={noteVal}
                                onChange={(e) =>
                                  setDraftNote((prev) => ({ ...prev, [row.id]: e.target.value }))
                                }
                                placeholder="Response visible on student's help page"
                              />
                            </div>
                            <button
                              type="button"
                              className="btn-primary !py-2"
                              disabled={savingId === row.id}
                              onClick={() => handleSave(row)}
                            >
                              {savingId === row.id ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>

        {pages > 1 ? (
          <div className="flex flex-wrap gap-2 mt-4">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={buildPageUrl({ page: String(p) })}
                className={`btn-outline ${p === page ? "!border-[var(--primary)]" : ""}`}
              >
                {p}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
