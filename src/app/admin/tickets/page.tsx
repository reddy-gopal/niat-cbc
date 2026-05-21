import TicketsTable from "@/components/admin/TicketsTable";
import { TICKET_CATEGORIES, TICKET_STATUSES } from "@/lib/help-tickets";
import { adminClient } from "../../../../utils/supabase/admin";

type Props = {
  searchParams: Promise<{
    status?: string;
    category?: string;
    q?: string;
    page?: string;
  }>;
};

type TicketRow = {
  id: string;
  student_id: string;
  title: string;
  description: string;
  category: string;
  image_path: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export default async function AdminTicketsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * 20;
  const to = from + 19;
  const searchQuery = params.q?.trim() ?? "";
  const escapedSearch = searchQuery.replace(/[%,'"]/g, "").trim();

  const statusFilter =
    params.status && TICKET_STATUSES.includes(params.status as (typeof TICKET_STATUSES)[number])
      ? params.status
      : undefined;

  const categoryFilter = TICKET_CATEGORIES.some((c) => c.value === params.category)
    ? params.category
    : undefined;

  let query = adminClient
    .from("help_tickets")
    .select(
      "id, student_id, title, description, category, image_path, status, admin_note, created_at, updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (categoryFilter) {
    query = query.eq("category", categoryFilter);
  }

  if (escapedSearch) {
    const { data: matchedStudents } = await adminClient
      .from("students")
      .select("id")
      .or(`full_name.ilike.%${escapedSearch}%,mobile.ilike.%${escapedSearch}%`)
      .limit(500);

    const studentIds = (matchedStudents ?? []).map((s) => s.id as string);
    const orParts = [
      `title.ilike.%${escapedSearch}%`,
      `description.ilike.%${escapedSearch}%`,
    ];
    if (studentIds.length > 0) {
      orParts.push(`student_id.in.(${studentIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  const { data, count, error } = await query.range(from, to);

  const tickets = (data ?? []) as TicketRow[];
  const studentIds = Array.from(new Set(tickets.map((t) => t.student_id)));

  const { data: studentsData, error: studentsError } = studentIds.length
    ? await adminClient
        .from("students")
        .select("id, full_name, mobile")
        .in("id", studentIds)
    : { data: [], error: null };

  if (studentsError) {
    console.error("[admin/tickets] failed to load students", studentsError);
  }

  const studentMap = new Map(
    (studentsData ?? []).map((s) => [
      s.id as string,
      { id: s.id as string, full_name: s.full_name as string, mobile: s.mobile as string },
    ])
  );

  const rows = tickets.map((ticket) => ({
    ...ticket,
    student: studentMap.get(ticket.student_id) ?? null,
  }));

  const loadError = error
    ? "Unable to load tickets. Make sure the help_tickets table exists (run the migration)."
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Help Tickets</h1>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Student support requests — update status and add notes for the student.
      </p>
      {loadError ? (
        <div className="card p-4 mb-4 border-red-200 bg-red-50 text-red-800 text-sm">{loadError}</div>
      ) : null}
      <TicketsTable
        rows={rows}
        total={count ?? 0}
        page={page}
        filters={{
          status: statusFilter ?? "",
          category: categoryFilter ?? "",
          q: searchQuery,
        }}
      />
    </div>
  );
}
