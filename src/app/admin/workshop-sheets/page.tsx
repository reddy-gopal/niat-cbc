import { adminClient } from "../../../../utils/supabase/admin";
import WorksheetSheetsClient from "@/components/admin/WorkshopSheetsClient";

export default async function WorkshopSheetsPage() {
  const { data: bootcamps } = await adminClient
    .from("bootcamps")
    .select("id, name, date, regions(name)")
    .order("date", { ascending: false });

  const { data: existingSheets } = await adminClient
    .from("bootcamp_workshop_sheets")
    .select("bootcamp_id, workshop, sheet_url");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Workshop Sheets</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Add Google Sheet URLs for each workshop per bootcamp. Used to personalise student videos.
      </p>
      <WorksheetSheetsClient
        bootcamps={(bootcamps ?? []) as { id: string; name: string; date: string; regions: { name?: string } | null }[]}
        existingSheets={(existingSheets ?? []) as { bootcamp_id: string; workshop: string; sheet_url: string }[]}
      />
    </div>
  );
}
