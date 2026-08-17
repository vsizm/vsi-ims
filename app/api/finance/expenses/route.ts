import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { financeBudgets, financeExpenses } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";

const expenseInput = z.object({ budgetId: z.string().uuid(), expenseDate: z.string().date(), description: z.string().trim().min(2).max(240), category: z.string().trim().min(2).max(80), amountZmw: z.coerce.number().positive().max(99999999999999.99), notes: z.string().trim().max(4000).optional() });

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "expenditure.read"); if (denied) return denied;
  try { return NextResponse.json(await database().select().from(financeExpenses).orderBy(desc(financeExpenses.expenseDate), desc(financeExpenses.createdAt))); } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "expenditure.manage"); if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  const parsed = expenseInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid expense", details: parsed.error.flatten() }, { status: 422 });
  try {
    const [budget] = await database().select({ id: financeBudgets.id, status: financeBudgets.status }).from(financeBudgets).where(eq(financeBudgets.id, parsed.data.budgetId)).limit(1);
    if (!budget) return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    if (budget.status !== "APPROVED") return NextResponse.json({ error: "Expenses can only be recorded against an approved budget." }, { status: 422 });
    const [created] = await database().insert(financeExpenses).values({ ...parsed.data, amountZmw: String(parsed.data.amountZmw), status: "DRAFT", submittedByUserId: session.userId }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return apiError(error); }
}
