import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { interventions } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { interventionInput } from "@/lib/validation";
import { resolveDeliverySiteId, resolveDistrictId } from "@/lib/geography";

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
    const districtId = await resolveDistrictId(parsed.data.districtId);
    if (!districtId) return NextResponse.json({ error:"District not found." }, { status:404 });
    const deliverySiteId = parsed.data.deliverySiteId ? await resolveDeliverySiteId(parsed.data.deliverySiteId) : null;
    if (parsed.data.deliverySiteId && !deliverySiteId) return NextResponse.json({ error:"Delivery site not found." }, { status:404 });
    const [created] = await database().insert(interventions).values({ ...parsed.data, districtId, deliverySiteId }).returning();
    return NextResponse.json(created, { status:201 });
  } catch (error) { return apiError(error); }
}
