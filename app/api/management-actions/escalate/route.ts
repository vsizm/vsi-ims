import { and, desc, eq, lt, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { auditEvents, managementActions } from "@/db/schema";

const escalation: Record<string, string> = { LOW: "MEDIUM", MEDIUM: "HIGH", HIGH: "CRITICAL", CRITICAL: "CRITICAL" };

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "finance.dashboard.read");
  if (denied) return denied;
  try {
    const db = database();
    const rows = await db.select().from(managementActions)
      .where(and(lt(managementActions.dueDate, todayUtc()), or(eq(managementActions.status, "OPEN"), eq(managementActions.status, "IN_PROGRESS"))))
      .orderBy(desc(managementActions.dueDate), desc(managementActions.createdAt));
    return NextResponse.json({ asOf: todayUtc(), overdue: rows, count: rows.length });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "budgets.manage");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required" }, { status: 401 });
  try {
    const db = database();
    const rows = await db.select().from(managementActions)
      .where(and(lt(managementActions.dueDate, todayUtc()), or(eq(managementActions.status, "OPEN"), eq(managementActions.status, "IN_PROGRESS"))));

    const escalated = [];
    for (const action of rows) {
      const nextSeverity = escalation[action.severity] ?? action.severity;
      if (nextSeverity === action.severity) continue;
      const [updated] = await db.update(managementActions)
        .set({ severity: nextSeverity, updatedAt: new Date() })
        .where(eq(managementActions.id, action.id))
        .returning();
      await db.insert(auditEvents).values({
        actorUserId: session.userId,
        action: "MANAGEMENT_ACTION_ESCALATED",
        entityType: "MANAGEMENT_ACTION",
        entityId: action.id,
        beforeValue: JSON.stringify({ severity: action.severity, dueDate: action.dueDate, status: action.status }),
        afterValue: JSON.stringify({ severity: updated.severity, dueDate: updated.dueDate, status: updated.status, escalatedAt: new Date().toISOString() }),
      });
      escalated.push({ id: action.id, from: action.severity, to: nextSeverity });
    }

    return NextResponse.json({ asOf: todayUtc(), overdueCount: rows.length, escalatedCount: escalated.length, escalated });
  } catch (error) {
    return apiError(error);
  }
}
