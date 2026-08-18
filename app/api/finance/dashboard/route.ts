import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { directorates, financeBudgets, financeExpenses, programmes, projects } from "@/db/schema";

const toNumber = (value: unknown) => Number(value ?? 0);

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "finance.dashboard.read");
  if (denied) return denied;

  try {
    const db = database();
    const requestedYear = Number(new URL(request.url).searchParams.get("year"));
    const financialYear = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
      ? requestedYear
      : new Date().getUTCFullYear();

    const [budgetRows, expenseRows, projectRows, categoryRows] = await Promise.all([
      db.select({
        id: financeBudgets.id,
        level: financeBudgets.level,
        amount: financeBudgets.amountZmw,
        status: financeBudgets.status,
        directorateId: financeBudgets.directorateId,
        programmeId: financeBudgets.programmeId,
        projectId: financeBudgets.projectId,
        activityId: financeBudgets.activityId,
        directorateCode: directorates.code,
        directorateName: directorates.name,
        programmeCode: programmes.code,
        programmeName: programmes.name,
        projectCode: projects.code,
        projectName: projects.name,
      })
        .from(financeBudgets)
        .leftJoin(directorates, eq(financeBudgets.directorateId, directorates.id))
        .leftJoin(programmes, eq(financeBudgets.programmeId, programmes.id))
        .leftJoin(projects, eq(financeBudgets.projectId, projects.id))
        .where(sql`${financeBudgets.financialYear} = ${financialYear}`),
      db.select({
        budgetId: financeExpenses.budgetId,
        committed: sql<string>`coalesce(sum(case when ${financeExpenses.status} = 'APPROVED' then ${financeExpenses.amountZmw} else 0 end), 0)`,
        paid: sql<string>`coalesce(sum(case when ${financeExpenses.status} = 'PAID' then ${financeExpenses.amountZmw} else 0 end), 0)`,
      })
        .from(financeExpenses)
        .groupBy(financeExpenses.budgetId),
      db.select({
        projectId: projects.id,
        projectCode: projects.code,
        projectName: projects.name,
        programmeCode: programmes.code,
        programmeName: programmes.name,
        directorateCode: directorates.code,
        directorateName: directorates.name,
      })
        .from(projects)
        .leftJoin(programmes, eq(projects.programmeId, programmes.id))
        .leftJoin(directorates, eq(programmes.directorateId, directorates.id))
        .orderBy(projects.code),
      db.select({
        category: financeExpenses.category,
        spent: sql<string>`coalesce(sum(case when ${financeExpenses.status} = 'PAID' then ${financeExpenses.amountZmw} else 0 end), 0)`,
      })
        .from(financeExpenses)
        .innerJoin(financeBudgets, eq(financeExpenses.budgetId, financeBudgets.id))
        .where(sql`${financeBudgets.financialYear} = ${financialYear}`)
        .groupBy(financeExpenses.category)
        .orderBy(sql`sum(case when ${financeExpenses.status} = 'PAID' then ${financeExpenses.amount_zmw} else 0 end) desc`),
    ]);

    const expenseByBudget = new Map(expenseRows.map((row) => [row.budgetId, { committed: toNumber(row.committed), paid: toNumber(row.paid) }]));
    const approved = budgetRows.filter((row) => row.status === "APPROVED");

    const directorateMap = new Map<string, {
      code: string;
      name: string;
      budgetZmw: number;
      programmeAllocationZmw: number;
      committedZmw: number;
      spentZmw: number;
    }>();
    const programmeMap = new Map<string, {
      code: string;
      name: string;
      directorateCode: string | null;
      budgetZmw: number;
      projectAllocationZmw: number;
      committedZmw: number;
      spentZmw: number;
    }>();
    const projectMap = new Map<string, {
      code: string;
      name: string;
      programmeCode: string | null;
      directorateCode: string | null;
      budgetZmw: number;
      activityAllocationZmw: number;
      committedZmw: number;
      spentZmw: number;
    }>();
    const activityRows: Array<{ activityId: string | null; budgetZmw: number; committedZmw: number; spentZmw: number; projectCode: string | null }> = [];

    for (const row of approved) {
      const amount = toNumber(row.amount);
      const expense = expenseByBudget.get(row.id) ?? { committed: 0, paid: 0 };
      const projectCode = row.projectCode ?? null;

      if (row.level === "DIRECTORATE" && row.directorateId && row.directorateCode) {
        const current = directorateMap.get(row.directorateId) ?? { code: row.directorateCode, name: row.directorateName ?? row.directorateCode, budgetZmw: 0, programmeAllocationZmw: 0, committedZmw: 0, spentZmw: 0 };
        current.budgetZmw += amount;
        current.committedZmw += expense.committed;
        current.spentZmw += expense.paid;
        directorateMap.set(row.directorateId, current);
      }
      if (row.level === "PROGRAMME" && row.programmeId && row.programmeCode) {
        const current = programmeMap.get(row.programmeId) ?? { code: row.programmeCode, name: row.programmeName ?? row.programmeCode, directorateCode: null, budgetZmw: 0, projectAllocationZmw: 0, committedZmw: 0, spentZmw: 0 };
        current.budgetZmw += amount;
        current.committedZmw += expense.committed;
        current.spentZmw += expense.paid;
        current.directorateCode = row.directorateCode ?? null;
        programmeMap.set(row.programmeId, current);
      }
      if (row.level === "PROJECT" && row.projectId && row.projectCode) {
        const current = projectMap.get(row.projectId) ?? { code: row.projectCode, name: row.projectName ?? row.projectCode, programmeCode: row.programmeCode ?? null, directorateCode: row.directorateCode ?? null, budgetZmw: 0, activityAllocationZmw: 0, committedZmw: 0, spentZmw: 0 };
        current.budgetZmw += amount;
        current.committedZmw += expense.committed;
        current.spentZmw += expense.paid;
        projectMap.set(row.projectId, current);
      }
      if (row.level === "ACTIVITY") {
        activityRows.push({ activityId: row.activityId, budgetZmw: amount, committedZmw: expense.committed, spentZmw: expense.paid, projectCode });
      }
    }

    const programmeAllocations = approved.filter((row) => row.level === "PROGRAMME").reduce((sum, row) => sum + toNumber(row.amount), 0);
    const projectAllocations = approved.filter((row) => row.level === "PROJECT").reduce((sum, row) => sum + toNumber(row.amount), 0);
    const activityAllocations = approved.filter((row) => row.level === "ACTIVITY").reduce((sum, row) => sum + toNumber(row.amount), 0);
    const directorateBudget = [...directorateMap.values()].reduce((sum, row) => sum + row.budgetZmw, 0);
    const committed = approved.reduce((sum, row) => sum + (expenseByBudget.get(row.id)?.committed ?? 0), 0);
    const spent = approved.reduce((sum, row) => sum + (expenseByBudget.get(row.id)?.paid ?? 0), 0);

    const utilisationPercent = directorateBudget === 0 ? 0 : Number(((spent / directorateBudget) * 100).toFixed(2));
    const committedPercent = directorateBudget === 0 ? 0 : Number(((committed / directorateBudget) * 100).toFixed(2));

    return NextResponse.json({
      currency: "ZMW",
      financialYear,
      budgetApprovedZmw: directorateBudget,
      expenditureZmw: spent,
      committedZmw: committed,
      remainingZmw: directorateBudget - spent,
      uncommittedZmw: directorateBudget - committed,
      utilisationPercent,
      committedPercent,
      allocationSummary: {
        directorateBudgetZmw: directorateBudget,
        programmeAllocationZmw: programmeAllocations,
        projectAllocationZmw: projectAllocations,
        activityAllocationZmw: activityAllocations,
      },
      directorates: [...directorateMap.values()].map((row) => ({ ...row, remainingZmw: row.budgetZmw - row.spentZmw, utilisationPercent: row.budgetZmw === 0 ? 0 : Number(((row.spentZmw / row.budgetZmw) * 100).toFixed(2)) })),
      programmes: [...programmeMap.values()].map((row) => ({ ...row, remainingZmw: row.budgetZmw - row.spentZmw, utilisationPercent: row.budgetZmw === 0 ? 0 : Number(((row.spentZmw / row.budgetZmw) * 100).toFixed(2)) })),
      projects: projectRows.map((row) => {
        const finance = row.projectId ? projectMap.get(row.projectId) : undefined;
        const budgetZmw = finance?.budgetZmw ?? 0;
        const spentZmw = finance?.spentZmw ?? 0;
        const committedZmw = finance?.committedZmw ?? 0;
        return { projectCode: row.projectCode, projectName: row.projectName, programmeCode: row.programmeCode, programmeName: row.programmeName, directorateCode: row.directorateCode, directorateName: row.directorateName, budgetZmw, committedZmw, spentZmw, remainingZmw: budgetZmw - spentZmw, utilisationPercent: budgetZmw === 0 ? 0 : Number(((spentZmw / budgetZmw) * 100).toFixed(2)) };
      }).filter((row) => row.budgetZmw > 0 || row.spentZmw > 0 || row.committedZmw > 0),
      activities: activityRows.map((row) => ({ ...row, remainingZmw: row.budgetZmw - row.spentZmw, utilisationPercent: row.budgetZmw === 0 ? 0 : Number(((row.spentZmw / row.budgetZmw) * 100).toFixed(2)) })),
      categories: categoryRows.map((row) => ({ category: row.category, spentZmw: toNumber(row.spent) })),
    });
  } catch (error) {
    return apiError(error);
  }
}
