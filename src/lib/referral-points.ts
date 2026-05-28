import "server-only";

import { CHALLENGES } from "@/lib/challenges";
import {
  NW_REFERRAL_STAGE_ADMISSION_TEST_FEE,
  NW_REFERRAL_STAGE_APPLICATION_STARTED,
} from "@/lib/env";
import {
  getReferralCountForStage,
  type ReferralCountResult,
} from "@/lib/nw-referral";
import type { ReferralStageBreakdown } from "./referral-points-shared";
import { adminClient } from "../../utils/supabase/admin";

const REFERRAL_CHALLENGE = CHALLENGES.find((challenge) => challenge.isReferral);
const POINTS_PER_REFERRAL = REFERRAL_CHALLENGE?.points ?? 7;

const REFERRAL_STAGE_AWARD_RULES = [
  {
    stageCode: NW_REFERRAL_STAGE_APPLICATION_STARTED,
    pointsPerCompletion: 0.2,
    label: "NIAT application initiated",
  },
  {
    stageCode: NW_REFERRAL_STAGE_ADMISSION_TEST_FEE,
    pointsPerCompletion: POINTS_PER_REFERRAL,
    label: "admission test fee paid",
  },
] as const;

function roundPoints(value: number): number {
  return Math.round(value * 100) / 100;
}

export type ConnectDotsReferralAwardSuccess = {
  success: true;
  pointsToAward: number;
  totalCompletions: number;
  breakdown: ReferralStageBreakdown[];
  aiReason: string;
};

export type ConnectDotsReferralAwardError = Extract<
  ReferralCountResult,
  { success: false }
>;

export type ConnectDotsReferralAwardResult =
  | ConnectDotsReferralAwardSuccess
  | ConnectDotsReferralAwardError;

const ERROR_PRIORITY: ConnectDotsReferralAwardError["errorCode"][] = [
  "FORBIDDEN",
  "INVALID_JOURNEY_STAGE_CODE",
  "USER_DOES_NOT_EXISTS_FOR_GIVEN_PHONE_NUMBER",
  "USER_ASSOCIATION_DOES_NOT_EXISTS",
  "NETWORK_ERROR",
  "UNKNOWN_ERROR",
];

function pickFirstReferralError(
  errors: ConnectDotsReferralAwardError[]
): ConnectDotsReferralAwardError {
  for (const code of ERROR_PRIORITY) {
    const match = errors.find((error) => error.errorCode === code);
    if (match) return match;
  }
  return errors[0];
}

function buildAiReason(
  breakdown: ReferralStageBreakdown[],
  pointsToAward: number
): string {
  const parts = breakdown
    .filter((row) => row.count > 0)
    .map(
      (row) =>
        `${row.count} ${row.label} (+${row.points} pts, ${row.pointsPerCompletion}/each)`
    );

  if (parts.length === 0) {
    return "0 referrals verified by NW";
  }

  return `NW referrals: ${parts.join("; ")} = ${pointsToAward} pts`;
}

export async function getConnectDotsReferralAward(
  phoneNumber: string
): Promise<ConnectDotsReferralAwardResult> {
  const stageResults = await Promise.all(
    REFERRAL_STAGE_AWARD_RULES.map(async (rule) => ({
      rule,
      result: await getReferralCountForStage(phoneNumber, rule.stageCode),
    }))
  );

  const errors = stageResults
    .map(({ result }) => result)
    .filter((result): result is ConnectDotsReferralAwardError => !result.success);

  if (errors.length > 0) {
    return pickFirstReferralError(errors);
  }

  const breakdown: ReferralStageBreakdown[] = stageResults.map(({ rule, result }) => {
    const count = result.success ? result.referralsCount : 0;
    return {
      stageCode: rule.stageCode,
      label: rule.label,
      count,
      pointsPerCompletion: rule.pointsPerCompletion,
      points: roundPoints(count * rule.pointsPerCompletion),
    };
  });

  const pointsToAward = roundPoints(
    breakdown.reduce((sum, row) => sum + row.points, 0)
  );
  const totalCompletions = breakdown.reduce((sum, row) => sum + row.count, 0);

  return {
    success: true,
    pointsToAward,
    totalCompletions,
    breakdown,
    aiReason: buildAiReason(breakdown, pointsToAward),
  };
}

type SaveReferralSubmissionParams = {
  studentId: string;
  bootcampId: string;
  sectionId: string;
  regionId: string;
  taskId: number;
  pointsToAward: number;
  aiReason: string;
};

export async function saveConnectDotsReferralSubmission(
  params: SaveReferralSubmissionParams
): Promise<
  | { ok: true; submissionId: string; status: "accepted" | "rejected" }
  | { ok: false; message: string }
> {
  const nextStatus = params.pointsToAward > 0 ? "accepted" : "rejected";
  const now = new Date().toISOString();

  const { data: existingRows, error: existingRowsError } = await adminClient
    .from("submissions")
    .select("id, status, points, resubmit_count, created_at")
    .eq("student_id", params.studentId)
    .eq("task_id", params.taskId)
    .order("created_at", { ascending: false });

  if (existingRowsError) {
    return { ok: false, message: "Unable to load challenge submissions." };
  }

  const rows = existingRows ?? [];
  const targetRow =
    rows.find((row) => row.status === "accepted") ??
    rows.find((row) => row.status === "rejected") ??
    rows.find((row) => row.status === "not_started") ??
    rows[0] ??
    null;

  let targetSubmissionId = targetRow?.id ?? null;
  const previousResubmitCount = targetRow?.resubmit_count ?? 0;

  if (!targetSubmissionId) {
    const { data: inserted, error: insertError } = await adminClient
      .from("submissions")
      .insert({
        student_id: params.studentId,
        bootcamp_id: params.bootcampId,
        section_id: params.sectionId,
        region_id: params.regionId,
        task_id: params.taskId,
        status: "not_started",
        points: 0,
        resubmit_count: 0,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return { ok: false, message: "Unable to create challenge submission." };
    }
    targetSubmissionId = inserted.id;
  }

  const { error: submissionUpdateError } = await adminClient
    .from("submissions")
    .update({
      status: nextStatus,
      points: params.pointsToAward,
      ai_reason: params.aiReason,
      verified_at: now,
      updated_at: now,
      resubmit_count: previousResubmitCount + 1,
    })
    .eq("id", targetSubmissionId);

  if (submissionUpdateError) {
    return { ok: false, message: "Unable to update challenge submission." };
  }

  return { ok: true, submissionId: targetSubmissionId, status: nextStatus };
}
