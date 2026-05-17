import type { StudentChallengeStatus } from "@/types/database";
import { DAILY_POST_TIMEZONE, isOnOrAfterStartOfTodayInTimeZone } from "@/lib/calendar-day";

/**
 * True when task 6 was accepted on the current IST calendar day.
 * Uses `completed_at` + points (not lifetime `is_completed`).
 */
export function isDailyPostAcceptedToday(
  status: StudentChallengeStatus | null | undefined,
  now: Date = new Date()
): boolean {
  if (!status?.completed_at) return false;
  if (!isOnOrAfterStartOfTodayInTimeZone(status.completed_at, DAILY_POST_TIMEZONE, now)) {
    return false;
  }
  return (status.points_earned ?? 0) > 0 || status.latest_status === "accepted";
}
