import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { financeBudgets } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { budgetInput } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest) { const denied=requireServiceAccess(request,"budgets.read"); if(denied)return denied; try{return NextResponse.json(await database().select().from(financeBudgets).orderBy(desc(financeBudgets.createdAt)));}catch(error){return apiError(error);} }
export async function POST(request: NextRequest) {
  const denied=requireServiceAccess(request,"budgets.manage"); if(denied)return denied;
  const session=getRequestSession(request); if(!session)return NextResponse.json({error:"Authenticated session required."},{status:401});
  const parsed=budgetInput.safeParse(await request.json()); if(!parsed.success)return NextResponse.json({error:"Invalid budget",details:parsed.error.flatten()},{status:422});
  try{
    const [created]=await database().insert(financeBudgets).values({...parsed.data, amountZmw:String(parsed.data.amountZmw), createdByUserId:session.userId}).returning();
    await recordAuditEvent({actorUserId:session.userId,action:"FINANCE_BUDGET_CREATED",entityType:"finance_budget",entityId:created.id,afterValue:{budgetCode:created.budgetCode,financialYear:created.financialYear,level:created.level,amountZmw:created.amountZmw,createdByUserId:created.createdByUserId}});
    return NextResponse.json(created,{status:201});
  }catch(error){return apiError(error);}
}
