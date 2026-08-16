import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  beneficiaries,
  districts,
  interventionParticipants,
  interventions,
  provinces
} from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { interventionParticipantInput } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [intervention] = await database()
      .select({ id: interventions.id })
      .from(interventions)
      .where(eq(interventions.id, id))
      .limit(1);

    if (!intervention) {
      return NextResponse.json(
        { error: "Intervention not found." },
        { status: 404 }
      );
    }

    const rows = await database()
      .select({
        id: interventionParticipants.id,
        beneficiaryId: beneficiaries.id,
        beneficiaryCode: beneficiaries.beneficiaryCode,
        fullName: beneficiaries.fullName,
        ageGroup: beneficiaries.ageGroup,
        sex: beneficiaries.sex,
        pwd: beneficiaries.pwd,
        provinceId: beneficiaries.provinceId,
        provinceName: provinces.name,
        districtId: beneficiaries.districtId,
        districtName: districts.name
      })
      .from(interventionParticipants)
      .innerJoin(
        beneficiaries,
        eq(interventionParticipants.beneficiaryId, beneficiaries.id)
      )
      .leftJoin(
        provinces,
        eq(beneficiaries.provinceId, provinces.id)
      )
      .leftJoin(
        districts,
        eq(beneficiaries.districtId, districts.id)
      )
      .where(eq(interventionParticipants.interventionId, id))
      .orderBy(asc(beneficiaries.fullName));

    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  const { id } = await params;
  const parsed = interventionParticipantInput.safeParse(
    await request.json()
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid intervention participant",
        details: parsed.error.flatten()
      },
      { status: 422 }
    );
  }

  try {
    const [intervention] = await database()
      .select({
        id: interventions.id,
        districtId: interventions.districtId
      })
      .from(interventions)
      .where(eq(interventions.id, id))
      .limit(1);

    if (!intervention) {
      return NextResponse.json(
        { error: "Intervention not found." },
        { status: 404 }
      );
    }

    const [beneficiary] = await database()
      .select({
        id: beneficiaries.id,
        districtId: beneficiaries.districtId,
        active: beneficiaries.active
      })
      .from(beneficiaries)
      .where(eq(beneficiaries.id, parsed.data.beneficiaryId))
      .limit(1);

    if (!beneficiary) {
      return NextResponse.json(
        { error: "Beneficiary not found." },
        { status: 404 }
      );
    }

    if (!beneficiary.active) {
      return NextResponse.json(
        { error: "Inactive beneficiaries cannot be added to interventions." },
        { status: 409 }
      );
    }

    if (
      beneficiary.districtId &&
      beneficiary.districtId !== intervention.districtId
    ) {
      return NextResponse.json(
        {
          error:
            "Beneficiary must belong to the intervention district."
        },
        { status: 409 }
      );
    }

    const [sameParticipant] = await database()
      .select({ id: interventionParticipants.id })
      .from(interventionParticipants)
      .where(
        and(
          eq(interventionParticipants.interventionId, id),
          eq(
            interventionParticipants.beneficiaryId,
            parsed.data.beneficiaryId
          )
        )
      )
      .limit(1);

    if (sameParticipant) {
      return NextResponse.json(
        { error: "Beneficiary is already linked to this intervention." },
        { status: 409 }
      );
    }

    const [created] = await database()
      .insert(interventionParticipants)
      .values({
        interventionId: id,
        beneficiaryId: parsed.data.beneficiaryId
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  const { id } = await params;
  const beneficiaryId = request.nextUrl.searchParams.get("beneficiaryId");

  if (!beneficiaryId) {
    return NextResponse.json(
      { error: "beneficiaryId is required." },
      { status: 422 }
    );
  }

  try {
    const [intervention] = await database()
      .select({ id: interventions.id })
      .from(interventions)
      .where(eq(interventions.id, id))
      .limit(1);

    if (!intervention) {
      return NextResponse.json(
        { error: "Intervention not found." },
        { status: 404 }
      );
    }

    const [participant] = await database()
      .select({ id: interventionParticipants.id })
      .from(interventionParticipants)
      .where(
        and(
          eq(interventionParticipants.interventionId, id),
          eq(interventionParticipants.beneficiaryId, beneficiaryId)
        )
      )
      .limit(1);

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found." },
        { status: 404 }
      );
    }

    await database()
      .delete(interventionParticipants)
      .where(eq(interventionParticipants.id, participant.id));

    return NextResponse.json({
      deleted: true,
      interventionId: id,
      beneficiaryId
    });
  } catch (error) {
    return apiError(error);
  }
}
