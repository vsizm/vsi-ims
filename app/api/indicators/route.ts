import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  activities,
  indicators,
  projects
} from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { indicatorInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "indicators.manage");
  if (denied) return denied;

  try {
    const rows = await database()
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
      .orderBy(desc(indicators.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "indicators.manage");
  if (denied) return denied;

  const parsed = indicatorInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid indicator", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const [project] = await database()
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, parsed.data.projectId))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    if (parsed.data.activityId) {
      const [activity] = await database()
        .select({
          id: activities.id,
          projectId: activities.projectId
        })
        .from(activities)
        .where(eq(activities.id, parsed.data.activityId))
        .limit(1);

      if (!activity) {
        return NextResponse.json(
          { error: "Activity not found." },
          { status: 404 }
        );
      }

      if (activity.projectId !== parsed.data.projectId) {
        return NextResponse.json(
          { error: "Activity must belong to the indicator project." },
          { status: 409 }
        );
      }
    }

    const [existingCode] = await database()
      .select({ id: indicators.id })
      .from(indicators)
      .where(eq(indicators.code, parsed.data.code))
      .limit(1);

    if (existingCode) {
      return NextResponse.json(
        { error: "Indicator code already exists." },
        { status: 409 }
      );
    }

    const [created] = await database()
      .insert(indicators)
      .values(parsed.data)
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
