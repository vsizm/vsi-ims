import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { districts } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  const provinceId = request.nextUrl.searchParams.get("provinceId");

  try {
    const conditions = [eq(districts.active, true)];

    if (provinceId) {
      conditions.push(eq(districts.provinceId, provinceId));
    }

    const rows = await database()
      .select({
        id: districts.id,
        provinceId: districts.provinceId,
        code: districts.code,
        name: districts.name,
        active: districts.active,
      })
      .from(districts)
      .where(and(...conditions))
      .orderBy(asc(districts.name));

    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}
