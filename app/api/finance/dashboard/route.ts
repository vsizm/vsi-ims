import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { directorates, financeBudgets, financeExpenses, programmes, projects } from "@/db/schema";

const toNumber = (value: unknown) => Number(value ?? 0);

type Attention = {
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  type: "OVER_BUDGET" | "HIGH_UTILISATION" | "LOW_UNCOMMITTED" | "NO_SPEND";
  scope: "ORGANISATION" | "DIRECTORATE" | "PROGRAMME" | "PROJECT";
  code: string;
  name: string;
  message: string;
  recommendation: string;
  decision: string;
};

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "finance.dashboard.read");
  if (denied) return denied;
  try {
    const db = database();
    const requestedYear = Number(new URL(request.url).searchParams.get("year"));
    const financialYear = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : new Date().getUTCFullYear();
    const [budgetRows, expenseRows, projectRows, categoryRows] = await Promise.all([
      db.select({ id: financeBudgets.id, level: financeBudgets.level, amount: financeBudgets.amountZmw, status: financeBudgets.status, directorateId: financeBudgets.directorateId, programmeId: financeBudgets.programmeId, projectId: financeBudgets.projectId, activityId: financeBudgets.activityId, directorateCode: directorates.code, directorateName: directorates.name, programmeCode: programmes.code, programmeName: programmes.name, projectCode: projects.code, projectName: projects.name }).from(financeBudgets).leftJoin(directorates, eq(financeBudgets.directorateId, directorates.id)).leftJoin(programmes, eq(financeBudgets.programmeId, programmes.id)).leftJoin(projects, eq(financeBudgets.projectId, projects.id)).where(sql`${financeBudgets.financialYear} = ${financialYear}`),
      db.select({ budgetId: financeExpenses.budgetId, approved: sql<string>`coalesce(sum(case when ${financeExpenses.status} = 'APPROVED' then ${financeExpenses.amountZmw} else 0 end), 0)`, paid: sql<string>`coalesce(sum(case when ${financeExpenses.status} = 'PAID' then ${financeExpenses.amountZmw} else 0 end), 0)` }).from(financeExpenses).groupBy(financeExpenses.budgetId),
      db.select({ projectId: projects.id, projectCode: projects.code, projectName: projects.name, programmeCode: programmes.code, programmeName: programmes.name, directorateCode: directorates.code, directorateName: directorates.name }).from(projects).leftJoin(programmes, eq(projects.programmeId, programmes.id)).leftJoin(directorates, eq(programmes.directorateId, directorates.id)).orderBy(projects.code),
      db.select({ category: financeExpenses.category, spent: sql<string>`coalesce(sum(case when ${financeExpenses.status} = 'PAID' then ${financeExpenses.amountZmw} else 0 end), 0)` }).from(financeExpenses).innerJoin(financeBudgets, eq(financeExpenses.budgetId, financeBudgets.id)).where(sql`${financeBudgets.financialYear} = ${financialYear}`).groupBy(financeExpenses.category).orderBy(sql`sum(case when ${financeExpenses.status} = 'PAID' then ${financeExpenses.amountZmw} else 0 end) desc`),
    ]);
    const expenseByBudget = new Map(expenseRows.map((row) => [row.budgetId, { approved: toNumber(row.approved), paid: toNumber(row.paid) }]));
    const approved = budgetRows.filter((row) => row.status === "APPROVED");
    const directorateMap = new Map<string, { code: string; name: string; budgetZmw: number; committedZmw: number; spentZmw: number }>();
    const programmeMap = new Map<string, { code: string; name: string; directorateCode: string | null; budgetZmw: number; committedZmw: number; spentZmw: number }>();
    const projectMap = new Map<string, { code: string; name: string; programmeCode: string | null; directorateCode: string | null; budgetZmw: number; committedZmw: number; spentZmw: number }>();
    const activityRows: Array<{ activityId: string | null; budgetZmw: number; committedZmw: number; spentZmw: number; projectCode: string | null }> = [];
    for (const row of approved) {
      const amount = toNumber(row.amount);
      const expense = expenseByBudget.get(row.id) ?? { approved: 0, paid: 0 };
      const committedZmw = expense.approved + expense.paid;
      if (row.level === "DIRECTORATE" && row.directorateId && row.directorateCode) {
        const current = directorateMap.get(row.directorateId) ?? { code: row.directorateCode, name: row.directorateName ?? row.directorateCode, budgetZmw: 0, committedZmw: 0, spentZmw: 0 };
        current.budgetZmw += amount; current.committedZmw += committedZmw; current.spentZmw += expense.paid; directorateMap.set(row.directorateId, current);
      }
      if (row.level === "PROGRAMME" && row.programmeId && row.programmeCode) {
        const current = programmeMap.get(row.programmeId) ?? { code: row.programmeCode, name: row.programmeName ?? row.programmeCode, directorateCode: row.directorateCode ?? null, budgetZmw: 0, committedZmw: 0, spentZmw: 0 };
        current.budgetZmw += amount; current.committedZmw += committedZmw; current.spentZmw += expense.paid; programmeMap.set(row.programmeId, current);
      }
      if (row.level === "PROJECT" && row.projectId && row.projectCode) {
        const current = projectMap.get(row.projectId) ?? { code: row.projectCode, name: row.projectName ?? row.projectCode, programmeCode: row.programmeCode ?? null, directorateCode: row.directorateCode ?? null, budgetZmw: 0, committedZmw: 0, spentZmw: 0 };
        current.budgetZmw += amount; current.committedZmw += committedZmw; current.spentZmw += expense.paid; projectMap.set(row.projectId, current);
      }
      if (row.level === "ACTIVITY") activityRows.push({ activityId: row.activityId, budgetZmw: amount, committedZmw, spentZmw: expense.paid, projectCode: row.projectCode ?? null });
    }
    const programmeAllocations = approved.filter((row) => row.level === "PROGRAMME").reduce((sum, row) => sum + toNumber(row.amount), 0);
    const projectAllocations = approved.filter((row) => row.level === "PROJECT").reduce((sum, row) => sum + toNumber(row.amount), 0);
    const activityAllocations = approved.filter((row) => row.level === "ACTIVITY").reduce((sum, row) => sum + toNumber(row.amount), 0);
    const directorateBudget = [...directorateMap.values()].reduce((sum, row) => sum + row.budgetZmw, 0);
    const committed = approved.reduce((sum, row) => { const e = expenseByBudget.get(row.id); return sum + (e?.approved ?? 0) + (e?.paid ?? 0); }, 0);
    const spent = approved.reduce((sum, row) => sum + (expenseByBudget.get(row.id)?.paid ?? 0), 0);
    const utilisationPercent = directorateBudget === 0 ? 0 : Number(((spent / directorateBudget) * 100).toFixed(2));
    const committedPercent = directorateBudget === 0 ? 0 : Number(((committed / directorateBudget) * 100).toFixed(2));
    const attention: Attention[] = [];
    const addSignals = (scope: Attention["scope"], rows: Array<{ code: string; name: string; budgetZmw: number; committedZmw: number; spentZmw: number }>) => {
      for (const row of rows) {
        if (row.budgetZmw <= 0) continue;
        const utilisation = (row.spentZmw / row.budgetZmw) * 100;
        const commitment = (row.committedZmw / row.budgetZmw) * 100;
        if (utilisation > 100) attention.push({ severity: "CRITICAL", type: "OVER_BUDGET", scope, code: row.code, name: row.name, message: `Paid expenditure is ${utilisation.toFixed(1)}% of the approved budget.`, recommendation: "Freeze discretionary spend and reconcile the variance before further commitments.", decision: "Management decision required: approve corrective action or reforecast." });
        else if (utilisation >= 80) attention.push({ severity: "HIGH", type: "HIGH_UTILISATION", scope, code: row.code, name: row.name, message: `Paid expenditure has reached ${utilisation.toFixed(1)}% of budget.`, recommendation: "Review remaining activities, commitments and forecast-to-complete before additional spending.", decision: "Decide whether the remaining budget is sufficient or a controlled reallocation is needed." });
        else if (commitment >= 90) attention.push({ severity: "HIGH", type: "LOW_UNCOMMITTED", scope, code: row.code, name: row.name, message: `${commitment.toFixed(1)}% of budget is already committed.`, recommendation: "Review outstanding commitments and protect funds for essential planned work.", decision: "Decide whether to release, retain or reallocate outstanding commitments." });
        else if (row.spentZmw === 0) attention.push({ severity: "MEDIUM", type: "NO_SPEND", scope, code: row.code, name: row.name, message: "An approved budget has no recorded paid expenditure.", recommendation: "Confirm implementation status and whether funds are still required for the approved plan.", decision: "Decide whether to accelerate delivery, revise the plan or reallocate funds." });
      }
    };
    addSignals("DIRECTORATE", [...directorateMap.values()]);
    addSignals("PROGRAMME", [...programmeMap.values()]);
    addSignals("PROJECT", [...projectMap.values()]);
    if (directorateBudget > 0 && programmeAllocations === 0) attention.push({ severity: "HIGH", type: "LOW_UNCOMMITTED", scope: "ORGANISATION", code: "ORG", name: "Organisation", message: "Approved Directorate budget has no approved Programme allocations.", recommendation: "Complete programme-level budgeting before relying on the available balance as deployable programme funding.", decision: "Management decision required: confirm programme priorities and allocation plan." });
    attention.sort((a, b) => ({ CRITICAL: 0, HIGH: 1, MEDIUM: 2 }[a.severity] - { CRITICAL: 0, HIGH: 1, MEDIUM: 2 }[b.severity]));
    return NextResponse.json({
      currency: "ZMW", financialYear, budgetApprovedZmw: directorateBudget, expenditureZmw: spent, committedZmw: committed, remainingZmw: directorateBudget - spent, uncommittedZmw: directorateBudget - committed, utilisationPercent, committedPercent,
      allocationSummary: { directorateBudgetZmw: directorateBudget, programmeAllocationZmw: programmeAllocations, projectAllocationZmw: projectAllocations, activityAllocationZmw: activityAllocations },
      attention,
      attentionSummary: { critical: attention.filter((item) => item.severity === "CRITICAL").length, high: attention.filter((item) => item.severity === "HIGH").length, medium: attention.filter((item) => item.severity === "MEDIUM").length },
      directorates: [...directorateMap.values()].map((row) => ({ ...row, remainingZmw: row.budgetZmw - row.spentZmw, utilisationPercent: row.budgetZmw === 0 ? 0 : Number(((row.spentZmw / row.budgetZmw) * 100).toFixed(2)) })),
      programmes: [...programmeMap.values()].map((row) => ({ ...row, remainingZmw: row.budgetZmw - row.spentZmw, utilisationPercent: row.budgetZmw === 0 ? 0 : Number(((row.spentZmw / row.budgetZmw) * 100).toFixed(2)) })),
      projects: projectRows.map((row) => { const finance = projectMap.get(row.projectId); const budgetZmw = finance?.budgetZmw ?? 0; const spentZmw = finance?.spentZmw ?? 0; const committedZmw = finance?.committedZmw ?? 0; return { projectCode: row.projectCode, projectName: row.projectName, programmeCode: row.programmeCode, programmeName: row.programmeName, directorateCode: row.directorateCode, directorateName: row.directorateName, budgetZmw, committedZmw, spentZmw, remainingZmw: budgetZmw - spentZmw, utilisationPercent: budgetZmw === 0 ? 0 : Number(((spentZmw / budgetZmw) * 100).toFixed(2)) }; }).filter((row) => row.budgetZmw > 0 || row.spentZmw > 0 || row.committedZmw > 0),
      activities: activityRows.map((row) => ({ ...row, remainingZmw: row.budgetZmw - row.spentZmw, utilisationPercent: row.budgetZmw === 0 ? 0 : Number(((row.spentZmw / row.budgetZmw) * 100).toFixed(2)) })),
      categories: categoryRows.map((row) => ({ category: row.category, spentZmw: toNumber(row.spent) })),
    });
  } catch (error) { return apiError(error); }
}