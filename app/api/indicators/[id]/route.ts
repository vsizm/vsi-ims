import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  activities,
  indicators,
  projects,
  targets
} from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "indicators.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [indicator] = await database()
      .select({
        id: indicators.id,
        createdAt: indicators.createdAt,
        updatedAt: indicators.updatedAt,
        projectId: indicators.projectId,
        projectCode: projects.code,
        projectName: projects.name,
        activityId: indicators.activityId,
        activityTitle: activities.title,
        code: indicators.code,
        name: indicators.name,
        description: indicators.description,
        level: indicators.level,
        unit: indicators.unit,
        active: indicators.active
      })
      .from(indicators)
      .innerJoin(projects, eq(indicators.projectId, projects.id))
      .leftJoin(activities, eq(indicators.activityId, activities.id))
      .where(eq(indicators.id, id))
      .limit(1);

    if (!indicator) {
      return NextResponse.json(
        { error: "Indicator not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(indicator);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "indicators.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [indicator] = await database()
      .select({ id: indicators.id })
      .from(indicators)
      .where(eq(indicators.id, id))
      .limit(1);

    if (!indicator) {
      return NextResponse.json(
        { error: "Indicator not found." },
        { status: 404 }
      );
    }

    const [target] = await database()
      .select({ id: targets.id })
      .from(targets)
      .where(eq(targets.indicatorId, id))
      .limit(1);

    if (target) {
      return NextResponse.json(
        { error: "Indicator cannot be deleted while it has targets." },
        { status: 409 }
      );
    }

    await database()
      .delete(indicators)
      .where(eq(indicators.id, id));

    return NextResponse.json({
      deleted: true,
      id
    });
  } catch (error) {
    return apiError(error);
  }
}
