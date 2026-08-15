import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { projects, programmes } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "programmes.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [programme] = await database()
      .select({ id: programmes.id })
      .from(programmes)
      .where(eq(programmes.id, id))
      .limit(1);

    if (!programme) {
      return NextResponse.json(
        { error: "Programme not found." },
        { status: 404 }
      );
    }

    const [dependency] = await database()
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.programmeId, id))
      .limit(1);

    if (dependency) {
      return NextResponse.json(
        { error: "Programme cannot be deleted while it has projects." },
        { status: 409 }
      );
    }

    await database()
      .delete(programmes)
      .where(eq(programmes.id, id));

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return apiError(error);
  }
}
