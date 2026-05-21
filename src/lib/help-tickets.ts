export const TICKET_CATEGORIES = [
  { value: "technical", label: "Technical issue" },
  { value: "account", label: "Account & login" },
  { value: "submission", label: "Submission / proof" },
  { value: "challenge", label: "Challenge / points" },
  { value: "other", label: "Other" },
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]["value"];

export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function ticketStatusBadgeClass(status: TicketStatus): string {
  switch (status) {
    case "open":
      return "bg-amber-100 text-amber-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "resolved":
      return "bg-emerald-100 text-emerald-800";
    case "closed":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function ticketCategoryLabel(category: string): string {
  return TICKET_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}
