import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { projects } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { projectInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "projects.read");
  if (denied) return denied;
  try {
    return NextResponse.json(await database().select().from(projects).orderBy(desc(projects.createdAt)));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "projects.manage");
  if (denied) return denied;
  const parsed = projectInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid project", details: parsed.error.flatten() }, { status: 422 });
  try {
    const [created] = await database().insert(projects).values(parsed.data).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
