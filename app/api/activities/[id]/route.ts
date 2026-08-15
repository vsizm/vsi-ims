import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { activities, indicators, interventions } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [activity] = await database()
      .select({ id: activities.id })
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1);

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found." },
        { status: 404 }
      );
    }

    const [indicator] = await database()
      .select({ id: indicators.id })
      .from(indicators)
      .where(eq(indicators.activityId, id))
      .limit(1);

    if (indicator) {
      return NextResponse.json(
        { error: "Activity cannot be deleted while it has indicators." },
        { status: 409 }
      );
    }

    const [intervention] = await database()
      .select({ id: interventions.id })
      .from(interventions)
      .where(eq(interventions.activityId, id))
      .limit(1);

    if (intervention) {
      return NextResponse.json(
        { error: "Activity cannot be deleted while it has interventions." },
        { status: 409 }
      );
    }

    await database()
      .delete(activities)
      .where(eq(activities.id, id));

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return apiError(error);
  }
}
