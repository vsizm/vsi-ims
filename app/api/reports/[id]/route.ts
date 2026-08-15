import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { reports } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "projects.manage");
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
