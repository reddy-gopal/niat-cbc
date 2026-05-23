export type ReferralStageBreakdown = {
  stageCode: string;
  label: string;
  count: number;
  pointsPerCompletion: number;
  points: number;
};

export function formatReferralBreakdownSummary(
  breakdown: ReferralStageBreakdown[],
  pointsAwarded: number
): string {
  const referralCount = breakdown.reduce((sum, row) => sum + row.count, 0);
  if (referralCount === 0) {
    return `${pointsAwarded} points awarded`;
  }

  const detail = breakdown
    .filter((row) => row.count > 0)
    .map((row) => `${row.count} ${row.label}`)
    .join(", ");

  return `${referralCount} referral${referralCount === 1 ? "" : "s"} (${detail}) — ${pointsAwarded} points awarded`;
}
