import { adminClient } from "../../../../utils/supabase/admin";
import VideoStatsClient from "@/components/admin/VideoStatsClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    regionId?: string;
    bootcampId?: string;
    sectionId?: string;
  }>;
};

export default async function VideoStatsPage({ searchParams }: Props) {
  const params = await searchParams;

  // 1. Fetch Regions & Bootcamps for selectors (same as leaderboard)
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

  // 2. Fetch students and events for selected section
  let studentRows: Array<{
    id: string;
    full_name: string;
    visits: number;
    previews: number;
    photo_uploads: number;
    downloads: number;
    shares: number;
  }> = [];

  let recentEvents: Array<{
    studentName: string;
    eventType: string;
    createdAt: string;
  }> = [];

  const counts = { visit: 0, preview: 0, photo_upload: 0, download: 0, share: 0 };
  const exportRows: Array<{ student: string; bootcamp: string; event: string; time: string }> = [];

  if (selectedRegionId && selectedBootcampId && selectedSectionId) {
    const { data: students } = await adminClient
      .from("students")
      .select("id, full_name")
      .eq("region_id", selectedRegionId)
      .eq("bootcamp_id", selectedBootcampId)
      .eq("section_id", selectedSectionId);

    const studentIds = (students ?? []).map((s) => s.id as string);

    if (studentIds.length > 0) {
      // Query all video events for these students
      const { data: events } = await adminClient
        .from("video_events")
        .select(`
          event_type,
          student_id,
          created_at,
          students!inner(full_name)
        `)
        .in("student_id", studentIds)
        .order("created_at", { ascending: false });

      const studentMap = new Map(
        (students ?? []).map((s) => [
          s.id,
          {
            id: s.id,
            full_name: s.full_name,
            visits: 0,
            previews: 0,
            photo_uploads: 0,
            downloads: 0,
            shares: 0,
          },
        ])
      );

      for (const ev of events ?? []) {
        const type = ev.event_type as string;
        if (type in counts) counts[type as keyof typeof counts]++;

        const sRow = studentMap.get(ev.student_id);
        if (sRow) {
          if (type === "visit")        sRow.visits++;
          if (type === "preview")      sRow.previews++;
          if (type === "photo_upload") sRow.photo_uploads++;
          if (type === "download")     sRow.downloads++;
          if (type === "share")        sRow.shares++;
        }

        const studentData = ev.students as { full_name?: string } | null;
        exportRows.push({
          student: studentData?.full_name ?? "",
          bootcamp: selectedBootcamp?.name ?? "",
          event: type,
          time: ev.created_at as string,
        });
      }

      studentRows = Array.from(studentMap.values()).sort((a, b) => b.downloads - a.downloads);
      recentEvents = (events ?? []).slice(0, 50).map((ev) => {
        const studentData = ev.students as { full_name?: string } | null;
        return {
          studentName: studentData?.full_name ?? "—",
          eventType: ev.event_type as string,
          createdAt: ev.created_at as string,
        };
      });
    }
  }

  const statCards = [
    { label: "USERS VISITED",    value: counts.visit,        sub: "unique actions" },
    { label: "PREVIEWED REEL",   value: counts.preview,      sub: "unique actions" },
    { label: "PHOTO UPLOADS",    value: counts.photo_upload, sub: "unique actions" },
    { label: "DOWNLOADED",       value: counts.download,     sub: "unique actions" },
    { label: "SHARED",           value: counts.share,        sub: "unique actions" },
  ];

  return (
    <VideoStatsClient
      studentRows={studentRows}
      recentEvents={recentEvents}
      statCards={statCards}
      regionOptions={regionOptions}
      bootcampOptions={bootcampOptions}
      sectionOptions={sectionOptions}
      selectedRegionId={selectedRegionId}
      selectedBootcampId={selectedBootcampId}
      selectedSectionId={selectedSectionId}
      exportRows={exportRows}
    />
  );
}
