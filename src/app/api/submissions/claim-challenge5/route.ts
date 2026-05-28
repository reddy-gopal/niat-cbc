import { NextResponse } from "next/server";
import { CHALLENGES } from "@/lib/challenges";
import { getStudentFromRequest } from "@/lib/api-auth";
import {
  getConnectDotsReferralAward,
  saveConnectDotsReferralSubmission,
} from "@/lib/referral-points";
import { adminClient } from "../../../../../utils/supabase/admin";

const REFERRAL_CHALLENGE_ID =
  CHALLENGES.find((challenge) => challenge.isReferral)?.id ?? 3;

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

    const award = await getConnectDotsReferralAward(student.mobile);
    if (!award.success) {
      if (award.errorCode === "FORBIDDEN") {
        return NextResponse.json(
          {
            success: false,
            message:
              "We couldn't verify referrals right now due to an access issue. Please try again shortly or contact support.",
            code: award.errorCode,
          },
          { status: 403 }
        );
      }

      if (
        award.errorCode === "USER_DOES_NOT_EXISTS_FOR_GIVEN_PHONE_NUMBER" ||
        award.errorCode === "USER_ASSOCIATION_DOES_NOT_EXISTS"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Your account is not linked in NW yet. Please contact support or try again later.",
            code: award.errorCode,
          },
          { status: 400 }
        );
      }

      if (award.errorCode === "INVALID_JOURNEY_STAGE_CODE") {
        console.error("[claim-challenge5] Invalid stage code config.", {
          studentId: session.studentId,
        });
        return NextResponse.json(
          {
            success: false,
            message: "Referral stage configuration issue. Please contact support.",
            code: award.errorCode,
          },
          { status: 500 }
        );
      }

      const status = award.errorCode === "NETWORK_ERROR" ? 503 : 502;
      return NextResponse.json(
        {
          success: false,
          message:
            "We couldn't fetch your referral progress right now. Please try again in a moment.",
          code: award.errorCode,
        },
        { status }
      );
    }

    const saved = await saveConnectDotsReferralSubmission({
      studentId: session.studentId,
      bootcampId: student.bootcamp_id,
      sectionId: student.section_id,
      regionId: student.region_id,
      taskId: REFERRAL_CHALLENGE_ID,
      pointsToAward: award.pointsToAward,
      aiReason: award.aiReason,
    });

    if (!saved.ok) {
      return NextResponse.json({ success: false, message: saved.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        referralCount: award.totalCompletions,
        pointsAwarded: award.pointsToAward,
        breakdown: award.breakdown,
        status: saved.status,
        message:
          award.pointsToAward > 0
            ? "Referral points awarded."
            : "No referrals found. Challenge marked as rejected.",
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
