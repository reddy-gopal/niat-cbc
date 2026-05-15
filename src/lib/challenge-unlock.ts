/** Caught You Being Great */
export const CAUGHT_GREAT_TASK_ID = 4;
/** Tribe Time Capsule */
export const TIME_CAPSULE_TASK_ID = 5;

/** Calendar days after bootcamp start date before the challenge unlocks. */
const DAYS_AFTER_BOOTCAMP: Partial<Record<number, number>> = {
  [CAUGHT_GREAT_TASK_ID]: 2,
  [TIME_CAPSULE_TASK_ID]: 1,
};

/** Bootcamp start = Day 1; unlock offset 1 → Day 2, offset 2 → Day 3. */
function getBootcampDayNumber(taskId: number): number | null {
  const offset = DAYS_AFTER_BOOTCAMP[taskId];
  if (offset === undefined) return null;
  return offset + 1;
}

export function startOfLocalCalendarDay(value: Date | string): Date | null {
  const d = typeof value === "string" ? new Date(value) : new Date(value.getTime());
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function addLocalCalendarDays(day: Date, offset: number): Date {
  const next = new Date(day);
  next.setDate(next.getDate() + offset);
  return next;
}

/** First local calendar day when the challenge may be opened/submitted. */
export function getChallengeUnlockDay(
  taskId: number,
  bootcampDate: string | null | undefined
): Date | null {
  const offset = DAYS_AFTER_BOOTCAMP[taskId];
  if (offset === undefined) return null;

  const bootcampDay = startOfLocalCalendarDay(bootcampDate ?? "");
  if (!bootcampDay) return null;

  return addLocalCalendarDays(bootcampDay, offset);
}

export function isChallengeUnlockedByDate(
  taskId: number,
  bootcampDate: string | null | undefined,
  now: Date = new Date()
): boolean {
  const unlockDay = getChallengeUnlockDay(taskId, bootcampDate);
  if (!unlockDay) return true;

  const today = startOfLocalCalendarDay(now);
  if (!today) return false;

  return today.getTime() >= unlockDay.getTime();
}

export function isDateScheduleLockMessage(message: string | null | undefined): boolean {
  return Boolean(message?.startsWith("Unlocks on Day"));
}

export function getChallengeDateLockMessage(
  taskId: number,
  bootcampDate: string | null | undefined
): string | null {
  if (isChallengeUnlockedByDate(taskId, bootcampDate)) return null;

  const dayNumber = getBootcampDayNumber(taskId);
  if (dayNumber === null) {
    return "Not available yet.";
  }

  return `Unlocks on Day ${dayNumber}`;
}
