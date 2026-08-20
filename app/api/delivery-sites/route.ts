import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { deliverySites } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  const districtId = request.nextUrl.searchParams.get("districtId");

  try {
    const conditions = [eq(deliverySites.active, true)];

    if (districtId) {
      conditions.push(eq(deliverySites.districtId, districtId));
    }

    const rows = await database()
      .select({
        id: deliverySites.id,
        districtId: deliverySites.districtId,
        type: deliverySites.type,
        name: deliverySites.name,
        code: deliverySites.code,
        active: deliverySites.active,
      })
      .from(deliverySites)
      .where(and(...conditions))
      .orderBy(asc(deliverySites.name));

    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}
