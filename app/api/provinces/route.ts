import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { provinces } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "activities.manage");
  if (denied) return denied;

  try {
    const rows = await database()
      .select({
        id: provinces.id,
        code: provinces.code,
        name: provinces.name,
        active: provinces.active,
      })
      .from(provinces)
      .where(eq(provinces.active, true))
      .orderBy(asc(provinces.name));

    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}
