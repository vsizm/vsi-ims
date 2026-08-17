import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { activities, indicators } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { indicatorInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "indicators.read");
  if (denied) return denied;
  try {
    return NextResponse.json(await database().select().from(indicators).orderBy(desc(indicators.createdAt)));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "indicators.manage");
  if (denied) return denied;
  const parsed = indicatorInput.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid indicator", details: parsed.error.flatten() }, { status: 422 });
  }
  try {
    if (parsed.data.activityId) {
      const [activity] = await database()
        .select({ id: activities.id })
        .from(activities)
        .where(eq(activities.id, parsed.data.activityId))
        .limit(1);
      if (!activity) return NextResponse.json({ error: "Activity not found." }, { status: 404 });

      const [projectActivity] = await database()
        .select({ id: activities.id })
        .from(activities)
        .where(and(eq(activities.id, parsed.data.activityId), eq(activities.projectId, parsed.data.projectId)))
        .limit(1);
      if (!projectActivity) {
        return NextResponse.json(
          { error: "Activity does not belong to the selected project." },
          { status: 422 },
        );
      }
    }

    const [created] = await database().insert(indicators).values(parsed.data).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
