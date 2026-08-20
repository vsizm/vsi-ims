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
import { indicatorUpdateInput } from "@/lib/validation";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "indicators.manage");
  if (denied) return denied;

  const { id } = await params;
  const parsed = indicatorUpdateInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid indicator", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const [existing] = await database()
      .select({
        id: indicators.id,
        projectId: indicators.projectId,
        activityId: indicators.activityId,
      })
      .from(indicators)
      .where(eq(indicators.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Indicator not found." },
        { status: 404 }
      );
    }

    const projectId = parsed.data.projectId ?? existing.projectId;
    const activityId =
      parsed.data.activityId !== undefined
        ? parsed.data.activityId
        : existing.activityId;

    const [project] = await database()
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    if (activityId) {
      const [activity] = await database()
        .select({
          id: activities.id,
          projectId: activities.projectId,
        })
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (!activity) {
        return NextResponse.json(
          { error: "Activity not found." },
          { status: 404 }
        );
      }

      if (activity.projectId !== projectId) {
        return NextResponse.json(
          { error: "Activity must belong to the indicator project." },
          { status: 409 }
        );
      }
    }

    if (parsed.data.code !== undefined) {
      const [existingCode] = await database()
        .select({ id: indicators.id })
        .from(indicators)
        .where(eq(indicators.code, parsed.data.code))
        .limit(1);

      if (existingCode && existingCode.id !== id) {
        return NextResponse.json(
          { error: "Indicator code already exists." },
          { status: 409 }
        );
      }
    }

    const [updated] = await database()
      .update(indicators)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(indicators.id, id))
      .returning();

    return NextResponse.json(updated);
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
