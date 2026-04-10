"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Region = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CreateBootcampModal({ open, onClose }: Props) {
  const router = useRouter();
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionId, setRegionId] = useState("");
  const [name, setName] = useState("");
  const [newRegionMode, setNewRegionMode] = useState(false);
  const [newRegionName, setNewRegionName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/admin/regions")
      .then((res) => res.json())
      .then((json: { data?: Region[] }) => setRegions(json.data ?? []));
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    let selectedRegionId = regionId;

    if (newRegionMode && newRegionName.trim()) {
      const createRegion = await fetch("/api/admin/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRegionName.trim() }),
      });
      const created = (await createRegion.json()) as { data?: Region };
      selectedRegionId = created.data?.id ?? "";
    }

    const response = await fetch("/api/admin/bootcamps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionId: selectedRegionId, name }),
    });

    setLoading(false);
    if (response.ok) {
      onClose();
      router.refresh();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4">
      <div className="card w-full max-w-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Create Bootcamp</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm block mb-2">Region</label>
            {!newRegionMode ? (
              <select
                className="input-field"
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                required
              >
                <option value="">Select region</option>
                {regions.map((region) => (
                  <option value={region.id} key={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input-field"
                value={newRegionName}
                onChange={(e) => setNewRegionName(e.target.value)}
                placeholder="Enter new region name"
                required
              />
            )}
            <button
              type="button"
              onClick={() => setNewRegionMode((v) => !v)}
              className="text-sm text-[var(--primary)] mt-2"
            >
              {newRegionMode ? "Choose existing region" : "Add New Region"}
            </button>
          </div>

          <div>
            <label className="text-sm block mb-2">Bootcamp Name</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Date will be set automatically when the bootcamp is created.
          </p>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Bootcamp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
