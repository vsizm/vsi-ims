import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { targets } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { targetInput } from "@/lib/validation";
import { districtBelongsToProvince, resolveDistrictId, resolveProvinceId } from "@/lib/geography";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "results.read"); if (denied) return denied;
  try { return NextResponse.json(await database().select().from(targets).orderBy(desc(targets.createdAt))); }
  catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "results.manage"); if (denied) return denied;
  const parsed = targetInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error:"Invalid target", details:parsed.error.flatten() }, { status:422 });
  try {
    const provinceId = parsed.data.provinceId ? await resolveProvinceId(parsed.data.provinceId) : null;
    const districtId = parsed.data.districtId ? await resolveDistrictId(parsed.data.districtId) : null;
    if (parsed.data.provinceId && !provinceId) return NextResponse.json({ error:"Province not found." }, { status:404 });
    if (parsed.data.districtId && !districtId) return NextResponse.json({ error:"District not found." }, { status:404 });
    if (provinceId && districtId && !(await districtBelongsToProvince(districtId, provinceId))) return NextResponse.json({ error:"District does not belong to the selected province." }, { status:422 });
    const [created] = await database().insert(targets).values({
      indicatorId: parsed.data.indicatorId,
      year: parsed.data.year,
      targetValue: String(parsed.data.targetValue),
      provinceId,
      districtId,
      notes: parsed.data.notes
    }).returning();
    return NextResponse.json(created,{status:201});
  } catch (error) { return apiError(error); }
}
