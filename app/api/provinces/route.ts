import { asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { provinces } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { provinceInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "geography.read");
  if (denied) return denied;

  try {
    const rows = await database().select().from(provinces).orderBy(asc(provinces.name));
    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "configuration.manage");
  if (denied) return denied;

  const parsed = provinceInput.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid province.", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const [created] = await database()
      .insert(provinces)
      .values(parsed.data)
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
