import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { activities, interventions, projects } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { interventionInput } from "@/lib/validation";
import { deliverySiteBelongsToDistrict, resolveDeliverySiteId, resolveDistrictId } from "@/lib/geography";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "interventions.read"); if (denied) return denied;
  try { return NextResponse.json(await database().select().from(interventions).orderBy(desc(interventions.interventionDate))); }
  catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "interventions.manage"); if (denied) return denied;
  const parsed = interventionInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error:"Invalid intervention", details:parsed.error.flatten() }, { status:422 });
  try {
    const [project] = await database().select({ id:projects.id }).from(projects).where(eq(projects.id, parsed.data.projectId)).limit(1);
    if (!project) return NextResponse.json({ error:"Project not found." }, { status:404 });

    if (parsed.data.activityId) {
      const [activity] = await database().select({ id:activities.id, projectId:activities.projectId }).from(activities).where(eq(activities.id, parsed.data.activityId)).limit(1);
      if (!activity) return NextResponse.json({ error:"Activity not found." }, { status:404 });
      if (activity.projectId !== parsed.data.projectId) return NextResponse.json({ error:"Activity does not belong to the selected project." }, { status:422 });
    }

    const districtId = await resolveDistrictId(parsed.data.districtId);
    if (!districtId) return NextResponse.json({ error:"District not found." }, { status:404 });
    const deliverySiteId = parsed.data.deliverySiteId ? await resolveDeliverySiteId(parsed.data.deliverySiteId) : null;
    if (parsed.data.deliverySiteId && !deliverySiteId) return NextResponse.json({ error:"Delivery site not found." }, { status:404 });
    if (deliverySiteId && !(await deliverySiteBelongsToDistrict(deliverySiteId, districtId))) return NextResponse.json({ error:"Delivery site does not belong to the selected district." }, { status:422 });

    const [created] = await database().insert(interventions).values({ ...parsed.data, districtId, deliverySiteId }).returning();
    return NextResponse.json(created,{status:201});
  } catch (error) { return apiError(error); }
}
