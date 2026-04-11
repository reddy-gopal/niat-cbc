"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bootcampId?: string;
  joinUrl?: string;
  /** Element id wrapping the QRCode so download targets the correct SVG (not the first svg on the page). */
  qrContainerId?: string;
  downloadFileName?: string;
};

export default function SectionActions({
  bootcampId,
  joinUrl,
  qrContainerId,
  downloadFileName,
}: Props) {
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
    const root = qrContainerId ? document.getElementById(qrContainerId) : null;
    const svgEl = root?.querySelector("svg");
    if (!svgEl) return;

    const svg = svgEl.cloneNode(true) as SVGSVGElement;
    if (!svg.getAttribute("xmlns")) {
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    const serializer = new XMLSerializer();
    let serialized = serializer.serializeToString(svg);
    if (!serialized.includes("xmlns=")) {
      serialized = serialized.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const filename = downloadFileName ?? "section-qr.svg";

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    window.requestAnimationFrame(() => {
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    });
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
