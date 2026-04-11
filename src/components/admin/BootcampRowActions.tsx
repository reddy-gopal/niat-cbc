"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Settings, Trash2 } from "lucide-react";

type Region = { id: string; name: string };

type BootcampRowActionsProps = {
  bootcampId: string;
  name: string;
  regionName: string;
  manageHref: string;
};

export default function BootcampRowActions({
  bootcampId,
  name,
  regionName,
  manageHref,
}: BootcampRowActionsProps) {
  const router = useRouter();
  const [regions, setRegions] = useState<Region[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedName, setEditedName] = useState(name);
  const [editedRegionId, setEditedRegionId] = useState("");

  useEffect(() => {
    void fetch("/api/admin/regions")
      .then((res) => res.json())
      .then((json: { data?: Region[] }) => {
        const allRegions = json.data ?? [];
        setRegions(allRegions);
        const selected = allRegions.find((item) => item.name === regionName);
        if (selected) {
          setEditedRegionId(selected.id);
        }
      });
  }, [regionName]);

  async function saveEdit() {
    setIsSaving(true);
    setError(null);
    const response = await fetch(`/api/admin/bootcamps/${bootcampId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editedName.trim(),
        regionId: editedRegionId || undefined,
      }),
    });
    const json = (await response.json()) as { success?: boolean; error?: string };
    setIsSaving(false);
    if (!response.ok || !json.success) {
      setError(json.error ?? "Unable to update bootcamp right now.");
      return;
    }
    setIsEditing(false);
    router.refresh();
  }

  async function deleteBootcamp() {
    const ok = window.confirm(
      "Delete this bootcamp? This cannot be undone and will fail if sections/students exist."
    );
    if (!ok) return;
    setIsDeleting(true);
    setError(null);
    const response = await fetch(`/api/admin/bootcamps/${bootcampId}`, {
      method: "DELETE",
    });
    const json = (await response.json()) as { success?: boolean; error?: string };
    setIsDeleting(false);
    if (!response.ok || !json.success) {
      setError(json.error ?? "Unable to delete bootcamp right now.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={manageHref}
        className="btn-outline !py-1 !px-2 inline-flex items-center justify-center"
        title="Manage bootcamp"
        aria-label="Manage bootcamp"
      >
        <Settings size={16} />
      </Link>
      <button
        type="button"
        className="btn-outline !py-1 !px-2 inline-flex items-center justify-center"
        onClick={() => setIsEditing(true)}
        title="Edit bootcamp"
        aria-label="Edit bootcamp"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        className="btn-outline !py-1 !px-2 inline-flex items-center justify-center"
        onClick={deleteBootcamp}
        disabled={isDeleting}
        title={isDeleting ? "Deleting bootcamp" : "Delete bootcamp"}
        aria-label={isDeleting ? "Deleting bootcamp" : "Delete bootcamp"}
      >
        <Trash2 size={16} />
      </button>

      {isEditing ? (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4">
          <div className="card w-full max-w-md p-5">
            <h3 className="text-lg font-semibold mb-4">Edit Bootcamp</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm block mb-1">Bootcamp Name</label>
                <input
                  className="input-field"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm block mb-1">Region</label>
                <select
                  className="input-field"
                  value={editedRegionId}
                  onChange={(e) => setEditedRegionId(e.target.value)}
                >
                  <option value="">Keep current region</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>
              {error ? (
                <p className="text-sm text-[var(--status-rejected-text)]">{error}</p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={saveEdit}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
