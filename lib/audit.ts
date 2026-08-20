import { auditEvents } from "@/db/schema";
import { database } from "@/lib/db";

export async function recordAuditEvent(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue?: unknown;
  afterValue?: unknown;
}) {
  await database().insert(auditEvents).values({
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeValue: input.beforeValue == null ? null : JSON.stringify(input.beforeValue),
    afterValue: input.afterValue == null ? null : JSON.stringify(input.afterValue),
  });
}
