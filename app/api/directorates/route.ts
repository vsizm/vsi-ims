import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { directorates } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { directorateInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "directorates.manage");
  if (denied) return denied;

  try {
    const rows = await database()
      .select()
      .from(directorates)
      .orderBy(desc(directorates.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "directorates.manage");
  if (denied) return denied;

  const parsed = directorateInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid directorate.", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const [created] = await database()
      .insert(directorates)
      .values(parsed.data)
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
