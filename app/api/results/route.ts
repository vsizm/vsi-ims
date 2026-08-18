import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { results, targets } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { resultInput } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest) { const denied=requireServiceAccess(request,"results.read"); if(denied)return denied; try{return NextResponse.json(await database().select().from(results).orderBy(desc(results.periodEnd)));}catch(error){return apiError(error);}}

export async function POST(request: NextRequest) {
  const denied=requireServiceAccess(request,"results.manage"); if(denied)return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error:"Authenticated session required." }, {status:401});
  const parsed=resultInput.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid result",details:parsed.error.flatten()},{status:422});
  try{
    if (parsed.data.periodStart > parsed.data.periodEnd) return NextResponse.json({error:"Reporting period start cannot be after period end."},{status:422});
    const [target]=await database().select({id:targets.id,year:targets.year}).from(targets).where(eq(targets.id,parsed.data.targetId)).limit(1);
    if(!target)return NextResponse.json({error:"Target not found."},{status:404});
    const targetYearStart = `${target.year}-01-01`;
    const targetYearEnd = `${target.year}-12-31`;
    if (parsed.data.periodStart < targetYearStart || parsed.data.periodEnd > targetYearEnd) return NextResponse.json({error:"Reporting period must fall within the target year."},{status:422});
    const existing=await database().select({id:results.id}).from(results).where(and(eq(results.targetId,parsed.data.targetId),eq(results.periodStart,parsed.data.periodStart),eq(results.periodEnd,parsed.data.periodEnd))).limit(1);
    if(existing[0])return NextResponse.json({error:"A result already exists for this target and reporting period."},{status:409});
    const [created]=await database().insert(results).values({targetId:parsed.data.targetId,periodStart:parsed.data.periodStart,periodEnd:parsed.data.periodEnd,actualValue:String(parsed.data.actualValue),notes:parsed.data.notes}).returning();
    await recordAuditEvent({ actorUserId: session.userId, action: "RESULT_CREATED", entityType: "result", entityId: created.id, afterValue: { targetId: created.targetId, periodStart: created.periodStart, periodEnd: created.periodEnd, actualValue: created.actualValue } });
    return NextResponse.json(created,{status:201});
  }catch(error){return apiError(error);}
}
