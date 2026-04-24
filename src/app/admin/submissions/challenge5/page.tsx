import Challenge5AwardList from "@/components/admin/Challenge5AwardList";
import { CHALLENGES } from "@/lib/challenges";
import { adminClient } from "../../../../../utils/supabase/admin";

export default async function Challenge5AdminPage() {
  const referralChallenge = CHALLENGES.find((challenge) => challenge.isReferral);
  const { data } = await adminClient
    .from("submissions")
    .select("id, student_id, status, students(full_name), sections(label)")
    .eq("task_id", referralChallenge?.id)
    .in("status", ["not_started", "rejected"])
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Challenge 5 - Connect Their Dots Manual Awards
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Use this page on any device to award pending referral points manually.
      </p>
      <Challenge5AwardList rows={(data ?? []) as never[]} />
    </div>
  );
}
