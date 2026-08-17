import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { financeBudgets, projects } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

const budgetInput = z.object({ projectId: z.string().uuid(), financialYear: z.coerce.number().int().min(2020).max(2100), budgetCode: z.string().trim().min(2).max(64), amountZmw: z.coerce.number().positive().max(99999999999999.99), notes: z.string().trim().max(4000).optional() });

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "budgets.read"); if (denied) return denied;
  try { return NextResponse.json(await database().select().from(financeBudgets).orderBy(desc(financeBudgets.financialYear), desc(financeBudgets.createdAt))); } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "budgets.manage"); if (denied) return denied;
  const parsed = budgetInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid budget", details: parsed.error.flatten() }, { status: 422 });
  try {
    const [project] = await database().select({ id: projects.id }).from(projects).where(eq(projects.id, parsed.data.projectId)).limit(1);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const [created] = await database().insert(financeBudgets).values({ ...parsed.data, amountZmw: String(parsed.data.amountZmw), status: "DRAFT" }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return apiError(error); }
}
