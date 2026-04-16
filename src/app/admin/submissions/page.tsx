import Link from "next/link";
import SubmissionsTable from "@/components/admin/SubmissionsTable";
import { adminClient } from "../../../../utils/supabase/admin";

type Props = {
  searchParams: Promise<{
    regionId?: string;
    bootcampId?: string;
    sectionId?: string;
    q?: string;
    status?: string;
    taskId?: string;
    page?: string;
  }>;
};

export default async function AdminSubmissionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const from = (page - 1) * 20;
  const to = from + 19;
  const searchQuery = params.q?.trim() ?? "";
  const escapedSearchQuery = searchQuery.replace(/[%,'"]/g, "").trim();
  type RegionOption = {
    id: string;
    name: string;
    bootcamps: Array<{
      id: string;
      name: string;
      sections: Array<{ id: string; label: string }>;
    }>;
  };

  const [{ data: regionsData, error: regionsError }, { data: bootcampsData, error: bootcampsError }] =
    await Promise.all([
      adminClient.from("regions").select("id,name").order("name", { ascending: true }),
      adminClient
        .from("bootcamps")
        .select("id,name,region_id,sections(id,label)")
        .order("name", { ascending: true }),
    ]);

  if (regionsError || bootcampsError) {
    console.error("[admin/submissions] failed to load filter options", {
      regionsError,
      bootcampsError,
    });
  }

  const regionOptions: RegionOption[] = (regionsData ?? []).map((region) => ({
    id: region.id as string,
    name: region.name as string,
    bootcamps: ((bootcampsData ?? []) as Array<{
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
    regionOptions.find((region) => region.id === params.regionId) ?? null;
  const bootcampOptions = selectedRegion?.bootcamps ?? [];
  const selectedBootcamp =
    bootcampOptions.find((bootcamp) => bootcamp.id === params.bootcampId) ?? null;
  const sectionOptions = selectedBootcamp?.sections ?? [];
  const selectedSection =
    sectionOptions.find((section) => section.id === params.sectionId) ?? null;

  const selectedRegionId = selectedRegion?.id ?? "";
  const selectedBootcampId = selectedBootcamp?.id ?? "";
  const selectedSectionId = selectedSection?.id ?? "";

  let filteredStudentIds: string[] | null = null;
  if (params.regionId || params.bootcampId || params.sectionId || escapedSearchQuery) {
    let studentFilterQuery = adminClient
      .from("students")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (params.regionId) {
      studentFilterQuery = studentFilterQuery.eq("region_id", params.regionId);
    }
    if (params.bootcampId) {
      studentFilterQuery = studentFilterQuery.eq("bootcamp_id", params.bootcampId);
    }
    if (params.sectionId) {
      studentFilterQuery = studentFilterQuery.eq("section_id", params.sectionId);
    }
    if (escapedSearchQuery) {
      studentFilterQuery = studentFilterQuery.or(
        `full_name.ilike.%${escapedSearchQuery}%,mobile.ilike.%${escapedSearchQuery}%`
      );
    }

    const { data: matchedStudents, error: studentFilterError } =
      await studentFilterQuery;

    if (studentFilterError) {
      console.error("[admin/submissions] failed to resolve filtered students", {
        error: studentFilterError,
        filters: params,
      });
    }

    filteredStudentIds = (matchedStudents ?? []).map((row) => row.id);
  }

  type AttemptRow = {
    id: string;
    submission_id: string;
    student_id: string;
    task_id: number;
    file_url: string | null;
    status: string;
    ai_reason: string | null;
    attempt_number: number;
    created_at: string;
  };

  let attemptsData: AttemptRow[] = [];
  let totalCount = 0;

  let attemptsQuery = adminClient
    .from("submission_attempts")
    .select(
      "id,submission_id,student_id,bootcamp_id,task_id,attempt_number,file_url,status,ai_reason,created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.bootcampId) {
    attemptsQuery = attemptsQuery.eq("bootcamp_id", params.bootcampId);
  }
  if (filteredStudentIds) {
    if (filteredStudentIds.length === 0) {
      attemptsQuery = attemptsQuery.in("student_id", [
        "00000000-0000-0000-0000-000000000000",
      ]);
    } else {
      attemptsQuery = attemptsQuery.in("student_id", filteredStudentIds);
    }
  }
  if (params.status) attemptsQuery = attemptsQuery.eq("status", params.status);
  if (params.taskId) attemptsQuery = attemptsQuery.eq("task_id", Number(params.taskId));

  const { data, count, error } = await attemptsQuery;
  if (error) {
    console.error("[admin/submissions] failed to list submissions", {
      error,
      filters: params,
    });
  }
  attemptsData = (data ?? []) as AttemptRow[];
  totalCount = count ?? 0;

  const attemptRows = attemptsData;
  const studentIds = Array.from(new Set(attemptRows.map((row) => row.student_id)));

  const { data: studentsData, error: studentsError } = studentIds.length
    ? await adminClient
        .from("students")
        .select("id, full_name, sections:section_id(label)")
        .in("id", studentIds)
    : { data: [], error: null };

  if (studentsError) {
    console.error("[admin/submissions] failed to load student details", {
      error: studentsError,
      studentIdsCount: studentIds.length,
    });
  }

  type StudentRow = {
    id: string;
    full_name: string;
    sections:
      | { label?: string }
      | Array<{
          label?: string;
        }>
      | null;
  };

  const studentMap = new Map<string, { full_name: string; section_label: string | null }>();
  for (const student of (studentsData ?? []) as StudentRow[]) {
    const sectionRelation = Array.isArray(student.sections)
      ? student.sections[0] ?? null
      : student.sections;
    studentMap.set(student.id, {
      full_name: student.full_name,
      section_label: sectionRelation?.label ?? null,
    });
  }

  const normalizedRows = attemptRows.map((row) => {
    const student = studentMap.get(row.student_id);

    return {
      id: row.id,
      submission_id: row.submission_id,
      status: row.status,
      task_id: row.task_id,
      file_url: row.file_url,
      ai_reason: row.ai_reason,
      resubmit_count: row.attempt_number,
      created_at: row.created_at,
      students: student?.full_name ? { full_name: student.full_name } : null,
      sections: student?.section_label ? { label: student.section_label } : null,
    };
  });

  const submissionRows = normalizedRows.map((row) => ({
    id: row.id,
    file_url: row.file_url,
  }));

  const filePaths = submissionRows
    .map((row) => row.file_url)
    .filter((fileUrl): fileUrl is string => Boolean(fileUrl));
  const uniquePaths = Array.from(new Set(filePaths));

  const signedMap: Record<string, string> = {};
  if (uniquePaths.length > 0) {
    const { data: signedUrls } = await adminClient.storage
      .from("submissions")
      .createSignedUrls(uniquePaths, 60);

    for (const item of signedUrls ?? []) {
      if (!item.path || !item.signedUrl) continue;
      signedMap[item.path] = item.signedUrl;
    }
  }
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Submissions</h1>
        <Link href="/admin/submissions/challenge5" className="btn-outline">
          Challenge 5 - Connect Their Dots Manual Awards
        </Link>
      </div>
      <form
        method="GET"
        action="/admin/submissions"
        className="card p-4 mb-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3"
      >
        <input type="hidden" name="page" value="1" />
        {params.status ? (
          <input type="hidden" name="status" value={params.status} />
        ) : null}
        {params.taskId ? (
          <input type="hidden" name="taskId" value={params.taskId} />
        ) : null}

        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1 font-bold">
            Region
          </label>
          <select
            suppressHydrationWarning
            name="regionId"
            defaultValue={selectedRegionId}
            className="input-field"
          >
            <option value="">Select region</option>
            {regionOptions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1 font-bold">
            Bootcamp
          </label>
          <select
            suppressHydrationWarning
            name="bootcampId"
            defaultValue={selectedBootcampId}
            className="input-field"
          >
            <option value="">Select bootcamp</option>
            {bootcampOptions.map((bootcamp) => (
              <option key={bootcamp.id} value={bootcamp.id}>
                {bootcamp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1 font-bold">
            Section
          </label>
          <select
            suppressHydrationWarning
            name="sectionId"
            defaultValue={selectedSectionId}
            className="input-field"
          >
            <option value="">Select section</option>
            {sectionOptions.map((section) => (
              <option key={section.id} value={section.id}>
                Section {section.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1 font-bold">
            Search student (name or mobile)
          </label>
          <input
            suppressHydrationWarning
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="e.g. Riya or 9876543210"
            className="input-field"
          />
        </div>

        <div className="flex gap-2 items-end">
          <button suppressHydrationWarning type="submit" className="btn-primary">
            Apply
          </button>
          <Link href="/admin/submissions" className="btn-outline">
            Reset
          </Link>
        </div>
      </form>
      <SubmissionsTable
        rows={normalizedRows}
        signedImageMap={signedMap}
      />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <Link
            key={p}
            href={`/admin/submissions?${new URLSearchParams({
              ...(params.regionId ? { regionId: params.regionId } : {}),
              ...(params.bootcampId ? { bootcampId: params.bootcampId } : {}),
              ...(params.sectionId ? { sectionId: params.sectionId } : {}),
              ...(searchQuery ? { q: searchQuery } : {}),
              ...(params.status ? { status: params.status } : {}),
              ...(params.taskId ? { taskId: params.taskId } : {}),
              page: String(p),
            }).toString()}`}
            className={`btn-outline ${p === page ? "!border-[var(--primary)]" : ""}`}
          >
            {p}
          </Link>
        ))}
      </div>
    </div>
  );
}
