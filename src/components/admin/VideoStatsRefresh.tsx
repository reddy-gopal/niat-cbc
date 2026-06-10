"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VideoStatsRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <button
      onClick={() => router.refresh()}
      className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-85 transition"
    >
      Refresh now
    </button>
  );
}
