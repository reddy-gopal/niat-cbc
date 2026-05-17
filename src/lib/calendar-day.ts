/** Bootcamp daily challenges reset at midnight IST. */
export const DAILY_POST_TIMEZONE = "Asia/Kolkata";

function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - date.getTime();
}

/** Start of the current calendar day in `timeZone`, as a UTC instant. */
export function getStartOfTodayInTimeZone(
  timeZone: string = DAILY_POST_TIMEZONE,
  now: Date = new Date()
): Date {
  const dateKey = now.toLocaleDateString("en-CA", { timeZone });
  const [y, m, d] = dateKey.split("-").map(Number);
  const middayUtc = Date.UTC(y, m - 1, d, 12, 0, 0, 0);
  const offset = getTimeZoneOffsetMs(timeZone, new Date(middayUtc));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - offset);
}

export function getStartOfTodayIso(
  timeZone: string = DAILY_POST_TIMEZONE,
  now: Date = new Date()
): string {
  return getStartOfTodayInTimeZone(timeZone, now).toISOString();
}

export function isOnOrAfterStartOfTodayInTimeZone(
  iso: string | null | undefined,
  timeZone: string = DAILY_POST_TIMEZONE,
  now: Date = new Date()
): boolean {
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  return ts >= getStartOfTodayInTimeZone(timeZone, now).getTime();
}
