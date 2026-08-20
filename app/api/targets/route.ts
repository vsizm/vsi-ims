import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { indicators, targets } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { targetInput } from "@/lib/validation";
import { districtBelongsToProvince, resolveDistrictId, resolveProvinceId } from "@/lib/geography";
import { recordAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest) { const denied=requireServiceAccess(request,"results.read"); if(denied)return denied; try{return NextResponse.json(await database().select().from(targets).orderBy(desc(targets.createdAt)));}catch(error){return apiError(error);} }

export async function POST(request: NextRequest) {
  const denied=requireServiceAccess(request,"results.manage"); if(denied)return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error:"Authenticated session required." }, {status:401});
  const parsed=targetInput.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid target",details:parsed.error.flatten()},{status:422});
  try{
    const [indicator]=await database().select({id:indicators.id,active:indicators.active}).from(indicators).where(eq(indicators.id,parsed.data.indicatorId)).limit(1);
    if(!indicator)return NextResponse.json({error:"Indicator not found."},{status:404});
    if(!indicator.active)return NextResponse.json({error:"Cannot create a target for an inactive indicator."},{status:422});
    const provinceId=parsed.data.provinceId?await resolveProvinceId(parsed.data.provinceId):null;
    const districtId=parsed.data.districtId?await resolveDistrictId(parsed.data.districtId):null;
    if(parsed.data.provinceId&&!provinceId)return NextResponse.json({error:"Province not found."},{status:404});
    if(parsed.data.districtId&&!districtId)return NextResponse.json({error:"District not found."},{status:404});
    if(provinceId&&districtId&&!(await districtBelongsToProvince(districtId,provinceId)))return NextResponse.json({error:"District does not belong to the selected province."},{status:422});
    const existing=await database().select({id:targets.id}).from(targets).where(and(eq(targets.indicatorId,parsed.data.indicatorId),eq(targets.year,parsed.data.year),sql`${targets.provinceId} IS NOT DISTINCT FROM ${provinceId}`,sql`${targets.districtId} IS NOT DISTINCT FROM ${districtId}`)).limit(1);
    if(existing[0])return NextResponse.json({error:"A target already exists for this indicator, year, and geographic scope."},{status:409});
    const [created]=await database().insert(targets).values({indicatorId:parsed.data.indicatorId,year:parsed.data.year,targetValue:String(parsed.data.targetValue),provinceId,districtId,notes:parsed.data.notes}).returning();
    await recordAuditEvent({ actorUserId: session.userId, action: "TARGET_CREATED", entityType: "target", entityId: created.id, afterValue: { indicatorId: created.indicatorId, year: created.year, provinceId: created.provinceId, districtId: created.districtId, targetValue: created.targetValue } });
    return NextResponse.json(created,{status:201});
  }catch(error){return apiError(error);}
}
