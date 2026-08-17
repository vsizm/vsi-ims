import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { beneficiaries, interventionParticipants, interventions } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { z } from "zod";

const input = z.object({ interventionId: z.uuid(), beneficiaryId: z.uuid() });

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "interventions.read");
  if (denied) return denied;
  try {
    return NextResponse.json(await database().select().from(interventionParticipants).orderBy(desc(interventionParticipants.createdAt)));
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "interventions.manage");
  if (denied) return denied;
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid intervention participant", details: parsed.error.flatten() }, { status: 422 });
  try {
    const [intervention] = await database().select({ id: interventions.id }).from(interventions).where(eq(interventions.id, parsed.data.interventionId)).limit(1);
    if (!intervention) return NextResponse.json({ error: "Intervention not found." }, { status: 404 });

    const [beneficiary] = await database().select({ id: beneficiaries.id, active: beneficiaries.active }).from(beneficiaries).where(eq(beneficiaries.id, parsed.data.beneficiaryId)).limit(1);
    if (!beneficiary) return NextResponse.json({ error: "Beneficiary not found." }, { status: 404 });
    if (!beneficiary.active) return NextResponse.json({ error: "Inactive beneficiaries cannot be newly linked to interventions." }, { status: 422 });

    const [existing] = await database().select({ id: interventionParticipants.id }).from(interventionParticipants).where(and(
      eq(interventionParticipants.interventionId, parsed.data.interventionId),
      eq(interventionParticipants.beneficiaryId, parsed.data.beneficiaryId)
    )).limit(1);
    if (existing) return NextResponse.json({ error: "Beneficiary is already linked to this intervention." }, { status: 409 });

    const [created] = await database().insert(interventionParticipants).values(parsed.data).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return apiError(error); }
}
