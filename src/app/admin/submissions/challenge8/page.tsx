import AdminShell from "@/components/admin/AdminShell";
import Challenge8List from "@/components/admin/Challenge8List";
import { requireAdmin } from "@/lib/admin-auth";
import { adminClient } from "../../../../../utils/supabase/admin";

export default async function Challenge8AdminPage() {
  const admin = await requireAdmin();
  const { data } = await adminClient
    .from("submissions")
    .select("id, student_id, status, students(full_name), sections(label)")
    .eq("task_id", 8)
    .in("status", ["not_started", "rejected"])
    .order("created_at", { ascending: false });

  return (
    <AdminShell adminEmail={admin.email}>
    <div>
      <h1 className="text-2xl font-bold mb-4">Challenge 8 Manual Awards</h1>
      <Challenge8List rows={(data ?? []) as never[]} />
    </div>
    </AdminShell>
  );
}
