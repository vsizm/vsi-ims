import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { districts } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { districtInput, geographyRef } from "@/lib/validation";
import { resolveProvinceId } from "@/lib/geography";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "geography.read");
  if (denied) return denied;

  const provinceReference = request.nextUrl.searchParams.get("provinceId");
  if (provinceReference) {
    const parsed = geographyRef.safeParse(provinceReference);
    if (!parsed.success) return NextResponse.json({ error: "Invalid province reference." }, { status: 422 });
    const provinceId = await resolveProvinceId(parsed.data);
    if (!provinceId) return NextResponse.json({ error: "Province not found." }, { status: 404 });
    try {
      const rows = await database()
        .select()
        .from(districts)
        .where(eq(districts.provinceId, provinceId))
        .orderBy(asc(districts.name));
      return NextResponse.json(rows);
    } catch (error) {
      return apiError(error);
    }
  }

  try {
    const rows = await database().select().from(districts).orderBy(asc(districts.name));
    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "configuration.manage");
  if (denied) return denied;

  const parsed = districtInput.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid district.", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const provinceId = await resolveProvinceId(parsed.data.provinceId);
    if (!provinceId) return NextResponse.json({ error: "Province not found." }, { status: 404 });

    const [created] = await database()
      .insert(districts)
      .values({ provinceId, code: parsed.data.code, name: parsed.data.name })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
