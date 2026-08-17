import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { financeBudgets } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireServiceAccess(request, "budgets.approve"); if (denied) return denied;
  try {
    const { id } = await params;
    const [budget] = await database().select().from(financeBudgets).where(eq(financeBudgets.id, id)).limit(1);
    if (!budget) return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    if (budget.status !== "DRAFT") return NextResponse.json({ error: "Only draft budgets can be approved." }, { status: 422 });
    const [updated] = await database().update(financeBudgets).set({ status: "APPROVED", updatedAt: new Date() }).where(eq(financeBudgets.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) { return apiError(error); }
}
