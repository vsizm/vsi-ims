import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { activities, indicators, projects } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { indicatorInput } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "indicators.read"); if (denied) return denied;
  try { return NextResponse.json(await database().select().from(indicators).orderBy(desc(indicators.createdAt))); }
  catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "indicators.manage"); if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error:"Authenticated session required." }, {status:401});
  const parsed = indicatorInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error:"Invalid indicator", details:parsed.error.flatten() }, { status:422 });
  try {
    const [project] = await database().select({ id: projects.id }).from(projects).where(eq(projects.id, parsed.data.projectId)).limit(1);
    if (!project) return NextResponse.json({ error:"Project not found." }, { status:404 });
    if (parsed.data.activityId) {
      const [activity] = await database().select({ id: activities.id, projectId: activities.projectId }).from(activities).where(eq(activities.id, parsed.data.activityId)).limit(1);
      if (!activity) return NextResponse.json({ error:"Activity not found." }, { status:404 });
      if (activity.projectId !== parsed.data.projectId) return NextResponse.json({ error:"Activity does not belong to the selected project." }, { status:422 });
    }
    const [created] = await database().insert(indicators).values(parsed.data).returning();
    await recordAuditEvent({ actorUserId: session.userId, action: "INDICATOR_CREATED", entityType: "indicator", entityId: created.id, afterValue: { projectId: created.projectId, activityId: created.activityId, code: created.code } });
    return NextResponse.json(created, {status:201});
  } catch (error) { return apiError(error); }
}
