import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { volunteerAssignments, volunteers, projects, activities } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

const assignmentInput = z.object({ volunteerId: z.string().uuid(), projectId: z.string().uuid(), activityId: z.string().uuid().optional().nullable(), districtId: z.string().uuid().optional().nullable(), deliverySiteId: z.string().uuid().optional().nullable(), role: z.string().trim().min(2).max(120), startDate: z.string().date(), endDate: z.string().date().optional().or(z.literal("")), status: z.enum(["PLANNED","ACTIVE","COMPLETED","CANCELLED"]).default("PLANNED"), notes: z.string().trim().max(4000).optional() });

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "assignments.read"); if (denied) return denied;
  try { return NextResponse.json(await database().select({ assignment: volunteerAssignments, volunteerName: volunteers.fullName, projectCode: projects.code, projectName: projects.name, activityTitle: activities.title }).from(volunteerAssignments).innerJoin(volunteers, eq(volunteerAssignments.volunteerId, volunteers.id)).innerJoin(projects, eq(volunteerAssignments.projectId, projects.id)).leftJoin(activities, eq(volunteerAssignments.activityId, activities.id)).orderBy(desc(volunteerAssignments.startDate), asc(volunteers.fullName))); } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "assignments.manage"); if (denied) return denied;
  const parsed = assignmentInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid assignment", details: parsed.error.flatten() }, { status: 422 });
  try {
    const db = database();
    const [volunteer] = await db.select({ id: volunteers.id }).from(volunteers).where(eq(volunteers.id, parsed.data.volunteerId)).limit(1);
    if (!volunteer) return NextResponse.json({ error: "Volunteer not found." }, { status: 404 });
    const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, parsed.data.projectId)).limit(1);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const [created] = await db.insert(volunteerAssignments).values(parsed.data).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return apiError(error); }
}
