import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { projects, programmes } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { projectInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "projects.manage");
  if (denied) return denied;

  try {
    const rows = await database()
      .select({
        id: projects.id,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        programmeId: projects.programmeId,
        programmeCode: programmes.code,
        programmeName: programmes.name,
        code: projects.code,
        name: projects.name,
        objective: projects.objective,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
      })
      .from(projects)
      .innerJoin(programmes, eq(projects.programmeId, programmes.id))
      .orderBy(desc(projects.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "projects.manage");
  if (denied) return denied;

  const parsed = projectInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid project", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const [programme] = await database()
      .select({ id: programmes.id })
      .from(programmes)
      .where(eq(programmes.id, parsed.data.programmeId))
      .limit(1);

    if (!programme) {
      return NextResponse.json(
        { error: "Programme not found." },
        { status: 404 }
      );
    }

    const [created] = await database()
      .insert(projects)
      .values(parsed.data)
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
