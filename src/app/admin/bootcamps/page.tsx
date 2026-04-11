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
      <div className="flex items-center justify-between mb-6">
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
                  className="grid grid-cols-1 md:grid-cols-6 gap-2 border border-[var(--border)] rounded-md px-3 py-2"
                >
                  <div>{bootcamp.name}</div>
                  <div>{bootcamp.date}</div>
                  <div>{region}</div>
                  <div>Sections: {bootcamp.sections?.length ?? 0}</div>
                  <div>Students: {bootcamp.students?.length ?? 0}</div>
                  <div>
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
