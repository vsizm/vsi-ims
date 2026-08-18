import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { programmes, projects } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { projectInput } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request,"projects.read"); if(denied)return denied;
  try{return NextResponse.json(await database().select().from(projects).orderBy(desc(projects.createdAt)));}
  catch(error){return apiError(error);}
}

export async function POST(request: NextRequest) {
  const denied=requireServiceAccess(request,"projects.manage"); if(denied)return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error:"Authenticated session required." }, {status:401});
  const parsed=projectInput.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid project",details:parsed.error.flatten()},{status:422});
  try{
    const [programme]=await database().select({id:programmes.id}).from(programmes).where(eq(programmes.id,parsed.data.programmeId)).limit(1);
    if(!programme)return NextResponse.json({error:"Programme not found."},{status:404});
    const [created]=await database().insert(projects).values(parsed.data).returning();
    await recordAuditEvent({ actorUserId: session.userId, action: "PROJECT_CREATED", entityType: "project", entityId: created.id, afterValue: { programmeId: created.programmeId, code: created.code, name: created.name, status: created.status } });
    return NextResponse.json(created,{status:201});
  }catch(error){return apiError(error);}
}