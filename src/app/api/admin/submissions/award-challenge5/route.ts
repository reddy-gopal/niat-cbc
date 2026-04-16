import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { CHALLENGES } from "@/lib/challenges";
import { NW_CHALLENGE5_STAGE_CODE } from "@/lib/env";
import { getReferralCountForStage } from "@/lib/nw-referral";
import { adminClient } from "../../../../../../utils/supabase/admin";

const schema = z.object({ studentId: z.string().uuid() });

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

    const referralResult = await getReferralCountForStage(
      student.mobile,
      NW_CHALLENGE5_STAGE_CODE
    );

    if (!referralResult.success) {
      if (
        referralResult.errorCode ===
        "USER_DOES_NOT_EXISTS_FOR_GIVEN_PHONE_NUMBER"
      ) {
        return NextResponse.json(
          {
            success: false,
            code: referralResult.errorCode,
            error:
              "No NW user found for this student's mobile number. Please verify the registered phone number.",
          },
          { status: 400 }
        );
      }

      if (referralResult.errorCode === "USER_ASSOCIATION_DOES_NOT_EXISTS") {
        return NextResponse.json(
          {
            success: false,
            code: referralResult.errorCode,
            error:
              "NW user association is missing. The student is not linked in NW yet.",
          },
          { status: 400 }
        );
      }

      if (referralResult.errorCode === "INVALID_JOURNEY_STAGE_CODE") {
        console.error("[award-challenge5] Invalid NW stage code config.", {
          studentId: parsed.data.studentId,
          stageCode: NW_CHALLENGE5_STAGE_CODE,
        });
        return NextResponse.json(
          {
            success: false,
            code: referralResult.errorCode,
            error:
              "Invalid NW journey stage code configuration. Please contact engineering.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: referralResult.errorCode,
          error: referralResult.message,
        },
        { status: 502 }
      );
    }

    const pointsPerReferral =
      CHALLENGES.find((item) => item.id === 5)?.points ?? 10;
    const pointsToAward = referralResult.referralsCount * pointsPerReferral;

    if (pointsToAward === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No referrals found. No points awarded.",
          referralsCount: 0,
          pointsAwarded: 0,
          studentId: parsed.data.studentId,
        },
        { status: 200 }
      );
    }

    const now = new Date().toISOString();
    const { data: insertedSubmission, error: insertError } = await adminClient
      .from("submissions")
      .insert({
        student_id: student.id,
        bootcamp_id: student.bootcamp_id,
        section_id: student.section_id,
        region_id: student.region_id,
        task_id: 5,
        status: "accepted",
        points: pointsToAward,
        ai_reason: `Auto-awarded from NW referral completion count (${referralResult.referralsCount}).`,
        resubmit_count: 0,
        verification_attempts: 0,
        verified_at: now,
        updated_at: now,
        override_by: admin.id,
        override_note: `Challenge 5 manually awarded from NW referrals (${referralResult.referralsCount}).`,
      })
      .select("id")
      .single();

    if (insertError || !insertedSubmission) {
      return NextResponse.json(
        { success: false, error: "Unable to award challenge points right now." },
        { status: 500 }
      );
    }

    if (student.team_id) {
      const { data: teamData, error: teamQueryError } = await adminClient
        .from("teams")
        .select("total_points")
        .eq("id", student.team_id)
        .maybeSingle();

      if (teamQueryError) {
        return NextResponse.json(
          { success: false, error: "Unable to update team points right now." },
          { status: 500 }
        );
      }

      if (teamData) {
        const { error: teamUpdateError } = await adminClient
          .from("teams")
          .update({
            total_points: teamData.total_points + pointsToAward,
            last_point_at: now,
          })
          .eq("id", student.team_id);

        if (teamUpdateError) {
          return NextResponse.json(
            { success: false, error: "Unable to update team points right now." },
            { status: 500 }
          );
        }
      }
    }

    await logAudit({
      adminId: admin.id,
      action: "award",
      entity: "challenge5",
      entityId: parsed.data.studentId,
      note: `Awarded ${pointsToAward} points for challenge 5 from ${referralResult.referralsCount} referrals`,
      metadata: {
        referrals_count: referralResult.referralsCount,
        points_awarded: pointsToAward,
        submission_id: insertedSubmission.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        referralsCount: referralResult.referralsCount,
        pointsAwarded: pointsToAward,
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
