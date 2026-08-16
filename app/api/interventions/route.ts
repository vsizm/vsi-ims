import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  activities,
  districts,
  interventions,
  projects,
  deliverySites
} from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { interventionInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  try {
    const rows = await database()
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
      .orderBy(desc(interventions.interventionDate), desc(interventions.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  const parsed = interventionInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid intervention", details: parsed.error.flatten() },
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
          { error: "Activity must belong to the intervention project." },
          { status: 409 }
        );
      }
    }

    const [district] = await database()
      .select({ id: districts.id })
      .from(districts)
      .where(eq(districts.id, parsed.data.districtId))
      .limit(1);

    if (!district) {
      return NextResponse.json(
        { error: "District not found." },
        { status: 404 }
      );
    }

    if (parsed.data.deliverySiteId) {
      const [site] = await database()
        .select({
          id: deliverySites.id,
          districtId: deliverySites.districtId
        })
        .from(deliverySites)
        .where(eq(deliverySites.id, parsed.data.deliverySiteId))
        .limit(1);

      if (!site) {
        return NextResponse.json(
          { error: "Delivery site not found." },
          { status: 404 }
        );
      }

      if (site.districtId !== parsed.data.districtId) {
        return NextResponse.json(
          { error: "Delivery site must belong to the intervention district." },
          { status: 409 }
        );
      }
    }

    const [created] = await database()
      .insert(interventions)
      .values(parsed.data)
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
