import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { interventionParticipants } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { z } from "zod";

const input = z.object({ interventionId:z.uuid(), beneficiaryId:z.uuid() });

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "interventions.read"); if (denied) return denied;
  try { return NextResponse.json(await database().select().from(interventionParticipants).orderBy(desc(interventionParticipants.createdAt))); }
  catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "interventions.manage"); if (denied) return denied;
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error:"Invalid intervention participant", details:parsed.error.flatten() }, { status:422 });
  try { const [created] = await database().insert(interventionParticipants).values(parsed.data).returning(); return NextResponse.json(created,{status:201}); }
  catch (error) { return apiError(error); }
}
