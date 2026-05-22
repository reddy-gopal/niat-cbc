import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { CHALLENGES } from "@/lib/challenges";
import {
  getConnectDotsReferralAward,
  saveConnectDotsReferralSubmission,
} from "@/lib/referral-points";
import { adminClient } from "../../../../../../utils/supabase/admin";

const schema = z.object({ studentId: z.string().uuid() });
const REFERRAL_CHALLENGE = CHALLENGES.find((challenge) => challenge.isReferral);

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid student ID." },
        { status: 400 }
      );
    }

    const { data: student, error: studentError } = await adminClient
      .from("students")
      .select("id, mobile, team_id, bootcamp_id, section_id, region_id")
      .eq("id", parsed.data.studentId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: "Student not found." },
        { status: 404 }
      );
    }

    const award = await getConnectDotsReferralAward(student.mobile);

    if (!award.success) {
      if (award.errorCode === "USER_DOES_NOT_EXISTS_FOR_GIVEN_PHONE_NUMBER") {
        return NextResponse.json(
          {
            success: false,
            code: award.errorCode,
            error:
              "No NW user found for this student's mobile number. Please verify the registered phone number.",
          },
          { status: 400 }
        );
      }

      if (award.errorCode === "USER_ASSOCIATION_DOES_NOT_EXISTS") {
        return NextResponse.json(
          {
            success: false,
            code: award.errorCode,
            error:
              "NW user association is missing. The student is not linked in NW yet.",
          },
          { status: 400 }
        );
      }

      if (award.errorCode === "INVALID_JOURNEY_STAGE_CODE") {
        console.error("[award-challenge5] Invalid NW stage code config.", {
          studentId: parsed.data.studentId,
        });
        return NextResponse.json(
          {
            success: false,
            code: award.errorCode,
            error:
              "Invalid NW journey stage code configuration. Please contact engineering.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: award.errorCode,
          error: award.message,
        },
        { status: 502 }
      );
    }

    if (award.pointsToAward === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No referrals found. No points awarded.",
          referralsCount: 0,
          pointsAwarded: 0,
          breakdown: award.breakdown,
          studentId: parsed.data.studentId,
        },
        { status: 200 }
      );
    }

    const taskId = REFERRAL_CHALLENGE?.id ?? 3;
    const saved = await saveConnectDotsReferralSubmission({
      studentId: student.id,
      bootcampId: student.bootcamp_id,
      sectionId: student.section_id,
      regionId: student.region_id,
      taskId,
      pointsToAward: award.pointsToAward,
      aiReason: award.aiReason,
    });

    if (!saved.ok) {
      return NextResponse.json(
        { success: false, error: "Unable to award challenge points right now." },
        { status: 500 }
      );
    }

    const { error: overrideError } = await adminClient
      .from("submissions")
      .update({
        override_by: admin.id,
        override_note: `Connect Their Dots manually awarded (${award.totalCompletions} NW completions).`,
      })
      .eq("id", saved.submissionId);

    if (overrideError) {
      console.error("[award-challenge5] override metadata update failed", overrideError);
    }

    await logAudit({
      adminId: admin.id,
      action: "award",
      entity: "challenge5",
      entityId: parsed.data.studentId,
      note: `Awarded ${award.pointsToAward} points for Connect Their Dots (${award.totalCompletions} NW completions)`,
      metadata: {
        referrals_count: award.totalCompletions,
        points_awarded: award.pointsToAward,
        breakdown: award.breakdown,
        submission_id: saved.submissionId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        referralsCount: award.totalCompletions,
        pointsAwarded: award.pointsToAward,
        breakdown: award.breakdown,
        studentId: parsed.data.studentId,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to award challenge points right now." },
      { status: 500 }
    );
  }
}
