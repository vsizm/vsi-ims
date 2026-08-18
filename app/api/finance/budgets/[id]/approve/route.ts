import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { financeBudgets } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { recordAuditEvent } from "@/lib/audit";
import { getRequestSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied=requireServiceAccess(request,"budgets.approve"); if(denied)return denied;
  const session=getRequestSession(request); if(!session)return NextResponse.json({error:"Authenticated session required."},{status:401});
  try {
    const {id}=await params; const db=database();
    const [budget]=await db.select().from(financeBudgets).where(eq(financeBudgets.id,id)).limit(1);
    if(!budget)return NextResponse.json({error:"Budget not found."},{status:404});
    if(budget.status!=="DRAFT")return NextResponse.json({error:"Only draft budgets can be approved."},{status:422});
    if(budget.createdByUserId===session.userId)return NextResponse.json({error:"A budget creator cannot approve the same budget."},{status:403});
    if(budget.parentBudgetId){const [parent]=await db.select({status:financeBudgets.status}).from(financeBudgets).where(eq(financeBudgets.id,budget.parentBudgetId)).limit(1);if(!parent||parent.status!=="APPROVED")return NextResponse.json({error:"The parent budget must be approved before a child budget can be approved."},{status:422});}
    const [updated]=await db.update(financeBudgets).set({status:"APPROVED",updatedAt:new Date()}).where(eq(financeBudgets.id,id)).returning();
    await recordAuditEvent({actorUserId:session.userId,action:"FINANCE_BUDGET_APPROVED",entityType:"finance_budget",entityId:updated.id,beforeValue:{status:budget.status,createdByUserId:budget.createdByUserId},afterValue:{status:updated.status,level:updated.level,amountZmw:updated.amountZmw}});
    return NextResponse.json(updated);
  }catch(error){return apiError(error);}
}
