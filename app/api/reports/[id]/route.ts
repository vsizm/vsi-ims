import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { reports } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { reportInput } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "reports.manage");
  if (denied) return denied;

  const { id } = await params;
  const parsed = reportInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const [existing] = await database()
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 }
      );
    }

    const [updated] = await database()
      .update(reports)
      .set({
        ...parsed.data,
        updatedAt: new Date()
      })
      .where(eq(reports.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "reports.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [report] = await database()
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);

    if (!report) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 }
      );
    }

    await database()
      .delete(reports)
      .where(eq(reports.id, id));

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return apiError(error);
  }
}
