import QRCode from "react-qr-code";
import AdminShell from "@/components/admin/AdminShell";
import SectionActions from "@/components/admin/SectionActions";
import { requireAdmin } from "@/lib/admin-auth";
import { adminClient } from "../../../../../utils/supabase/admin";

type Props = { params: Promise<{ bootcampId: string }> };

export default async function BootcampDetailPage({ params }: Props) {
  const admin = await requireAdmin();
  const { bootcampId } = await params;
  const { data: bootcamp } = await adminClient
    .from("bootcamps")
    .select("id, name, date, regions(name)")
    .eq("id", bootcampId)
    .maybeSingle();

  if (!bootcamp) return <AdminShell adminEmail={admin.email}><div>Bootcamp not found.</div></AdminShell>;

  const { data: sections } = await adminClient
    .from("sections")
    .select("id, label, slug, students(id)")
    .eq("bootcamp_id", bootcampId)
    .order("label", { ascending: true });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <AdminShell adminEmail={admin.email}>
    <div>
      <div className="flex justify-between items-center mb-6">
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
          const joinUrl = `${siteUrl}/join/${section.slug}`;
          return (
            <div key={section.id} className="card p-4">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Section {section.label}</h2>
                  <p className="text-sm text-[var(--text-muted)]">Slug: {section.slug}</p>
                  <p className="text-sm mt-2 break-all">{joinUrl}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Students: {(section.students as unknown[] | null)?.length ?? 0}
                  </p>
                </div>
                <div className="bg-white p-2 rounded">
                  <QRCode value={joinUrl} size={120} />
                </div>
              </div>
              <SectionActions joinUrl={joinUrl} />
            </div>
          );
        })}
      </div>
    </div>
    </AdminShell>
  );
}
