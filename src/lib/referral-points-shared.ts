/** Client-safe referral types and formatters (no env / server imports). */

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
  const parts = breakdown
    .filter((row) => row.count > 0)
    .map((row) => `${row.count} ${row.label} (+${row.points} pts)`);

  if (parts.length === 0) {
    return "No referrals found.";
  }

  return `${parts.join(", ")} — ${pointsAwarded} pts total`;
}
