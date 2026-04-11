import AuditTable from "@/components/admin/AuditTable";
import { adminClient } from "../../../../utils/supabase/admin";

type Props = { searchParams: Promise<{ page?: string }> };

export default async function AuditPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const from = (page - 1) * 50;
  const to = from + 49;

  const { data, count } = await adminClient
    .from("audit_logs")
    .select("*, profiles(email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Audit Log</h1>
      <AuditTable rows={(data ?? []) as never[]} total={count ?? 0} page={page} />
    </div>
  );
}
