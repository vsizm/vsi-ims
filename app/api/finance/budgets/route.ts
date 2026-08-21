import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { activities, directorates, financeBudgets, programmes, projects } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

const budgetInput = z.object({
  level: z.enum(["DIRECTORATE", "PROGRAMME", "PROJECT", "ACTIVITY"]).default("PROJECT"),
  directorateId: z.string().optional(), directorateCode: z.string().trim().min(1).max(32).optional(),
  programmeId: z.string().uuid().optional(), projectId: z.string().uuid().optional(), activityId: z.string().uuid().optional(), parentBudgetId: z.string().uuid().optional(),
  financialYear: z.coerce.number().int().min(2020).max(2100), budgetCode: z.string().trim().min(2).max(64), amountZmw: z.coerce.number().positive().max(99999999999999.99), notes: z.string().trim().max(4000).optional(),
});
const scopeByLevel = { PROGRAMME: "programmeId", PROJECT: "projectId", ACTIVITY: "activityId" } as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function dbCode(error: unknown) { return typeof error === "object" && error !== null ? String((error as { code?: unknown; cause?: { code?: unknown } }).code ?? (error as { cause?: { code?: unknown } }).cause?.code ?? "") : ""; }
function dbConstraint(error: unknown) { return typeof error === "object" && error !== null ? String((error as { constraint?: unknown; cause?: { constraint?: unknown } }).constraint ?? (error as { cause?: { constraint?: unknown } }).cause?.constraint ?? "") : ""; }
function budgetDbError(error: unknown) {
  const code = dbCode(error), constraint = dbConstraint(error);
  if (code === "23505") {
    if (constraint.includes("budget_code")) return NextResponse.json({ error: "Budget code already exists. Enter a unique budget code." }, { status: 409 });
    return NextResponse.json({ error: "A budget with these details already exists." }, { status: 409 });
  }
  if (code === "23514") return NextResponse.json({ error: "The budget does not satisfy the required budget hierarchy." }, { status: 422 });
  if (code === "23503") return NextResponse.json({ error: "A referenced Directorate, Programme, Project or Activity could not be found." }, { status: 422 });
  if (code === "23502") return NextResponse.json({ error: "A required budget field is missing. Please refresh and try again." }, { status: 422 });
  if (code === "22P02") return NextResponse.json({ error: "The budget request contains an invalid UUID. Directorate budgets are resolved by Directorate code and do not accept a browser Directorate UUID." }, { status: 422 });
  if (code === "42703" || code === "42P01") return NextResponse.json({ error: "The finance database is missing a required V1 budget field or table." }, { status: 500 });
  if (code === "42804") return NextResponse.json({ error: "The finance database schema does not match the current V1 budget model." }, { status: 500 });
  return apiError(error);
}

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "budgets.read"); if (denied) return denied;
  try { return NextResponse.json(await database().select().from(financeBudgets).orderBy(desc(financeBudgets.financialYear), desc(financeBudgets.createdAt))); }
  catch (error) { return budgetDbError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "budgets.manage"); if (denied) return denied;
  const session = getRequestSession(request); if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  if (!uuidPattern.test(session.userId)) return NextResponse.json({ error: "The authenticated user reference is invalid. Please sign in again." }, { status: 422 });
  const parsed = budgetInput.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Invalid budget", details: parsed.error.flatten() }, { status: 422 });
  const data = parsed.data;
  if (data.level === "DIRECTORATE" && !data.directorateCode) return NextResponse.json({ error: "A Directorate code is required for Directorate budgets." }, { status: 422 });
  if (data.level !== "DIRECTORATE" && data.directorateCode) return NextResponse.json({ error: "directorateCode is only valid for Directorate budgets." }, { status: 422 });

  try {
    const db = database();

    if (data.level === "DIRECTORATE") {
      const code = data.directorateCode!.toUpperCase();
      const [directorate] = await db.select({ id: directorates.id }).from(directorates).where(and(eq(directorates.code, code), eq(directorates.active, true))).limit(1);
      if (!directorate) return NextResponse.json({ error: `Active Directorate ${code} was not found.` }, { status: 404 });

      const [existing] = await db.select({ id: financeBudgets.id }).from(financeBudgets).innerJoin(directorates, eq(financeBudgets.directorateId, directorates.id)).where(and(eq(directorates.code, code), eq(directorates.active, true), eq(financeBudgets.financialYear, data.financialYear), eq(financeBudgets.level, "DIRECTORATE"))).limit(1);
      if (existing) return NextResponse.json({ error: "A Directorate budget already exists for this financial year. Use the existing allocation instead of creating a duplicate." }, { status: 409 });

      const [sameCode] = await db.select({ id: financeBudgets.id }).from(financeBudgets).where(eq(financeBudgets.budgetCode, data.budgetCode)).limit(1);
      if (sameCode) return NextResponse.json({ error: "Budget code already exists. Enter a unique budget code." }, { status: 409 });

      const inserted = await db.execute(sql`
        insert into finance_budgets (financial_year, budget_code, level, directorate_id, amount_zmw, status, created_by_user_id, notes)
        select ${data.financialYear}, ${data.budgetCode}, 'DIRECTORATE', d.id, ${String(data.amountZmw)}, 'DRAFT', ${session.userId}, ${data.notes ?? null}
        from directorates d where d.code = ${code} and d.active = true returning *
      `);
      const created = inserted.rows[0] as Record<string, unknown> | undefined;
      if (!created) return NextResponse.json({ error: `Active Directorate ${code} was not found.` }, { status: 404 });
      await recordAuditEvent({ actorUserId: session.userId, action: "FINANCE_BUDGET_CREATED", entityType: "finance_budget", entityId: String(created.id), afterValue: { level: created.level, financialYear: created.financial_year, budgetCode: created.budget_code, amountZmw: created.amount_zmw, parentBudgetId: created.parent_budget_id, createdByUserId: created.created_by_user_id, directorateCode: code } });
      return NextResponse.json(created, { status: 201 });
    }

    if (!data.parentBudgetId) return NextResponse.json({ error: "A parent budget is required below Directorate level." }, { status: 422 });
    const scopeKey = scopeByLevel[data.level];
    const entityId = data[scopeKey];
    if (!entityId) return NextResponse.json({ error: `${scopeKey} is required for ${data.level} budgets.` }, { status: 422 });
    if (data.directorateId && !uuidPattern.test(data.directorateId)) return NextResponse.json({ error: "Invalid Directorate reference." }, { status: 422 });
    if (Object.entries({ directorateId: data.directorateId, programmeId: data.programmeId, projectId: data.projectId, activityId: data.activityId }).some(([key, value]) => key !== scopeKey && value)) return NextResponse.json({ error: "Only the entity matching the budget level may be supplied." }, { status: 422 });

    const [sameCode] = await db.select({ id: financeBudgets.id }).from(financeBudgets).where(eq(financeBudgets.budgetCode, data.budgetCode)).limit(1);
    if (sameCode) return NextResponse.json({ error: "Budget code already exists. Enter a unique budget code." }, { status: 409 });

    let entityDirectorateId: string | null = null, entityProgrammeId: string | null = null, entityProjectId: string | null = null;
    if (data.level === "PROGRAMME") {
      const [entity] = await db.select({ directorateId: programmes.directorateId }).from(programmes).where(eq(programmes.id, data.programmeId!)).limit(1);
      if (!entity) return NextResponse.json({ error: "Programme not found." }, { status: 404 });
      if (!entity.directorateId) return NextResponse.json({ error: "Programme must be assigned to a Directorate before it can receive a budget." }, { status: 422 });
      entityDirectorateId = entity.directorateId;
    } else if (data.level === "PROJECT") {
      const [entity] = await db.select({ programmeId: projects.programmeId }).from(projects).where(eq(projects.id, data.projectId!)).limit(1);
      if (!entity) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      entityProgrammeId = entity.programmeId;
    } else {
      const [entity] = await db.select({ projectId: activities.projectId }).from(activities).where(eq(activities.id, data.activityId!)).limit(1);
      if (!entity) return NextResponse.json({ error: "Activity not found." }, { status: 404 });
      entityProjectId = entity.projectId;
    }

    const [parent] = await db.select({ level: financeBudgets.level, financialYear: financeBudgets.financialYear, amountZmw: financeBudgets.amountZmw, directorateId: financeBudgets.directorateId, programmeId: financeBudgets.programmeId, projectId: financeBudgets.projectId }).from(financeBudgets).where(eq(financeBudgets.id, data.parentBudgetId)).limit(1);
    if (!parent) return NextResponse.json({ error: "Parent budget not found." }, { status: 404 });
    const expected = data.level === "PROGRAMME" ? "DIRECTORATE" : data.level === "PROJECT" ? "PROGRAMME" : "PROJECT";
    if (parent.level !== expected || parent.financialYear !== data.financialYear) return NextResponse.json({ error: "Parent budget level and financial year do not match." }, { status: 422 });
    if (data.level === "PROGRAMME" && parent.directorateId !== entityDirectorateId) return NextResponse.json({ error: "Programme budget must use a budget belonging to the programme's Directorate." }, { status: 422 });
    if (data.level === "PROJECT" && parent.programmeId !== entityProgrammeId) return NextResponse.json({ error: "Project budget must use a budget belonging to the project's programme." }, { status: 422 });
    if (data.level === "ACTIVITY" && parent.projectId !== entityProjectId) return NextResponse.json({ error: "Activity budget must use a budget belonging to the activity's project." }, { status: 422 });
    const allocated = await db.execute(sql`select coalesce(sum(amount_zmw), 0) as total from finance_budgets where parent_budget_id = ${data.parentBudgetId} and status <> 'CLOSED'`);
    const alreadyAllocated = Number((allocated.rows[0] as { total?: number | string } | undefined)?.total ?? 0), parentAmount = Number(parent.amountZmw);
    if (alreadyAllocated + data.amountZmw > parentAmount) return NextResponse.json({ error: "Allocation exceeds the available amount in the parent budget.", parentAmount, alreadyAllocated, requestedAmount: data.amountZmw, availableAmount: Math.max(0, parentAmount - alreadyAllocated) }, { status: 422 });

    const values = { financialYear: data.financialYear, budgetCode: data.budgetCode, level: data.level, programmeId: data.programmeId, projectId: data.projectId, activityId: data.activityId, parentBudgetId: data.parentBudgetId, amountZmw: String(data.amountZmw), status: "DRAFT" as const, createdByUserId: session.userId, notes: data.notes };
    const [created] = await db.insert(financeBudgets).values(values).returning();
    if (!created) return NextResponse.json({ error: "Budget could not be created." }, { status: 500 });
    await recordAuditEvent({ actorUserId: session.userId, action: "FINANCE_BUDGET_CREATED", entityType: "finance_budget", entityId: created.id, afterValue: { level: created.level, financialYear: created.financialYear, budgetCode: created.budgetCode, amountZmw: created.amountZmw, parentBudgetId: created.parentBudgetId, createdByUserId: created.createdByUserId } });
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return budgetDbError(error); }
}
