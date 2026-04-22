import AdminLeaderboardClient from "@/components/admin/AdminLeaderboardClient";
import { adminClient } from "../../../../utils/supabase/admin";

const COMPLETED_ATTEMPT_STATUSES = new Set(["accepted", "approved"]);

type Props = {
  searchParams: Promise<{
    regionId?: string;
    bootcampId?: string;
    sectionId?: string;
  }>;
};

export default async function AdminLeaderboardPage({ searchParams }: Props) {
  const params = await searchParams;

  const [{ data: regions }, { data: bootcamps }] = await Promise.all([
    adminClient.from("regions").select("id,name").order("name", { ascending: true }),
    adminClient
      .from("bootcamps")
      .select("id,name,date,region_id,sections(id,label)")
      .order("date", { ascending: false }),
  ]);

  const regionOptions = (regions ?? []).map((region) => ({
    id: region.id as string,
    name: region.name as string,
    bootcamps: ((bootcamps ?? []) as Array<{
      id: string;
      name: string;
      region_id: string;
      sections: { id: string; label: string }[] | null;
    }>)
      .filter((bootcamp) => bootcamp.region_id === region.id)
      .map((bootcamp) => ({
        id: bootcamp.id,
        name: bootcamp.name,
        sections: (bootcamp.sections ?? []).map((section) => ({
          id: section.id,
          label: section.label,
        })),
      })),
  }));

  const selectedRegion =
    regionOptions.find((region) => region.id === params.regionId) ?? regionOptions[0];

  const bootcampOptions = selectedRegion?.bootcamps ?? [];
  const selectedBootcamp =
    bootcampOptions.find((bootcamp) => bootcamp.id === params.bootcampId) ??
    bootcampOptions[0];

  const sectionOptions = selectedBootcamp?.sections ?? [];
  const selectedSection =
    sectionOptions.find((section) => section.id === params.sectionId) ??
    sectionOptions[0];

  const selectedRegionId = selectedRegion?.id ?? "";
  const selectedBootcampId = selectedBootcamp?.id ?? "";
  const selectedSectionId = selectedSection?.id ?? "";

  let rows: Array<{
    id: string;
    full_name: string;
    region_name: string;
    bootcamp_name: string;
    section_label: string;
    total_points: number;
    completed: number;
  }> = [];
  let scoringError: string | undefined;

  if (selectedRegionId && selectedBootcampId && selectedSectionId) {
    const { data: students, error: studentsError } = await adminClient
      .from("students")
      .select(
        "id, full_name, team_id, regions(name), bootcamps(name), sections(label)"
      )
      .eq("region_id", selectedRegionId)
      .eq("bootcamp_id", selectedBootcampId)
      .eq("section_id", selectedSectionId);

    const { data: teams, error: teamsError } = await adminClient
      .from("teams")
      .select("id, name, leader_id")
      .eq("section_id", selectedSectionId);

    const studentIds = (students ?? []).map((student) => student.id as string);
    const { data: allAttemptsRaw, error: attemptsError } = studentIds.length
      ? await adminClient
          .from("submission_attempts")
          .select("student_id, task_id, points, status")
          .in("student_id", studentIds)
          .not("points", "is", null)
      : { data: [], error: null };

    if (studentsError || teamsError || attemptsError) {
      const reasons = [studentsError, teamsError, attemptsError]
        .filter(Boolean)
        .map((error) => error?.message ?? "Unknown error");
      scoringError = `Leaderboard scoring data may be incomplete: ${reasons.join(" | ")}`;
      console.error("[admin/leaderboard] Data fetch failed:", {
        studentsError,
        teamsError,
        attemptsError,
      });
    }

    const allAttempts =
      (allAttemptsRaw as Array<{
        student_id: string | null;
        task_id: number | string | null;
        points: number | string | null;
        status: string | null;
      }> | null)?.filter((attempt) =>
        COMPLETED_ATTEMPT_STATUSES.has(String(attempt.status ?? "").trim().toLowerCase())
      ) ?? [];

    const scoreMap = new Map<string, { totalPoints: number; completedChallenges: number }>();
    for (const attempt of allAttempts ?? []) {
      const studentId = String(attempt.student_id ?? "");
      if (!studentId) continue;
      if (!scoreMap.has(studentId)) {
        scoreMap.set(studentId, { totalPoints: 0, completedChallenges: 0 });
      }
      const entry = scoreMap.get(studentId)!;
      entry.totalPoints += Number(attempt.points ?? 0) || 0;
    }

    const taskMap = new Map<string, Set<number>>();
    for (const attempt of allAttempts ?? []) {
      const studentId = String(attempt.student_id ?? "");
      if (!studentId) continue;
      if (!taskMap.has(studentId)) taskMap.set(studentId, new Set<number>());
      const taskId = Number(attempt.task_id);
      if (Number.isFinite(taskId)) {
        taskMap.get(studentId)!.add(taskId);
      }
    }
    for (const [studentId, tasks] of taskMap) {
      if (!scoreMap.has(studentId)) {
        scoreMap.set(studentId, { totalPoints: 0, completedChallenges: 0 });
      }
      scoreMap.get(studentId)!.completedChallenges = tasks.size;
    }

    const teamMap = new Map<string, { name: string; totalPoints: number; memberCount: number; members: string[] }>();
    (teams || []).forEach(t => teamMap.set(t.id, { name: t.name, totalPoints: 0, memberCount: 0, members: [] }));

    rows = (students ?? [])
      .map((student) => {
        const score = scoreMap.get(student.id as string) ?? {
          totalPoints: 0,
          completedChallenges: 0,
        };
        
        if (student.team_id && teamMap.has(student.team_id)) {
          const t = teamMap.get(student.team_id)!;
          t.totalPoints += score.totalPoints;
          t.memberCount += 1;
          t.members.push(student.full_name);
        }

        return {
          id: student.id as string,
          full_name: student.full_name as string,
          region_name: (student.regions as { name?: string } | null)?.name ?? "",
          bootcamp_name: (student.bootcamps as { name?: string } | null)?.name ?? "",
          section_label: (student.sections as { label?: string } | null)?.label ?? "",
          total_points: score.totalPoints,
          completed: score.completedChallenges,
        };
      })
      .sort((a, b) => b.total_points - a.total_points);

    const teamRows = Array.from(teamMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      average_points: data.memberCount > 0 ? data.totalPoints / data.memberCount : 0,
      total_points: data.totalPoints,
      member_count: data.memberCount,
      members: data.members.sort()
    })).sort((a, b) => b.average_points - a.average_points);

    return (
      <AdminLeaderboardClient
        rows={rows}
        teamRows={teamRows}
        regionOptions={regionOptions}
        bootcampOptions={bootcampOptions}
        sectionOptions={sectionOptions}
        selectedRegionId={selectedRegionId}
        selectedBootcampId={selectedBootcampId}
        selectedSectionId={selectedSectionId}
        scoringError={scoringError}
      />
    );
  }

  return (
    <AdminLeaderboardClient
      rows={[]}
      teamRows={[]}
      regionOptions={regionOptions}
      bootcampOptions={bootcampOptions}
      sectionOptions={sectionOptions}
      selectedRegionId={selectedRegionId}
      selectedBootcampId={selectedBootcampId}
      selectedSectionId={selectedSectionId}
      scoringError={scoringError}
    />
  );
}
