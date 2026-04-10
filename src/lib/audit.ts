import { adminClient } from "../../utils/supabase/admin";

type AuditPayload = {
  adminId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logAudit({
  adminId,
  action,
  entity,
  entityId,
  note,
  metadata,
}: AuditPayload): Promise<void> {
  try {
    await adminClient.from("audit_logs").insert({
      admin_id: adminId ?? null,
      action,
      entity,
      entity_id: entityId,
      note: note ?? null,
      metadata: metadata ?? null,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
