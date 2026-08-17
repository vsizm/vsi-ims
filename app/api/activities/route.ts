import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { activities, projects } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { activityInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied=requireServiceAccess(request,"activities.read"); if(denied)return denied;
  try{return NextResponse.json(await database().select().from(activities).orderBy(desc(activities.createdAt)));}
  catch(error){return apiError(error);}
}

export async function POST(request: NextRequest) {
  const denied=requireServiceAccess(request,"activities.manage"); if(denied)return denied;
  const parsed=activityInput.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid activity",details:parsed.error.flatten()},{status:422});
  try{
    const [project]=await database().select({id:projects.id}).from(projects).where(eq(projects.id,parsed.data.projectId)).limit(1);
    if(!project)return NextResponse.json({error:"Project not found."},{status:404});
    const [created]=await database().insert(activities).values(parsed.data).returning();
    return NextResponse.json(created,{status:201});
  }catch(error){return apiError(error);}
}
