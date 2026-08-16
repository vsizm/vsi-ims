import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  activities,
  districts,
  interventions,
  projects,
  deliverySites,
  interventionParticipants
} from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { interventionUpdateInput } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [intervention] = await database()
      .select({
        id: interventions.id,
        createdAt: interventions.createdAt,
        updatedAt: interventions.updatedAt,
        projectId: interventions.projectId,
        projectCode: projects.code,
        projectName: projects.name,
        activityId: interventions.activityId,
        activityTitle: activities.title,
        districtId: interventions.districtId,
        districtCode: districts.code,
        districtName: districts.name,
        deliverySiteId: interventions.deliverySiteId,
        deliverySiteName: deliverySites.name,
        interventionDate: interventions.interventionDate,
        title: interventions.title,
        status: interventions.status,
        notes: interventions.notes
      })
      .from(interventions)
      .innerJoin(projects, eq(interventions.projectId, projects.id))
      .leftJoin(activities, eq(interventions.activityId, activities.id))
      .innerJoin(districts, eq(interventions.districtId, districts.id))
      .leftJoin(
        deliverySites,
        eq(interventions.deliverySiteId, deliverySites.id)
      )
      .where(eq(interventions.id, id))
      .limit(1);

    if (!intervention) {
      return NextResponse.json(
        { error: "Intervention not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(intervention);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  const { id } = await params;
  const parsed = interventionUpdateInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid intervention update", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const [existing] = await database()
      .select()
      .from(interventions)
      .where(eq(interventions.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Intervention not found." },
        { status: 404 }
      );
    }

    const projectId = parsed.data.projectId ?? existing.projectId;
    const activityId =
      parsed.data.activityId !== undefined
        ? parsed.data.activityId
        : existing.activityId;
    const districtId = parsed.data.districtId ?? existing.districtId;
    const deliverySiteId =
      parsed.data.deliverySiteId !== undefined
        ? parsed.data.deliverySiteId
        : existing.deliverySiteId;

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
          projectId: activities.projectId
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
          { error: "Activity must belong to the intervention project." },
          { status: 409 }
        );
      }
    }

    const [district] = await database()
      .select({ id: districts.id })
      .from(districts)
      .where(eq(districts.id, districtId))
      .limit(1);

    if (!district) {
      return NextResponse.json(
        { error: "District not found." },
        { status: 404 }
      );
    }

    if (deliverySiteId) {
      const [site] = await database()
        .select({
          id: deliverySites.id,
          districtId: deliverySites.districtId
        })
        .from(deliverySites)
        .where(eq(deliverySites.id, deliverySiteId))
        .limit(1);

      if (!site) {
        return NextResponse.json(
          { error: "Delivery site not found." },
          { status: 404 }
        );
      }

      if (site.districtId !== districtId) {
        return NextResponse.json(
          { error: "Delivery site must belong to the intervention district." },
          { status: 409 }
        );
      }
    }

    const [updated] = await database()
      .update(interventions)
      .set({
        ...parsed.data,
        updatedAt: new Date()
      })
      .where(eq(interventions.id, id))
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

    const [participant] = await database()
      .select({ id: interventionParticipants.id })
      .from(interventionParticipants)
      .where(eq(interventionParticipants.interventionId, id))
      .limit(1);

    if (participant) {
      return NextResponse.json(
        { error: "Intervention cannot be deleted while it has participants." },
        { status: 409 }
      );
    }

    await database()
      .delete(interventions)
      .where(eq(interventions.id, id));

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return apiError(error);
  }
}
