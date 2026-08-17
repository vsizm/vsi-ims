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
    const [budgetTotals, expenseTotals, projectRows, budgetRows, expenseRows, categoryRows] = await Promise.all([
      db.select({ total: sql<string>`coalesce(sum(${financeBudgets.amountZmw}), 0)` }).from(financeBudgets).where(eq(financeBudgets.status, "APPROVED")),
      db.select({ total: sql<string>`coalesce(sum(${financeExpenses.amountZmw}), 0)` }).from(financeExpenses).where(sql`${financeExpenses.status} in ('APPROVED','PAID')`),
      db.select({ projectId: projects.id, projectCode: projects.code, projectName: projects.name, programmeCode: programmes.code }).from(projects).leftJoin(programmes, eq(projects.programmeId, programmes.id)).orderBy(projects.code),
      db.select({ projectId: financeBudgets.projectId, amount: sql<string>`coalesce(sum(${financeBudgets.amountZmw}), 0)` }).from(financeBudgets).where(eq(financeBudgets.status, "APPROVED")).groupBy(financeBudgets.projectId),
      db.select({ projectId: financeBudgets.projectId, amount: sql<string>`coalesce(sum(${financeExpenses.amountZmw}), 0)` }).from(financeExpenses).innerJoin(financeBudgets, eq(financeExpenses.budgetId, financeBudgets.id)).where(sql`${financeExpenses.status} in ('APPROVED','PAID')`).groupBy(financeBudgets.projectId),
      db.select({ category: financeExpenses.category, spent: sql<string>`coalesce(sum(${financeExpenses.amountZmw}), 0)` }).from(financeExpenses).where(sql`${financeExpenses.status} in ('APPROVED','PAID')`).groupBy(financeExpenses.category).orderBy(sql`sum(${financeExpenses.amountZmw}) desc`)
    ]);
    const budget = Number(budgetTotals[0]?.total ?? 0);
    const spent = Number(expenseTotals[0]?.total ?? 0);
    const budgetByProject = new Map(budgetRows.map((row) => [row.projectId, Number(row.amount)]));
    const spentByProject = new Map(expenseRows.map((row) => [row.projectId, Number(row.amount)]));
    return NextResponse.json({
      currency: "ZMW",
      budgetApprovedZmw: budget,
      expenditureZmw: spent,
      remainingZmw: budget - spent,
      utilisationPercent: budget === 0 ? 0 : Number(((spent / budget) * 100).toFixed(2)),
      projects: projectRows.map((row) => { const budgetZmw = budgetByProject.get(row.projectId) ?? 0; const spentZmw = spentByProject.get(row.projectId) ?? 0; return { projectCode: row.projectCode, projectName: row.projectName, programmeCode: row.programmeCode, budgetZmw, spentZmw, remainingZmw: budgetZmw - spentZmw }; }),
      categories: categoryRows.map((row) => ({ category: row.category, spentZmw: Number(row.spent) }))
    });
  } catch (error) { return apiError(error); }
}
