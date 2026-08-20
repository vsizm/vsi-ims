import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { auditEvents, directorates, managementActions, programmes, projects } from "@/db/schema";

const severities = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const openStatuses = ["OPEN", "IN_PROGRESS"] as const;

type Signal = { entityType: string; entityId: string; source: string; sourceKey?: string; severity: string; finding: string; recommendation: string; decision?: string };

async function resolveEntityId(db: ReturnType<typeof database>, entityType: string, value: string) {
  if (/^[0-9a-f-]{36}$/i.test(value)) return value;
  if (entityType === "PROJECT") { const [row] = await db.select({ id: projects.id }).from(projects).where(eq(projects.code, value)).limit(1); return row?.id ?? null; }
  if (entityType === "PROGRAMME") { const [row] = await db.select({ id: programmes.id }).from(programmes).where(eq(programmes.code, value)).limit(1); return row?.id ?? null; }
  if (entityType === "DIRECTORATE") { const [row] = await db.select({ id: directorates.id }).from(directorates).where(eq(directorates.code, value)).limit(1); return row?.id ?? null; }
  return null;
}

/** Idempotently converts authoritative finance/delivery signals into traceable management findings. */
export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "budgets.manage");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required" }, { status: 401 });
  try {
    const body = await request.json();
    const rawSignals = Array.isArray(body?.signals) ? body.signals : [body];
    if (rawSignals.length === 0 || rawSignals.length > 100) return NextResponse.json({ error: "Provide between 1 and 100 signals" }, { status: 400 });
    const db = database();
    const signals: Array<Signal & { resolvedEntityId: string }> = [];
    for (const raw of rawSignals as Signal[]) {
      const entityType = String(raw.entityType ?? "").trim().toUpperCase();
      const entityRef = String(raw.entityId ?? "").trim();
      const severity = String(raw.severity ?? "").trim().toUpperCase();
      const signal = { entityType, entityId: entityRef, source: String(raw.source ?? "").trim(), sourceKey: raw.sourceKey ? String(raw.sourceKey).trim() : undefined, severity, finding: String(raw.finding ?? "").trim(), recommendation: String(raw.recommendation ?? "").trim(), decision: raw.decision ? String(raw.decision).trim() : undefined };
      if (!entityType || !entityRef || !signal.source || !signal.finding || !signal.recommendation || !severities.has(severity)) return NextResponse.json({ error: "Each signal requires entityType, entityId/code, source, severity, finding and recommendation" }, { status: 400 });
      const resolvedEntityId = await resolveEntityId(db, entityType, entityRef);
      if (!resolvedEntityId) return NextResponse.json({ error: `Unable to resolve ${entityType} '${entityRef}' to an authoritative entity` }, { status: 400 });
      signals.push({ ...signal, resolvedEntityId });
    }
    const created: typeof managementActions.$inferSelect[] = [];
    const skipped: string[] = [];
    for (const signal of signals) {
      const active = await db.select().from(managementActions).where(and(eq(managementActions.entityType, signal.entityType), eq(managementActions.entityId, signal.resolvedEntityId), eq(managementActions.source, signal.source), eq(managementActions.finding, signal.finding), inArray(managementActions.status, [...openStatuses]))).limit(1);
      if (active.length > 0) { skipped.push(active[0].id); continue; }
      const [row] = await db.insert(managementActions).values({ entityType: signal.entityType, entityId: signal.resolvedEntityId, source: signal.source, severity: signal.severity, finding: signal.finding, recommendation: signal.recommendation, decision: signal.decision ?? null }).returning();
      created.push(row);
      await db.insert(auditEvents).values({ actorUserId: session.userId, action: "MANAGEMENT_SIGNAL_INGESTED", entityType: "MANAGEMENT_ACTION", entityId: row.id, afterValue: JSON.stringify({ source: signal.source, sourceKey: signal.sourceKey ?? null, entityReference: signal.entityId, signal }) });
    }
    return NextResponse.json({ created, skippedIds: skipped, createdCount: created.length, skippedCount: skipped.length });
  } catch (error) { return apiError(error); }
}
