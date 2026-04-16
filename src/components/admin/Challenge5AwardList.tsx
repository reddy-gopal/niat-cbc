"use client";

import { useState } from "react";

type Row = {
  id: string;
  student_id: string;
  status: string;
  students?: { full_name: string } | null;
  sections?: { label: string } | null;
};

export default function Challenge5AwardList({ rows }: { rows: Row[] }) {
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});

  async function award(studentId: string) {
    setLoadingStudentId(studentId);
    try {
      const response = await fetch("/api/admin/submissions/award-challenge5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        referralsCount?: number;
        pointsAwarded?: number;
        message?: string;
        error?: string;
        code?: string;
      };

      if (!response.ok || !result.success) {
        const detail = result.code ? ` (${result.code})` : "";
        setMessages((prev) => ({
          ...prev,
          [studentId]: {
            type: "error",
            text: `${result.error ?? "Unable to award challenge points right now."}${detail}`,
          },
        }));
        return;
      }

      if ((result.pointsAwarded ?? 0) === 0) {
        setMessages((prev) => ({
          ...prev,
          [studentId]: {
            type: "success",
            text: result.message ?? "No referrals found. No points awarded.",
          },
        }));
        return;
      }

      setMessages((prev) => ({
        ...prev,
        [studentId]: {
          type: "success",
          text: `Referrals: ${result.referralsCount ?? 0} | Points awarded: ${result.pointsAwarded ?? 0}`,
        },
      }));
    } catch {
      setMessages((prev) => ({
        ...prev,
        [studentId]: {
          type: "error",
          text: "Network error while awarding challenge points.",
        },
      }));
    } finally {
      setLoadingStudentId(null);
    }
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
              {messages[row.student_id] ? (
                <p
                  className={`text-xs mt-1 ${
                    messages[row.student_id].type === "success"
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  {messages[row.student_id].text}
                </p>
              ) : null}
            </div>
            <button
              className="btn-primary"
              onClick={() => award(row.student_id)}
              disabled={loadingStudentId === row.student_id}
            >
              {loadingStudentId === row.student_id
                ? "Awarding..."
                : "Award Challenge 5 Points"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
