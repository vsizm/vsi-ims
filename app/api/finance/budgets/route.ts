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
  directorateId: z.string().optional(),
  directorateCode: z.string().trim().min(1).max(32).optional(),
  programmeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  activityId: z.string().uuid().optional(),
  parentBudgetId: z.string().uuid().optional(),
  financialYear: z.coerce.number().int().min(2020).max(2100),
  budgetCode: z.string().trim().min(2).max(64),
  amountZmw: z.coerce.number().positive().max(99999999999999.99),
  notes: z.string().trim().max(4000).optional(),
});

const scopeByLevel = {
  DIRECTORATE: "directorateId",
  PROGRAMME: "programmeId",
  PROJECT: "projectId",
  ACTIVITY: "activityId",
} as const;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function dbErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return "";
  const value = error as { code?: unknown; cause?: { code?: unknown } };
  return String(value.code ?? value.cause?.code ?? "");
}

function dbErrorConstraint(error: unknown) {
  if (typeof error !== "object" || error === null) return "";
  const value = error as { constraint?: unknown; cause?: { constraint?: unknown } };
  return String(value.constraint ?? value.cause?.constraint ?? "");
}

function budgetDbError(error: unknown) {
  const code = dbErrorCode(error);
  const constraint = dbErrorConstraint(error);
  if (code === "23505") {
    if (constraint.includes("directorate_year")) return NextResponse.json({ error: "A Directorate budget already exists for this financial year." }, { status: 409 });
    if (constraint.includes("programme_year")) return NextResponse.json({ error: "A Programme budget already exists for this financial year." }, { status: 409 });
    if (constraint.includes("activity_year")) return NextResponse.json({ error: "An Activity budget already exists for this financial year." }, { status: 409 });
    if (constraint.includes("budget_code")) return NextResponse.json({ error: "Budget code already exists. Enter a unique budget code." }, { status: 409 });
    return NextResponse.json({ error: "A budget with these details already exists." }, { status: 409 });
  }
  if (code === "23514") return NextResponse.json({ error: "The budget does not satisfy the required budget hierarchy." }, { status: 422 });
  if (code === "23503") return NextResponse.json({ error: "A referenced Directorate, Programme, Project or Activity could not be found." }, { status: 422 });
  if (code === "23502") return NextResponse.json({ error: "A required budget field is missing. Please refresh and try again." }, { status: 422 });
  if (code === "22P02") return NextResponse.json({ error: "The budget request contains an invalid UUID. Directorate budgets must be resolved by Directorate code; no Directorate UUID is accepted from the browser." }, { status: 422 });
  if (code === "42703" || code === "42P01") return NextResponse.json({ error: "The finance database is missing a required V1 budget field or table. Apply the latest staging database migrations." }, { status: 500 });
  if (code === "42804") return NextResponse.json({ error: "The finance database schema does not match the current V1 budget model. Apply the latest staging database migrations." }, { status: 500 });
  return apiError(error);
}

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "budgets.read");
  if (denied) return denied;
  try {
    return NextResponse.json(
      await database().select().from(financeBudgets).orderBy(desc(financeBudgets.financialYear), desc(financeBudgets.createdAt)),
    );
  } catch (error) {
    return budgetDbError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "budgets.manage");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  if (!uuidPattern.test(session.userId)) return NextResponse.json({ error: "The authenticated user reference is invalid. Please sign in again." }, { status: 422 });

  const parsed = budgetInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid budget", details: parsed.error.flatten() }, { status: 422 });
  const data = parsed.data;

  if (data.level === "DIRECTORATE" && !data.directorateCode) {
    return NextResponse.json({ error: "A Directorate code is required for Directorate budgets. Please select the Directorate again." }, { status: 422 });
  }
  if (data.level !== "DIRECTORATE" && data.directorateCode) {
    return NextResponse.json({ error: "directorateCode is only valid for Directorate budgets." }, { status: 422 });
  }

  try {
    const db = database();

    // Directorate budgets are deliberately code-first. The browser never supplies
    // the UUID used by finance_budgets.directorate_id. PostgreSQL resolves the
    // authoritative UUID from the active Directorate code inside the INSERT.
    if (data.level === "DIRECTORATE") {
      const code = data.directorateCode!.toUpperCase();

      const [directorate] = await db
        .select({ id: directorates.id })
        .from(directorates)
        .where(and(eq(directorates.code, code), eq(directorates.active, true)))
        .limit(1);

      if (!directorate) {
        return NextResponse.json({ error: `Active Directorate ${code} was not found. Refresh the Directorate list and try again.` }, { status: 404 });
      }

      const [existingYear] = await db
        .select({ id: financeBudgets.id })
        .from(financeBudgets)
        .innerJoin(directorates, eq(financeBudgets.directorateId, directorates.id))
        .where(
          and(
            eq(directorates.code, code),
            eq(directorates.active, true),
            eq(financeBudgets.financialYear, data.financialYear),
            eq(financeBudgets.level, "DIRECTORATE"),
          ),
        )
        .limit(1);

      if (existingYear) {
        return NextResponse.json({ error: "A Directorate budget already exists for this financial year. Use the existing allocation instead of creating a duplicate." }, { status: 409 });
      }

      const [sameCode] = await db
        .select({ id: financeBudgets.id })
        .from(financeBudgets)
        .where(eq(financeBudgets.budgetCode, data.budgetCode))
        .limit(1);

      if (sameCode) return NextResponse.json({ error: "Budget code already exists. Enter a unique budget code." }, { status: 409 });

      const inserted = await db.execute(sql`
        insert into finance_budgets
          (financial_year, budget_code, level, directorate_id, amount_zmw, status, created_by_user_id, notes)
        select
          ${data.financialYear},
          ${data.budgetCode},
          'DIRECTORATE',
          d.id,
          ${String(data.amountZmw)},
          'DRAFT',
          ${session.userId},
          ${data.notes ?? null}
        from directorates d
        where d.code = ${code} and d.active = true
        returning *
      `;

      const created = inserted.rows[0] as Record<string, unknown> | undefined;
      if (!created) return NextResponse.json({ error: `Active Directorate ${code} was not found. Refresh the Directorate list and try again.` }, { status: 404 });

      await recordAuditEvent({
        actorUserId: session.userId,
        action: "FINANCE_BUDGET_CREATED",
        entityType: "finance_budget",
        entityId: String(created.id),
        afterValue: {
          level: created.level,
          financialYear: created.financial_year,
          budgetCode: created.budget_code,
          amountZmw: created.amount_zmw,
          parentBudgetId: created.parent_budget_id,
          createdByUserId: created.created_by_user_id,
          directorateCode: code,
        },
      });

      return NextResponse.json(created, { status: 201 });
    }

    let directorateId: string | undefined;
    if (data.directorateId) {
      if (!uuidPattern.test(data.directorateId)) return NextResponse.json({ error: "Invalid Directorate reference." }, { status: 422 });
      directorateId = data.directorateId;
    }

    const scopeKey = scopeByLevel[data.level];
    const scopeValues = { ...data, directorateId };
    if (!scopeValues[scopeKey]) return NextResponse.json({ error: `${scopeKey} is required for ${data.level} budgets.` }, { status: 422 });
    if (Object.entries(scopeByLevel).some(([level, key]) => level !== data.level && data[key])) return NextResponse.json({ error: "Only the entity matching the budget level may be supplied." }, { status: 422 });
    if (!data.parentBudgetId) return NextResponse.json({ error: "A parent budget is required below Directorate level." }, { status: 422 });

    const [sameCode] = await db.select({ id: financeBudgets.id }).from(financeBudgets).where(eq(financeBudgets.budgetCode, data.budgetCode)).limit(1);
    if (sameCode) return NextResponse.json({ error: "Budget code already exists. Enter a unique budget code." }, { status: 409 });

    let entityDirectorateId: string | null = null;
    let entityProgrammeId: string | null = null;
    let entityProjectId: string | null = null;

    if (data.level === "PROGRAMME") {
      const [entity] = await db.select({ id: programmes.id, directorateId: programmes.directorateId }).from(programmes).where(eq(programmes.id, data.programmeId!)).limit(1);
      if (!entity) return NextResponse.json({ error: "Programme not found." }, { status: 404 });
      if (!entity.directorateId) return NextResponse.json({ error: "Programme must be assigned to a Directorate before it can receive a budget." }, { status: 422 });
      entityDirectorateId = entity.directorateId;
    }
    if (data.level === "PROJECT") {
      const [entity] = await db.select({ id: projects.id, programmeId: projects.programmeId }).from(projects).where(eq(projects.id, data.projectId!)).limit(1);
      if (!entity) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      entityProgrammeId = entity.programmeId;
    }
    if (data.level === "ACTIVITY") {
      const [entity] = await db.select({ id: activities.id, projectId: activities.projectId }).from(activities).where(eq(activities.id, data.activityId!)).limit(1);
      if (!entity) return NextResponse.json({ error: "Activity not found." }, { status: 404 });
      entityProjectId = entity.projectId;
    }

    const [parent] = await db
      .select({ id: financeBudgets.id, level: financeBudgets.level, financialYear: financeBudgets.financialYear, amountZmw: financeBudgets.amountZmw, directorateId: financeBudgets.directorateId, programmeId: financeBudgets.programmeId, projectId: financeBudgets.projectId })
      .from(financeBudgets)
      .where(eq(financeBudgets.id, data.parentBudgetId))
      .limit(1);

    if (!parent) return NextResponse.json({ error: "Parent budget not found." }, { status: 404 });
    const expectedParentLevel = data.level === "PROGRAMME" ? "DIRECTORATE" : data.level === "PROJECT" ? "PROGRAMME" : "PROJECT";
    if (parent.level !== expectedParentLevel || parent.financialYear !== data.financialYear) return NextResponse.json({ error: "Parent budget level and financial year do not match." }, { status: 422 });
    if (data.level === "PROGRAMME" && parent.directorateId !== entityDirectorateId) return NextResponse.json({ error: "Programme budget must use a budget belonging to the programme's Directorate." }, { status: 422 });
    if (data.level === "PROJECT" && parent.programmeId !== entityProgrammeId) return NextResponse.json({ error: "Project budget must use a budget belonging to the project's programme." }, { status: 422 });
    if (data.level === "ACTIVITY" && parent.projectId !== entityProjectId) return NextResponse.json({ error: "Activity budget must use a budget belonging to the activity's project." }, { status: 422 });

    const parentAmount = Number(parent.amountZmw);
    const allocated = await db.execute(sql`select coalesce(sum(amount_zmw), 0) as total from finance_budgets where parent_budget_id = ${data.parentBudgetId} and status <> 'CLOSED'`);
    const alreadyAllocated = Number((allocated.rows[0] as { total?: number | string } | undefined)?.total ?? 0);
    if (alreadyAllocated + data.amountZmw > parentAmount) {
      return NextResponse.json({ error: "Allocation exceeds the available amount in the parent budget.", parentAmount, alreadyAllocated, requestedAmount: data.amountZmw, availableAmount: Math.max(0, parentAmount - alreadyAllocated) }, { status: 422 });
    }

    const { directorateCode: _directorateCode, ...insertData } = scopeValues;
    const values = { ...insertData, amountZmw: String(data.amountZmw), status: "DRAFT" as const, createdByUserId: session.userId };
    const [created] = await db.insert(financeBudgets).values(values).returning();
    if (!created) return NextResponse.json({ error: "Budget could not be created." }, { status: 500 });
    await recordAuditEvent({ actorUserId: session.userId, action: "FINANCE_BUDGET_CREATED", entityType: "finance_budget", entityId: created.id, afterValue: { level: created.level, financialYear: created.financialYear, budgetCode: created.budgetCode, amountZmw: created.amountZmw, parentBudgetId: created.parentBudgetId, createdByUserId: created.createdByUserId } });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return budgetDbError(error);
  }
}
