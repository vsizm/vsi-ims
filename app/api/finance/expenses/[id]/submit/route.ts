import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { financeExpenses } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireServiceAccess(request, "expenditure.manage");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  try {
    const { id } = await params;
    const [expense] = await database().select().from(financeExpenses).where(eq(financeExpenses.id, id)).limit(1);
    if (!expense) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    if (expense.submittedByUserId !== session.userId) return NextResponse.json({ error: "Only the expense submitter can submit this expense." }, { status: 403 });
    if (expense.status !== "DRAFT") return NextResponse.json({ error: "Only draft expenses can be submitted." }, { status: 422 });
    const submittedAt = new Date();
    const [updated] = await database().update(financeExpenses).set({ status: "SUBMITTED", updatedAt: submittedAt }).where(eq(financeExpenses.id, id)).returning();
    await recordAuditEvent({ actorUserId: session.userId, action: "FINANCE_EXPENSE_SUBMITTED", entityType: "finance_expense", entityId: id, beforeValue: { status: expense.status }, afterValue: { status: updated.status, submittedByUserId: updated.submittedByUserId } });
    return NextResponse.json(updated);
  } catch (error) { return apiError(error); }
}
