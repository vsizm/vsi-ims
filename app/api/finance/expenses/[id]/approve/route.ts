import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { financeExpenses } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireServiceAccess(request, "expenditure.approve"); if (denied) return denied;
  const session = getRequestSession(request); if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  try {
    const { id } = await params;
    const [expense] = await database().select().from(financeExpenses).where(eq(financeExpenses.id, id)).limit(1);
    if (!expense) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    if (expense.status !== "SUBMITTED") return NextResponse.json({ error: "Only submitted expenses can be approved." }, { status: 422 });
    if (expense.submittedByUserId === session.userId) return NextResponse.json({ error: "A user cannot approve an expense they submitted." }, { status: 403 });
    const approvedAt = new Date();
    const [updated] = await database().update(financeExpenses).set({ status: "APPROVED", approvedByUserId: session.userId, approvedAt, updatedAt: approvedAt }).where(eq(financeExpenses.id, id)).returning();
    await recordAuditEvent({ actorUserId: session.userId, action: "FINANCE_EXPENSE_APPROVED", entityType: "finance_expense", entityId: id, beforeValue: { status: expense.status }, afterValue: { status: updated.status, approvedByUserId: updated.approvedByUserId, approvedAt: updated.approvedAt } });
    return NextResponse.json(updated);
  } catch (error) { return apiError(error); }
}
