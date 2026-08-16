import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  activities,
  indicators,
  interventions,
  projects,
  programmes,
  reports
} from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "projects.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [project] = await database()
      .select({
        id: projects.id,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        programmeId: projects.programmeId,
        programmeCode: programmes.code,
        programmeName: programmes.name,
        code: projects.code,
        name: projects.name,
        objective: projects.objective,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate
      })
      .from(projects)
      .innerJoin(programmes, eq(projects.programmeId, programmes.id))
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "projects.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [project] = await database()
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    const [activity] = await database()
      .select({ id: activities.id })
      .from(activities)
      .where(eq(activities.projectId, id))
      .limit(1);

    if (activity) {
      return NextResponse.json(
        { error: "Project cannot be deleted while it has activities." },
        { status: 409 }
      );
    }

    const [report] = await database()
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.projectId, id))
      .limit(1);

    if (report) {
      return NextResponse.json(
        { error: "Project cannot be deleted while it has reports." },
        { status: 409 }
      );
    }

    const [indicator] = await database()
      .select({ id: indicators.id })
      .from(indicators)
      .where(eq(indicators.projectId, id))
      .limit(1);

    if (indicator) {
      return NextResponse.json(
        { error: "Project cannot be deleted while it has indicators." },
        { status: 409 }
      );
    }

    const [intervention] = await database()
      .select({ id: interventions.id })
      .from(interventions)
      .where(eq(interventions.projectId, id))
      .limit(1);

    if (intervention) {
      return NextResponse.json(
        { error: "Project cannot be deleted while it has interventions." },
        { status: 409 }
      );
    }

    await database()
      .delete(projects)
      .where(eq(projects.id, id));

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return apiError(error);
  }
}
