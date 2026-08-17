import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { financeExpenses } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireServiceAccess(request, "expenditure.approve"); if (denied) return denied;
  const session = getRequestSession(request); if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  try {
    const { id } = await params;
    const [expense] = await database().select().from(financeExpenses).where(eq(financeExpenses.id, id)).limit(1);
    if (!expense) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    if (!["SUBMITTED", "DRAFT"].includes(expense.status)) return NextResponse.json({ error: "Only draft or submitted expenses can be approved." }, { status: 422 });
    const [updated] = await database().update(financeExpenses).set({ status: "APPROVED", approvedByUserId: session.userId, approvedAt: new Date(), updatedAt: new Date() }).where(eq(financeExpenses.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) { return apiError(error); }
}
