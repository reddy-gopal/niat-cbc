"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReverifyPendingButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/submissions/reverify-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          total: number;
          accepted: number;
          rejected: number;
          pending?: number;
          failed: number;
          reconciled?: number;
          acceptedWithPoints?: number;
        };
      };

      if (!response.ok || !payload.success) {
        alert(payload.error ?? "Failed to re-verify pending submissions.");
        return;
      }

      const summary = payload.data;
      alert(
        `Re-verification complete.\nTotal: ${summary?.total ?? 0}\nAccepted: ${summary?.accepted ?? 0}\nRejected: ${summary?.rejected ?? 0}\nStill Pending: ${summary?.pending ?? 0}\nReconciled from parent status: ${summary?.reconciled ?? 0}\nAccepted with Points: ${summary?.acceptedWithPoints ?? 0}\nFailed: ${summary?.failed ?? 0}`
      );
      router.refresh();
    } catch {
      alert("Failed to re-verify pending submissions.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      suppressHydrationWarning
      type="button"
      className="btn-primary w-full sm:w-auto"
      disabled={isLoading}
      onClick={handleClick}
    >
      {isLoading ? "Re-verifying..." : "Re-verify Pending"}
    </button>
  );
}
