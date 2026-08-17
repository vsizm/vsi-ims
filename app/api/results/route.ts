import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { results, targets } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { resultInput } from "@/lib/validation";

export async function GET(request: NextRequest) { const denied=requireServiceAccess(request,"results.read"); if(denied)return denied; try{return NextResponse.json(await database().select().from(results).orderBy(desc(results.periodEnd)));}catch(error){return apiError(error);} }

export async function POST(request: NextRequest) {
  const denied=requireServiceAccess(request,"results.manage"); if(denied)return denied;
  const parsed=resultInput.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid result",details:parsed.error.flatten()},{status:422});
  try{
    const [target]=await database().select({id:targets.id}).from(targets).where(eq(targets.id,parsed.data.targetId)).limit(1);
    if(!target)return NextResponse.json({error:"Target not found."},{status:404});
    const existing=await database().select({id:results.id}).from(results).where(and(eq(results.targetId,parsed.data.targetId),eq(results.periodStart,parsed.data.periodStart),eq(results.periodEnd,parsed.data.periodEnd))).limit(1);
    if(existing[0])return NextResponse.json({error:"A result already exists for this target and reporting period."},{status:409});
    const [created]=await database().insert(results).values({targetId:parsed.data.targetId,periodStart:parsed.data.periodStart,periodEnd:parsed.data.periodEnd,actualValue:String(parsed.data.actualValue),notes:parsed.data.notes}).returning();
    return NextResponse.json(created,{status:201});
  }catch(error){return apiError(error);}
}
