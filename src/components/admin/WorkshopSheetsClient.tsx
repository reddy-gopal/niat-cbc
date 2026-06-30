"use client";

import { useState } from "react";
import { ChevronDown, Save, CheckCircle2, ExternalLink } from "lucide-react";

type Bootcamp = { id: string; name: string; date: string; regions: { name?: string } | null };
type SheetRow  = { bootcamp_id: string; workshop: string; sheet_url: string };

const WORKSHOPS = [
  { key: "iot",              label: "IoT" },
  { key: "smart_watch",      label: "Smart Watch" },
  { key: "neuroscience",     label: "Neuroscience" },
  { key: "entrepreneurship", label: "Entrepreneurship Canvas" },
] as const;

type Workshop = typeof WORKSHOPS[number]["key"];

function getUrls(sheets: SheetRow[], bootcampId: string): Record<Workshop, string> {
  const map: Record<string, string> = {};
  for (const s of sheets) {
    if (s.bootcamp_id === bootcampId) map[s.workshop] = s.sheet_url;
  }
  return {
    iot:              map["iot"]              ?? "",
    smart_watch:      map["smart_watch"]      ?? "",
    neuroscience:     map["neuroscience"]     ?? "",
    entrepreneurship: map["entrepreneurship"] ?? "",
  };
}

const GLOBAL_ID = "global";

export default function WorkshopSheetsClient({
  bootcamps,
  existingSheets,
}: {
  bootcamps:      Bootcamp[];
  existingSheets: SheetRow[];
}) {
  const options = [
    { id: GLOBAL_ID, name: "★ Common Sheets (Fallback for All Bootcamps)", date: "", regions: null },
    ...bootcamps,
  ];

  const [selectedId, setSelectedId]   = useState<string>(GLOBAL_ID);
  const [urls, setUrls]               = useState<Record<Workshop, string>>(() => getUrls(existingSheets, GLOBAL_ID));
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState<string | null>(null);

  function selectBootcamp(id: string) {
    setSelectedId(id);
    setUrls(getUrls(existingSheets, id));
    setSaved(false);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/workshop-sheets", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          bootcampId: selectedId,
          sheets: WORKSHOPS.map((w) => ({ workshop: w.key, sheet_url: urls[w.key] })),
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error ?? "Failed to save."); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const selected = options.find((b) => b.id === selectedId);
  const filledCount = WORKSHOPS.filter((w) => urls[w.key].trim() !== "").length;

  return (
    <div className="space-y-6">
      {/* Bootcamp selector */}
      <div className="card p-5">
        <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Select Bootcamp</label>
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => selectBootcamp(e.target.value)}
            className="input-field appearance-none pr-10"
          >
            {options.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id === GLOBAL_ID 
                  ? b.name
                  : `${b.name} — ${b.date} ${b.regions?.name ? `(${b.regions.name})` : ""}`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
        </div>
        {selected && (
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {filledCount}/4 sheets added {selectedId === GLOBAL_ID ? "globally" : "for this bootcamp"}
          </p>
        )}
      </div>

      {/* Sheet URL inputs */}
      <div className="card p-5 space-y-5">
        <h2 className="text-base font-semibold">Google Sheet URLs</h2>
        {WORKSHOPS.map((w) => (
          <div key={w.key}>
            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1.5">
              {w.label}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urls[w.key]}
                onChange={(e) => setUrls((prev) => ({ ...prev, [w.key]: e.target.value }))}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="input-field flex-1 text-sm"
              />
              {urls[w.key].trim() && (
                <a
                  href={urls[w.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition border border-[var(--border)] shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-sm text-[var(--primary)] bg-[var(--status-rejected-bg)] p-3 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 btn-primary px-6 py-2.5 text-sm"
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          ) : saving ? (
            "Saving…"
          ) : (
            <><Save className="w-4 h-4" /> Save Sheets</>
          )}
        </button>
      </div>
    </div>
  );
}
