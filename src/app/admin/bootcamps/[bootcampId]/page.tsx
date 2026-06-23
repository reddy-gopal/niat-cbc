import { headers } from "next/headers";
import QRCode from "react-qr-code";
import SectionActions from "@/components/admin/SectionActions";
import { adminClient } from "../../../../../utils/supabase/admin";

type Props = { params: Promise<{ bootcampId: string }> };

export default async function BootcampDetailPage({ params }: Props) {
  const { bootcampId } = await params;
  const { data: bootcamp } = await adminClient
    .from("bootcamps")
    .select("id, name, date, regions(name)")
    .eq("id", bootcampId)
    .maybeSingle();

  if (!bootcamp) return <div>Bootcamp not found.</div>;

  const { data: sections } = await adminClient
    .from("sections")
    .select("id, label, slug, students(id)")
    .eq("bootcamp_id", bootcampId)
    .order("label", { ascending: true });

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const siteUrl = `${protocol}://${host}`;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{bootcamp.name}</h1>
          <p className="text-[var(--text-muted)]">
            {(bootcamp.regions as { name?: string } | null)?.name} · {bootcamp.date}
          </p>
        </div>
        <SectionActions bootcampId={bootcampId} />
      </div>

      <div className="space-y-4">
        {(sections ?? []).map((section) => {
          const joinUrl = `${siteUrl}/?bootcamp_code=join/${section.slug}`;
          return (
            <div key={section.id} className="card p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-semibold">Section {section.label}</h2>
                  <p className="text-sm text-[var(--text-muted)]">Slug: {section.slug}</p>
                  <p className="text-sm mt-2 break-all">{joinUrl}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Students: {(section.students as unknown[] | null)?.length ?? 0}
                  </p>
                </div>
                <div id={`section-qr-${section.id}`} className="bg-white p-2 rounded w-fit">
                  <QRCode value={joinUrl} size={120} />
                </div>
              </div>
              <SectionActions
                joinUrl={joinUrl}
                qrContainerId={`section-qr-${section.id}`}
                downloadFileName={`${section.slug}-qr.svg`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
