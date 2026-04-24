import BootcampsClient from "@/components/admin/BootcampsClient";
import BootcampRowActions from "@/components/admin/BootcampRowActions";
import { adminClient } from "../../../../utils/supabase/admin";

type BootcampRow = {
  id: string;
  name: string;
  date: string;
  regions: { name?: string } | null;
  sections: unknown[] | null;
  students: unknown[] | null;
};

export default async function AdminBootcampsPage() {
  const { data: bootcamps } = await adminClient
    .from("bootcamps")
    .select("id, name, date, region_id, regions(name), sections(id), students(id)")
    .order("date", { ascending: false });

  const grouped = ((bootcamps ?? []) as BootcampRow[]).reduce<
    Record<string, BootcampRow[]>
  >(
    (acc, bootcamp) => {
      const regionName = bootcamp.regions?.name ?? "Unknown";
      if (!acc[regionName]) acc[regionName] = [];
      acc[regionName].push(bootcamp);
      return acc;
    },
    {}
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold">Bootcamps</h1>
        <BootcampsClient />
      </div>
      <div className="space-y-6">
        {Object.entries(grouped).map(([region, items]) => (
          <section key={region} className="card p-4">
            <h2 className="font-semibold text-lg mb-3">{region}</h2>
            <div className="space-y-2">
              {items.map((bootcamp) => (
                <div
                  key={bootcamp.id}
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2 border border-[var(--border)] rounded-md px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text-muted)] xl:hidden">Name</p>
                    <p className="truncate">{bootcamp.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] xl:hidden">Date</p>
                    <p>{bootcamp.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] xl:hidden">Region</p>
                    <p>{region}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] xl:hidden">Sections</p>
                    <p>Sections: {bootcamp.sections?.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] xl:hidden">Students</p>
                    <p>Students: {bootcamp.students?.length ?? 0}</p>
                  </div>
                  <div className="xl:justify-self-end">
                    <BootcampRowActions
                      bootcampId={bootcamp.id}
                      name={bootcamp.name}
                      regionName={region}
                      manageHref={`/admin/bootcamps/${bootcamp.id}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
