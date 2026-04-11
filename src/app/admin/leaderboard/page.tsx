import AdminLeaderboardClient from "@/components/admin/AdminLeaderboardClient";
import { adminClient } from "../../../../utils/supabase/admin";

type Props = {
  searchParams: Promise<{
    bootcampId?: string;
    sectionId?: string;
  }>;
};

export default async function AdminLeaderboardPage({ searchParams }: Props) {
  const params = await searchParams;

  const { data: bootcamps } = await adminClient
    .from("bootcamps")
    .select("id,name,date,sections(id,label)")
    .order("date", { ascending: false });

  const bootcampOptions = (bootcamps ?? []).map((bootcamp) => ({
    id: bootcamp.id as string,
    name: bootcamp.name as string,
    sections: ((bootcamp.sections as { id: string; label: string }[] | null) ?? []).map(
      (section) => ({
        id: section.id,
        label: section.label,
      })
    ),
  }));

  const selectedBootcamp =
    bootcampOptions.find((bootcamp) => bootcamp.id === params.bootcampId) ??
    bootcampOptions[0];

  const sectionOptions = selectedBootcamp?.sections ?? [];
  const selectedSection =
    sectionOptions.find((section) => section.id === params.sectionId) ??
    sectionOptions[0];

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

  if (selectedBootcampId && selectedSectionId) {
    const { data: students } = await adminClient
      .from("students")
      .select(
        "id, full_name, regions(name), bootcamps(name), sections(label), submissions(points, status)"
      )
      .eq("bootcamp_id", selectedBootcampId)
      .eq("section_id", selectedSectionId);

    rows = (students ?? [])
      .map((student) => {
        const submissions = (student.submissions ?? []) as Array<{
          points: number;
          status: string;
        }>;
        return {
          id: student.id as string,
          full_name: student.full_name as string,
          region_name: (student.regions as { name?: string } | null)?.name ?? "",
          bootcamp_name: (student.bootcamps as { name?: string } | null)?.name ?? "",
          section_label: (student.sections as { label?: string } | null)?.label ?? "",
          total_points: submissions.reduce((sum, s) => sum + (s.points ?? 0), 0),
          completed: submissions.filter((s) => s.status === "accepted").length,
        };
      })
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 100);
  }

  return (
    <AdminLeaderboardClient
      rows={rows}
      bootcampOptions={bootcampOptions}
      sectionOptions={sectionOptions}
      selectedBootcampId={selectedBootcampId}
      selectedSectionId={selectedSectionId}
    />
  );
}
