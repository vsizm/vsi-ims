import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { auditEvents, managementActions } from "@/db/schema";

const statuses = new Set(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const severities = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "finance.dashboard.read");
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    const entityType = params.get("entityType");
    const entityId = params.get("entityId");
    const status = params.get("status");
    const db = database();
    const filters = [];
    if (entityType) filters.push(eq(managementActions.entityType, entityType));
    if (entityId) filters.push(eq(managementActions.entityId, entityId));
    if (status && statuses.has(status)) filters.push(eq(managementActions.status, status as "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"));
    const rows = filters.length ? await db.select().from(managementActions).where(and(...filters)).orderBy(desc(managementActions.createdAt)) : await db.select().from(managementActions).orderBy(desc(managementActions.createdAt));
    return NextResponse.json({ actions: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "budgets.manage");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required" }, { status: 401 });
  try {
    const body = await request.json();
    const entityType = String(body.entityType ?? "").trim();
    const entityId = String(body.entityId ?? "").trim();
    const source = String(body.source ?? "").trim();
    const severity = String(body.severity ?? "").trim().toUpperCase();
    const finding = String(body.finding ?? "").trim();
    const recommendation = String(body.recommendation ?? "").trim();
    if (!entityType || !entityId || !source || !finding || !recommendation || !severities.has(severity)) return NextResponse.json({ error: "entityType, entityId, source, severity, finding and recommendation are required" }, { status: 400 });
    const db = database();
    const [created] = await db.insert(managementActions).values({ entityType, entityId, source, severity, finding, recommendation, decision: body.decision ? String(body.decision).trim() : null, actionOwnerUserId: body.actionOwnerUserId ? String(body.actionOwnerUserId) : null, dueDate: body.dueDate ? String(body.dueDate) : null }).returning();
    await db.insert(auditEvents).values({ actorUserId: session.userId, action: "MANAGEMENT_ACTION_CREATED", entityType: "MANAGEMENT_ACTION", entityId: created.id, afterValue: JSON.stringify(created) });
    return NextResponse.json({ action: created }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest) {
  const denied = requireServiceAccess(request, "budgets.manage");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required" }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const body = await request.json();
    const db = database();
    const [before] = await db.select().from(managementActions).where(eq(managementActions.id, id));
    if (!before) return NextResponse.json({ error: "Management action not found" }, { status: 404 });
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.decision !== undefined) { updates.decision = body.decision ? String(body.decision).trim() : null; updates.decisionByUserId = session.userId; updates.decisionAt = new Date(); }
    if (body.actionOwnerUserId !== undefined) updates.actionOwnerUserId = body.actionOwnerUserId ? String(body.actionOwnerUserId) : null;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate ? String(body.dueDate) : null;
    if (body.status !== undefined) { const status = String(body.status).toUpperCase(); if (!statuses.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 }); updates.status = status; }
    if (body.resolution !== undefined) updates.resolution = body.resolution ? String(body.resolution).trim() : null;
    const [after] = await db.update(managementActions).set(updates).where(eq(managementActions.id, id)).returning();
    await db.insert(auditEvents).values({ actorUserId: session.userId, action: "MANAGEMENT_ACTION_UPDATED", entityType: "MANAGEMENT_ACTION", entityId: id, beforeValue: JSON.stringify(before), afterValue: JSON.stringify(after) });
    return NextResponse.json({ action: after });
  } catch (error) { return apiError(error); }
}
