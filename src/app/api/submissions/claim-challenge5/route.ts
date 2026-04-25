import { NextResponse } from "next/server";
import { CHALLENGES } from "@/lib/challenges";
import { getStudentFromRequest } from "@/lib/api-auth";
import { NW_CHALLENGE5_STAGE_CODE } from "@/lib/env";
import { getReferralCountForStage } from "@/lib/nw-referral";
import { adminClient } from "../../../../../utils/supabase/admin";

const REFERRAL_CHALLENGE_ID =
  CHALLENGES.find((challenge) => challenge.isReferral)?.id ?? 3;
const POINTS_PER_REFERRAL = 7;

type SubmissionRow = {
  id: string;
  status: string;
  points: number;
  resubmit_count: number;
  created_at: string;
};

export async function POST(request: Request) {
  try {
    const { student: session } = await getStudentFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: student, error: studentError } = await adminClient
      .from("students")
      .select("id, mobile, team_id, bootcamp_id, section_id, region_id")
      .eq("id", session.studentId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, message: "Student profile not found." },
        { status: 404 }
      );
    }

    const referralResult = await getReferralCountForStage(
      student.mobile,
      NW_CHALLENGE5_STAGE_CODE
    );
    if (!referralResult.success) {
      if (referralResult.errorCode === "FORBIDDEN") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Referral provider access was denied (403). Please contact support to verify NW API credentials and allowlist.",
            code: referralResult.errorCode,
            stageCode: NW_CHALLENGE5_STAGE_CODE,
          },
          { status: 403 }
        );
      }

      if (
        referralResult.errorCode === "USER_DOES_NOT_EXISTS_FOR_GIVEN_PHONE_NUMBER" ||
        referralResult.errorCode === "USER_ASSOCIATION_DOES_NOT_EXISTS"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Your account is not linked in NW yet. Please contact support or try again later.",
            code: referralResult.errorCode,
          },
          { status: 400 }
        );
      }

      if (referralResult.errorCode === "INVALID_JOURNEY_STAGE_CODE") {
        console.error("[claim-challenge5] Invalid stage code config.", {
          stageCode: NW_CHALLENGE5_STAGE_CODE,
          studentId: session.studentId,
        });
        return NextResponse.json(
          {
            success: false,
            message: "Referral stage configuration issue. Please contact support.",
            code: referralResult.errorCode,
          },
          { status: 500 }
        );
      }

      const status = referralResult.errorCode === "NETWORK_ERROR" ? 503 : 502;
      return NextResponse.json(
        {
          success: false,
          message: referralResult.message,
          code: referralResult.errorCode,
          stageCode: NW_CHALLENGE5_STAGE_CODE,
        },
        { status }
      );
    }

    const referralCount = referralResult.referralsCount;
    if (referralCount === 0) {
      return NextResponse.json(
        { success: false, message: "No referrals found yet." },
        { status: 200 }
      );
    }

    const pointsToAward = referralCount * POINTS_PER_REFERRAL;

    const { data: existingRows, error: existingRowsError } = await adminClient
      .from("submissions")
      .select("id, status, points, resubmit_count, created_at")
      .eq("student_id", session.studentId)
      .eq("task_id", REFERRAL_CHALLENGE_ID)
      .order("created_at", { ascending: false });

    if (existingRowsError) {
      return NextResponse.json(
        { success: false, message: "Unable to load challenge submissions." },
        { status: 500 }
      );
    }

    const rows = (existingRows ?? []) as SubmissionRow[];
    const targetRow =
      rows.find((row) => row.status === "not_started") ??
      rows[0] ??
      null;

    if (targetRow?.status === "accepted" && targetRow.points === pointsToAward) {
      return NextResponse.json(
        { success: false, message: "Already awarded." },
        { status: 200 }
      );
    }

    const now = new Date().toISOString();
    const aiReason = `${referralCount} referral(s) verified by NW`;

    let targetSubmissionId = targetRow?.id ?? null;
    const previousPoints = targetRow?.points ?? 0;
    const previousResubmitCount = targetRow?.resubmit_count ?? 0;

    if (!targetSubmissionId) {
      const { data: inserted, error: insertError } = await adminClient
        .from("submissions")
        .insert({
          student_id: session.studentId,
          bootcamp_id: student.bootcamp_id,
          section_id: student.section_id,
          region_id: student.region_id,
          task_id: REFERRAL_CHALLENGE_ID,
          status: "not_started",
          points: 0,
          resubmit_count: 0,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        return NextResponse.json(
          { success: false, message: "Unable to create challenge submission." },
          { status: 500 }
        );
      }
      targetSubmissionId = inserted.id;
    }

    const nextResubmitCount = previousResubmitCount + 1;
    const { error: submissionUpdateError } = await adminClient
      .from("submissions")
      .update({
        status: "accepted",
        points: pointsToAward,
        ai_reason: aiReason,
        verified_at: now,
        updated_at: now,
        resubmit_count: nextResubmitCount,
      })
      .eq("id", targetSubmissionId);

    if (submissionUpdateError) {
      return NextResponse.json(
        { success: false, message: "Unable to update challenge submission." },
        { status: 500 }
      );
    }

    const delta = pointsToAward - previousPoints;
    if (student.team_id && delta !== 0) {
      const { data: teamData, error: teamReadError } = await adminClient
        .from("teams")
        .select("total_points")
        .eq("id", student.team_id)
        .maybeSingle();

      if (teamReadError || !teamData) {
        return NextResponse.json(
          { success: false, message: "Unable to load team points." },
          { status: 500 }
        );
      }

      const { error: teamUpdateError } = await adminClient
        .from("teams")
        .update({
          total_points: teamData.total_points + delta,
          last_point_at: now,
        })
        .eq("id", student.team_id);

      if (teamUpdateError) {
        return NextResponse.json(
          { success: false, message: "Unable to update team points." },
          { status: 500 }
        );
      }
    }

    const { data: latestAttempt, error: latestAttemptError } = await adminClient
      .from("submission_attempts")
      .select("id")
      .eq("submission_id", targetSubmissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestAttemptError) {
      return NextResponse.json(
        { success: false, message: "Unable to load submission attempt." },
        { status: 500 }
      );
    }

    if (latestAttempt?.id) {
      const { error: attemptUpdateError } = await adminClient
        .from("submission_attempts")
        .update({
          status: "accepted",
          ai_reason: aiReason,
          points: pointsToAward,
          verified_at: now,
          attempt_number: nextResubmitCount,
        })
        .eq("id", latestAttempt.id);

      if (attemptUpdateError) {
        return NextResponse.json(
          { success: false, message: "Unable to update submission attempt." },
          { status: 500 }
        );
      }
    } else {
      const { error: attemptInsertError } = await adminClient
        .from("submission_attempts")
        .insert({
          submission_id: targetSubmissionId,
          student_id: session.studentId,
          task_id: REFERRAL_CHALLENGE_ID,
          bootcamp_id: student.bootcamp_id,
          attempt_number: nextResubmitCount,
          status: "accepted",
          ai_reason: aiReason,
          points: pointsToAward,
          verified_at: now,
        });

      if (attemptInsertError) {
        return NextResponse.json(
          { success: false, message: "Unable to record submission attempt." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        referralCount,
        pointsAwarded: pointsToAward,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to claim challenge points right now." },
      { status: 500 }
    );
  }
}
