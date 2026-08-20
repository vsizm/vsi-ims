import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { database } from "@/lib/db";
import { activities, indicators, interventions } from "@/db/schema";
import { activityInput } from "@/lib/validation";
import { apiError, requireServiceAccess } from "@/lib/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  const { id } = await context.params;

  const parsed = activityInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid activity",
        details: parsed.error.flatten(),
      },
      { status: 422 },
    );
  }

  try {
    const [existing] = await database()
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Activity not found." },
        { status: 404 },
      );
    }

    if (!["DRAFT", "REJECTED"].includes(existing.approvalStatus)) {
      return NextResponse.json(
        { error: "Only draft or rejected activities can be edited." },
        { status: 409 },
      );
    }

    const [updated] = await database()
      .update(activities)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  const { id } = await context.params;

  try {
    const db = database();

    const activity = await db
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1);

    if (!activity[0]) {
      return NextResponse.json(
        { error: "Activity not found." },
        { status: 404 },
      );
    }

    const linkedIndicators = await db
      .select({ id: indicators.id })
      .from(indicators)
      .where(eq(indicators.activityId, id))
      .limit(1);

    if (linkedIndicators.length > 0) {
      return NextResponse.json(
        { error: "Activity cannot be deleted while it has indicators." },
        { status: 409 },
      );
    }

    const linkedInterventions = await db
      .select({ id: interventions.id })
      .from(interventions)
      .where(eq(interventions.activityId, id))
      .limit(1);

    if (linkedInterventions.length > 0) {
      return NextResponse.json(
        { error: "Activity cannot be deleted while it has interventions." },
        { status: 409 },
      );
    }

    await db
      .delete(activities)
      .where(eq(activities.id, id));

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return apiError(error);
  }
}
