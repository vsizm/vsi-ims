import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { activities } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireServiceAccess(request, "activities.approve");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  const { id } = await params;

  try {
    const [activity] = await database().select().from(activities).where(eq(activities.id, id)).limit(1);
    if (!activity) return NextResponse.json({ error: "Activity not found." }, { status: 404 });
    if (activity.approvalStatus !== "SUBMITTED") return NextResponse.json({ error: "Only submitted activities can be approved." }, { status: 409 });
    if (activity.submittedByUserId === session.userId) return NextResponse.json({ error: "A user cannot approve an activity they submitted." }, { status: 403 });

    const [updated] = await database().update(activities).set({
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
      approvedByUserId: session.userId,
      updatedAt: new Date(),
      rejectionReason: null
    }).where(eq(activities.id, id)).returning();

    await recordAuditEvent({ actorUserId: session.userId, action: "ACTIVITY_APPROVED", entityType: "activity", entityId: id, beforeValue: { approvalStatus: activity.approvalStatus }, afterValue: { approvalStatus: updated.approvalStatus } });
    return NextResponse.json(updated);
  } catch (error) { return apiError(error); }
}
