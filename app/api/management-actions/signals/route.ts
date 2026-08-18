import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { auditEvents, managementActions } from "@/db/schema";

const severities = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const openStatuses = ["OPEN", "IN_PROGRESS"] as const;

type Signal = {
  entityType: string;
  entityId: string;
  source: string;
  sourceKey?: string;
  severity: string;
  finding: string;
  recommendation: string;
  decision?: string;
};

/**
 * Ingests management signals produced by authoritative intelligence modules.
 * The endpoint is deliberately idempotent for active findings: the same
 * source/entity/finding combination is not created twice while an existing
 * finding remains open or in progress.
 */
export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "budgets.manage");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required" }, { status: 401 });

  try {
    const body = await request.json();
    const rawSignals = Array.isArray(body?.signals) ? body.signals : [body];
    if (rawSignals.length === 0 || rawSignals.length > 100) {
      return NextResponse.json({ error: "Provide between 1 and 100 signals" }, { status: 400 });
    }

    const signals: Signal[] = rawSignals.map((raw: Signal) => ({
      entityType: String(raw.entityType ?? "").trim(),
      entityId: String(raw.entityId ?? "").trim(),
      source: String(raw.source ?? "").trim(),
      sourceKey: raw.sourceKey ? String(raw.sourceKey).trim() : undefined,
      severity: String(raw.severity ?? "").trim().toUpperCase(),
      finding: String(raw.finding ?? "").trim(),
      recommendation: String(raw.recommendation ?? "").trim(),
      decision: raw.decision ? String(raw.decision).trim() : undefined,
    }));

    for (const signal of signals) {
      if (!signal.entityType || !signal.entityId || !signal.source || !signal.finding || !signal.recommendation || !severities.has(signal.severity)) {
        return NextResponse.json({ error: "Each signal requires entityType, entityId, source, severity, finding and recommendation" }, { status: 400 });
      }
    }

    const db = database();
    const created: typeof managementActions.$inferSelect[] = [];
    const skipped: string[] = [];

    for (const signal of signals) {
      const active = await db.select().from(managementActions).where(
        and(
          eq(managementActions.entityType, signal.entityType),
          eq(managementActions.entityId, signal.entityId),
          eq(managementActions.source, signal.source),
          eq(managementActions.finding, signal.finding),
          inArray(managementActions.status, [...openStatuses]),
        ),
      ).limit(1);

      if (active.length > 0) {
        skipped.push(active[0].id);
        continue;
      }

      const [row] = await db.insert(managementActions).values({
        entityType: signal.entityType,
        entityId: signal.entityId,
        source: signal.source,
        severity: signal.severity,
        finding: signal.finding,
        recommendation: signal.recommendation,
        decision: signal.decision ?? null,
      }).returning();

      created.push(row);
      await db.insert(auditEvents).values({
        actorUserId: session.userId,
        action: "MANAGEMENT_SIGNAL_INGESTED",
        entityType: "MANAGEMENT_ACTION",
        entityId: row.id,
        afterValue: JSON.stringify({ source: signal.source, sourceKey: signal.sourceKey ?? null, signal }),
      });
    }

    return NextResponse.json({ created, skippedIds: skipped, createdCount: created.length, skippedCount: skipped.length });
  } catch (error) {
    return apiError(error);
  }
}
