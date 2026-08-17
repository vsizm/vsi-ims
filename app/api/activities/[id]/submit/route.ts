import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { activities } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  const { id } = await params;

  try {
    const [activity] = await database().select().from(activities).where(eq(activities.id, id)).limit(1);
    if (!activity) return NextResponse.json({ error: "Activity not found." }, { status: 404 });
    if (!["DRAFT", "REJECTED"].includes(activity.approvalStatus)) return NextResponse.json({ error: "Only draft or rejected activities can be submitted." }, { status: 409 });

    const [updated] = await database().update(activities).set({
      approvalStatus: "SUBMITTED",
      submittedAt: new Date(),
      submittedByUserId: session.userId,
      rejectionReason: null,
      updatedAt: new Date()
    }).where(eq(activities.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) { return apiError(error); }
}
