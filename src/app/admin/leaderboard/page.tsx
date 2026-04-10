import AdminShell from "@/components/admin/AdminShell";
import AdminLeaderboardClient from "@/components/admin/AdminLeaderboardClient";
import { requireAdmin } from "@/lib/admin-auth";
import { adminClient } from "../../../../utils/supabase/admin";

export default async function AdminLeaderboardPage() {
  const admin = await requireAdmin();
  const { data: students } = await adminClient
    .from("students")
    .select(
      "id, full_name, regions(name), bootcamps(name), sections(label), submissions(points, status)"
    );

  const rows = (students ?? [])
    .map((student) => {
      const submissions = (student.submissions ?? []) as Array<{
        points: number;
        status: string;
      }>;
      return {
        id: student.id as string,
        full_name: student.full_name as string,
        region_name: (student.regions as { name?: string } | null)?.name ?? "",
        bootcamp_name: (student.bootcamps as { name?: string } | null)?.name ?? "",
        section_label: (student.sections as { label?: string } | null)?.label ?? "",
        total_points: submissions.reduce((sum, s) => sum + (s.points ?? 0), 0),
        completed: submissions.filter((s) => s.status === "accepted").length,
      };
    })
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 100);

  return (
    <AdminShell adminEmail={admin.email}>
      <AdminLeaderboardClient rows={rows} />
    </AdminShell>
  );
}
