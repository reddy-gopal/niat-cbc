"use client";

import { useCallback, useEffect, useState } from "react";
import { StudentAppShell } from "./StudentAppShell";
import { studentMainTopPaddingClass } from "./StudentNavbar";
import { useToast } from "../ui/Toast";
import TicketImageUpload from "./TicketImageUpload";
import {
  TICKET_CATEGORIES,
  TICKET_STATUS_LABELS,
  ticketCategoryLabel,
  ticketStatusBadgeClass,
  type TicketStatus,
} from "@/lib/help-tickets";

type TicketRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  adminNote: string | null;
  hasImage: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function HelpClient({ firstName }: { firstName: string }) {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(TICKET_CATEGORIES[0].value);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (data.success) {
        setTickets(data.data.tickets ?? []);
      } else {
        showToast(data.error || "Failed to load tickets.", "error");
      }
    } catch {
      showToast("Failed to load tickets.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clearFile = () => setFile(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory(TICKET_CATEGORIES[0].value);
    setFile(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      showToast("Query title must be at least 3 characters.", "error");
      return;
    }
    if (description.trim().length < 10) {
      showToast("Please describe your issue in at least 10 characters.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      if (file) formData.append("file", file);

      const res = await fetch("/api/tickets", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        showToast("Help ticket submitted. We'll get back to you soon.", "success");
        resetForm();
        await loadTickets();
      } else {
        showToast(data.error || "Failed to submit ticket.", "error");
      }
    } catch {
      showToast("Failed to submit ticket.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const viewImage = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/image`);
      const data = await res.json();
      if (data.success && data.data?.signedUrl) {
        window.open(data.data.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        showToast(data.error || "Unable to load image.", "error");
      }
    } catch {
      showToast("Unable to load image.", "error");
    }
  };

  return (
    <StudentAppShell firstName={firstName}>
      <main className={`${studentMainTopPaddingClass} mx-auto max-w-2xl px-4 pb-8`}>
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold text-[var(--text-dark)]">Help & Support</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Facing an issue? Raise a ticket and our team will assist you.
          </p>
        </div>

        {!showForm ? (
          <button type="button" className="btn-primary w-full mb-6" onClick={() => setShowForm(true)}>
            + New help ticket
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="card p-4 sm:p-5 mb-6 space-y-4">
            <h2 className="font-heading font-bold text-lg">New ticket</h2>

            <div>
              <label className="block text-sm font-semibold mb-1" htmlFor="ticket-title">
                Query (short title)
              </label>
              <input
                id="ticket-title"
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--text-dark)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-colors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Submission not verifying"
                maxLength={200}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1" htmlFor="ticket-category">
                Category
              </label>
              <select
                id="ticket-category"
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--text-dark)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-colors"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1" htmlFor="ticket-description">
                Details (paragraph)
              </label>
              <textarea
                id="ticket-description"
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm min-h-[120px] text-[var(--text-dark)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-colors resize-y"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened, what you tried, and any error messages..."
                maxLength={5000}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--text-dark)]">
                Screenshot <span className="font-normal text-[var(--text-muted)]">(optional)</span>
              </label>
              <TicketImageUpload
                file={file}
                previewUrl={previewUrl}
                onFileSelect={setFile}
                onClear={clearFile}
                disabled={submitting}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit ticket"}
              </button>
              <button
                type="button"
                className="btn-outline flex-1"
                disabled={submitting}
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <section>
          <h2 className="font-heading font-bold text-lg mb-3">Your tickets</h2>
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : tickets.length === 0 ? (
            <div className="card p-6 text-center text-sm text-[var(--text-muted)]">
              No tickets yet. Create one if you need help.
            </div>
          ) : (
            <ul className="space-y-3">
              {tickets.map((t) => (
                <li key={t.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-[var(--text-dark)]">{t.title}</h3>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ticketStatusBadgeClass(
                        t.status as TicketStatus
                      )}`}
                    >
                      {TICKET_STATUS_LABELS[t.status as TicketStatus] ?? t.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    {ticketCategoryLabel(t.category)} · {new Date(t.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{t.description}</p>
                  {t.adminNote ? (
                    <div className="mt-3 p-3 rounded-lg bg-[var(--bg-tint)] text-sm">
                      <p className="text-xs font-semibold text-[var(--primary)] mb-1">Team response</p>
                      <p className="whitespace-pre-wrap">{t.adminNote}</p>
                    </div>
                  ) : null}
                  {t.hasImage ? (
                    <button
                      type="button"
                      className="btn-outline !py-1 !px-3 text-xs mt-3"
                      onClick={() => viewImage(t.id)}
                    >
                      View attachment
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </StudentAppShell>
  );
}
