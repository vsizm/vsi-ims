import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { deliverySites } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { deliverySiteInput, geographyRef } from "@/lib/validation";
import { resolveDistrictId } from "@/lib/geography";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "geography.read");
  if (denied) return denied;

  const districtReference = request.nextUrl.searchParams.get("districtId");
  if (districtReference) {
    const parsed = geographyRef.safeParse(districtReference);
    if (!parsed.success) return NextResponse.json({ error: "Invalid district reference." }, { status: 422 });
    const districtId = await resolveDistrictId(parsed.data);
    if (!districtId) return NextResponse.json({ error: "District not found." }, { status: 404 });
    try {
      const rows = await database()
        .select()
        .from(deliverySites)
        .where(eq(deliverySites.districtId, districtId))
        .orderBy(asc(deliverySites.name));
      return NextResponse.json(rows);
    } catch (error) {
      return apiError(error);
    }
  }

  try {
    const rows = await database().select().from(deliverySites).orderBy(asc(deliverySites.name));
    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "configuration.manage");
  if (denied) return denied;

  const parsed = deliverySiteInput.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delivery site.", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const districtId = await resolveDistrictId(parsed.data.districtId);
    if (!districtId) return NextResponse.json({ error: "District not found." }, { status: 404 });

    const [created] = await database()
      .insert(deliverySites)
      .values({ districtId, type: parsed.data.type, name: parsed.data.name, code: parsed.data.code || null })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
