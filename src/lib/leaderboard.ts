import type { LeaderboardEntry } from "@/types/app";
import type { StudentChallengeStatus } from "@/types/database";

type RelatedName = { name: string } | { name: string }[] | null | undefined;
type RelatedLabel = { label: string } | { label: string }[] | null | undefined;

export type StudentRow = {
  id: string;
  full_name: string;
  total_points: number | null;
  created_at?: string | null;
  sections?: RelatedLabel;
  bootcamps?: RelatedName;
  regions?: RelatedName;
};

function resolveRelatedName(relation: RelatedName): string | undefined {
  if (!relation) return undefined;
  if (Array.isArray(relation)) return relation[0]?.name;
  return relation.name;
}

function resolveSectionLabel(sections: RelatedLabel): string | undefined {
  if (!sections) return undefined;
  if (Array.isArray(sections)) return sections[0]?.label;
  return sections.label;
}

function mapStudentRow(
  row: StudentRow,
  completedChallengesMap: Map<string, number>
): LeaderboardEntry {
  return {
    rank: 0,
    studentId: row.id,
    fullName: row.full_name,
    totalPoints: Number(row.total_points ?? 0),
    completedChallenges: completedChallengesMap.get(row.id) ?? 0,
    sectionLabel: resolveSectionLabel(row.sections),
    bootcampName: resolveRelatedName(row.bootcamps),
    regionName: resolveRelatedName(row.regions),
    createdAt: row.created_at ?? undefined,
  };
}

export function buildCompletedChallengesMap(
  statuses: StudentChallengeStatus[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const status of statuses) {
    if (!status.is_completed) continue;
    map.set(status.student_id, (map.get(status.student_id) ?? 0) + 1);
  }
  return map;
}

/** Section / bootcamp-scoped leaderboard — points first, then earlier join on ties. */
export function buildIndividualLeaderboard(
  students: StudentRow[],
  completedChallengesMap: Map<string, number>
): LeaderboardEntry[] {
  return students
    .map((row) => mapStudentRow(row, completedChallengesMap))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return (
        new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
      );
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/** Global overall leaderboard — sorted by total points only. */
export function buildOverallLeaderboard(students: StudentRow[]): LeaderboardEntry[] {
  return students
    .map((row) => mapStudentRow(row, new Map()))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function formatLeaderboardPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

export function mapStudentRowToLeaderboardEntry(
  row: StudentRow,
  rank: number,
  completedChallengesMap: Map<string, number> = new Map()
): LeaderboardEntry {
  return { ...mapStudentRow(row, completedChallengesMap), rank };
}
