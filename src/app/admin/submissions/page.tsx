import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";
import SubmissionsTable from "@/components/admin/SubmissionsTable";
import { adminClient } from "../../../../utils/supabase/admin";

type Props = {
  searchParams: Promise<{
    bootcampId?: string;
    sectionId?: string;
    status?: string;
    taskId?: string;
    page?: string;
  }>;
};

export default async function AdminSubmissionsPage({ searchParams }: Props) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const from = (page - 1) * 20;
  const to = from + 19;

  let query = adminClient
    .from("submissions")
    .select("*, students(full_name), sections(label), bootcamps(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.bootcampId) query = query.eq("bootcamp_id", params.bootcampId);
  if (params.sectionId) query = query.eq("section_id", params.sectionId);
  if (params.status) query = query.eq("status", params.status);
  if (params.taskId) query = query.eq("task_id", Number(params.taskId));

  const { data, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / 20));

  return (
    <AdminShell adminEmail={admin.email}>
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Submissions</h1>
        <Link href="/admin/submissions/challenge8" className="btn-outline">
          Challenge 8 Manual Awards
        </Link>
      </div>
      <SubmissionsTable rows={(data ?? []) as never[]} />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <Link
            key={p}
            href={`/admin/submissions?page=${p}`}
            className={`btn-outline ${p === page ? "!border-[var(--primary)]" : ""}`}
          >
            {p}
          </Link>
        ))}
      </div>
    </div>
    </AdminShell>
  );
}
