import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { activities } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { activityRejectionInput } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "activities.approve");
  if (denied) return denied;

  const { id } = await params;

  const parsed = activityRejectionInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid rejection.", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const [activity] = await database()
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1);

    if (!activity) {
      return NextResponse.json({ error: "Activity not found." }, { status: 404 });
    }

    if (activity.approvalStatus !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Only submitted activities can be rejected." },
        { status: 409 }
      );
    }

    const [updated] = await database()
      .update(activities)
      .set({
        approvalStatus: "REJECTED",
        rejectionReason: parsed.data.reason,
        approvedAt: null,
        approvedByUserId: null,
        updatedAt: new Date()
      })
      .where(eq(activities.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}
