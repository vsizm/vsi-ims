import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { reports } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { reportInput } from "@/lib/validation";
export async function GET(request: NextRequest) { const denied=requireServiceAccess(request,"reports.read"); if(denied)return denied; try{return NextResponse.json(await database().select().from(reports).orderBy(desc(reports.createdAt)));}catch(error){return apiError(error);} }
export async function POST(request: NextRequest) { const denied=requireServiceAccess(request,"projects.manage"); if(denied)return denied; const parsed=reportInput.safeParse(await request.json()); if(!parsed.success)return NextResponse.json({error:"Invalid report",details:parsed.error.flatten()},{status:422}); try{const [created]=await database().insert(reports).values({...parsed.data,submittedByUserId:request.headers.get("x-vsi-user-id") ?? "00000000-0000-0000-0000-000000000000"}).returning();return NextResponse.json(created,{status:201});}catch(error){return apiError(error);} }
