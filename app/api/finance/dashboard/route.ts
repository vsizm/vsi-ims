import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { financeBudgets, financeExpenses, projects, programmes } from "@/db/schema";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "finance.dashboard.read");
  if (denied) return denied;
  try {
    const db = database();
    const [budgetTotals, expenseTotals, projectRows, categoryRows] = await Promise.all([
      db.select({ total: sql<string>`coalesce(sum(${financeBudgets.amountZmw}), 0)` }).from(financeBudgets).where(eq(financeBudgets.status, "APPROVED")),
      db.select({ total: sql<string>`coalesce(sum(${financeExpenses.amountZmw}), 0)` }).from(financeExpenses).where(sql`${financeExpenses.status} in ('APPROVED','PAID')`),
      db.select({ projectId: projects.id, projectCode: projects.code, projectName: projects.name, programmeCode: programmes.code, budget: sql<string>`coalesce(sum(${financeBudgets.amountZmw}), 0)`, spent: sql<string>`coalesce(sum(case when ${financeExpenses.status} in ('APPROVED','PAID') then ${financeExpenses.amountZmw} else 0 end), 0)` }).from(projects).leftJoin(programmes, eq(projects.programmeId, programmes.id)).leftJoin(financeBudgets, eq(financeBudgets.projectId, projects.id)).leftJoin(financeExpenses, eq(financeExpenses.budgetId, financeBudgets.id)).groupBy(projects.id, projects.code, projects.name, programmes.code).orderBy(projects.code),
      db.select({ category: financeExpenses.category, spent: sql<string>`coalesce(sum(${financeExpenses.amountZmw}), 0)` }).from(financeExpenses).where(sql`${financeExpenses.status} in ('APPROVED','PAID')`).groupBy(financeExpenses.category).orderBy(sql`sum(${financeExpenses.amountZmw}) desc`)
    ]);
    const budget = Number(budgetTotals[0]?.total ?? 0);
    const spent = Number(expenseTotals[0]?.total ?? 0);
    const remaining = budget - spent;
    return NextResponse.json({
      currency: "ZMW",
      budgetApprovedZmw: budget,
      expenditureZmw: spent,
      remainingZmw: remaining,
      utilisationPercent: budget === 0 ? 0 : Number(((spent / budget) * 100).toFixed(2)),
      projects: projectRows.map((row) => ({ ...row, budgetZmw: Number(row.budget), spentZmw: Number(row.spent), remainingZmw: Number(row.budget) - Number(row.spent) })),
      categories: categoryRows.map((row) => ({ category: row.category, spentZmw: Number(row.spent) }))
    });
  } catch (error) { return apiError(error); }
}
