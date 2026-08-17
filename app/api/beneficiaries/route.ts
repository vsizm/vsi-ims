import { asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { beneficiaries } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { beneficiaryInput } from "@/lib/validation";
import { deliverySiteBelongsToDistrict, districtBelongsToProvince, resolveDeliverySiteId, resolveDistrictId, resolveProvinceId } from "@/lib/geography";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "beneficiaries.read"); if (denied) return denied;
  try { return NextResponse.json(await database().select().from(beneficiaries).orderBy(asc(beneficiaries.beneficiaryCode))); }
  catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "beneficiaries.write"); if (denied) return denied;
  const parsed = beneficiaryInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error:"Invalid beneficiary", details:parsed.error.flatten() }, { status:422 });
  try {
    const provinceId = parsed.data.provinceId ? await resolveProvinceId(parsed.data.provinceId) : null;
    const districtId = parsed.data.districtId ? await resolveDistrictId(parsed.data.districtId) : null;
    const deliverySiteId = parsed.data.deliverySiteId ? await resolveDeliverySiteId(parsed.data.deliverySiteId) : null;
    if (parsed.data.provinceId && !provinceId) return NextResponse.json({ error:"Province not found." }, { status:404 });
    if (parsed.data.districtId && !districtId) return NextResponse.json({ error:"District not found." }, { status:404 });
    if (parsed.data.deliverySiteId && !deliverySiteId) return NextResponse.json({ error:"Delivery site not found." }, { status:404 });
    if (provinceId && districtId && !(await districtBelongsToProvince(districtId, provinceId))) return NextResponse.json({ error:"District does not belong to the selected province." }, { status:422 });
    if (districtId && deliverySiteId && !(await deliverySiteBelongsToDistrict(deliverySiteId, districtId))) return NextResponse.json({ error:"Delivery site does not belong to the selected district." }, { status:422 });
    const [created] = await database().insert(beneficiaries).values({ ...parsed.data, provinceId, districtId, deliverySiteId }).returning();
    return NextResponse.json(created, { status:201 });
  } catch (error) { return apiError(error); }
}
