import Challenge5AwardList from "@/components/admin/Challenge5AwardList";
import { adminClient } from "../../../../../utils/supabase/admin";

export default async function Challenge5AdminPage() {
  const { data } = await adminClient
    .from("submissions")
    .select("id, student_id, status, students(full_name), sections(label)")
    .eq("task_id", 5)
    .in("status", ["not_started", "rejected"])
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Challenge 5 - Connect Their Dots Manual Awards
      </h1>
      <Challenge5AwardList rows={(data ?? []) as never[]} />
    </div>
  );
}
