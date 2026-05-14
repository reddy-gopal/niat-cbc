import type { StudentChallengeStatus } from "@/types/database";

/** True when the student's daily Insta post (task 6) was accepted on the current local calendar day. */
export function isDailyPostAcceptedToday(
  status: StudentChallengeStatus | null | undefined
): boolean {
  if (!status || status.latest_status !== "accepted" || !status.completed_at) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(status.completed_at).getTime() >= startOfToday.getTime();
}
