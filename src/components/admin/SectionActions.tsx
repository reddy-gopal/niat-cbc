"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bootcampId?: string;
  joinUrl?: string;
};

export default function SectionActions({ bootcampId, joinUrl }: Props) {
  const router = useRouter();
  const [label, setLabel] = useState("");

  async function addSection() {
    if (!bootcampId || !label.trim()) return;
    const res = await fetch("/api/admin/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bootcampId, label: label.trim() }),
    });
    if (res.ok) {
      setLabel("");
      router.refresh();
    }
  }

  async function copyUrl() {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
  }

  function downloadQr() {
    if (!joinUrl) return;
    const svg = document.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "section-qr.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2 items-center">
      {joinUrl ? (
        <>
          <button className="btn-outline !py-2 !px-3" onClick={copyUrl}>
            Copy URL
          </button>
          <button className="btn-outline !py-2 !px-3" onClick={downloadQr}>
            Download QR
          </button>
        </>
      ) : null}

      {bootcampId ? (
        <>
          <input
            className="input-field !w-28 !py-2"
            placeholder="Label (A)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button className="btn-primary !py-2 !px-3" onClick={addSection}>
            Add Section
          </button>
        </>
      ) : null}
    </div>
  );
}
