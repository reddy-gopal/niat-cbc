import Link from "next/link";
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
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const from = (page - 1) * 20;
  const to = from + 19;

  let query = adminClient
    .from("submissions")
    .select(
      "id,status,task_id,file_url,ai_reason,resubmit_count,created_at,students(full_name),sections(label)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.bootcampId) query = query.eq("bootcamp_id", params.bootcampId);
  if (params.sectionId) query = query.eq("section_id", params.sectionId);
  if (params.status) query = query.eq("status", params.status);
  if (params.taskId) query = query.eq("task_id", Number(params.taskId));

  const { data, count } = await query;
  const submissionRows = (data ?? []) as Array<{
    id: string;
    file_url: string | null;
  }>;

  const filePaths = submissionRows
    .map((row) => row.file_url)
    .filter((fileUrl): fileUrl is string => Boolean(fileUrl));
  const uniquePaths = Array.from(new Set(filePaths));

  const signedMap: Record<string, string> = {};
  if (uniquePaths.length > 0) {
    const { data: signedUrls } = await adminClient.storage
      .from("submissions")
      .createSignedUrls(uniquePaths, 60);

    for (const item of signedUrls ?? []) {
      if (!item.path || !item.signedUrl) continue;
      signedMap[item.path] = item.signedUrl;
    }
  }
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / 20));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Submissions</h1>
        <Link href="/admin/submissions/challenge8" className="btn-outline">
          Challenge 8 Manual Awards
        </Link>
      </div>
      <SubmissionsTable
        rows={(data ?? []) as never[]}
        signedImageMap={signedMap}
      />
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
  );
}
