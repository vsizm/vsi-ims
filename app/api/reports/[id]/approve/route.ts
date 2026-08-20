import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { reports } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireServiceAccess(request, "reports.approve");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  const { id } = await params;

  try {
    const [report] = await database().select().from(reports).where(eq(reports.id, id)).limit(1);
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    if (report.approvedAt) return NextResponse.json({ error: "Report is already approved." }, { status: 409 });
    if (report.submittedByUserId === session.userId) return NextResponse.json({ error: "A user cannot approve a report they submitted." }, { status: 403 });

    const approvedAt = new Date();
    const [updated] = await database().update(reports).set({ approvedAt, updatedAt: approvedAt }).where(eq(reports.id, id)).returning();
    await recordAuditEvent({ actorUserId: session.userId, action: "REPORT_APPROVED", entityType: "report", entityId: id, beforeValue: { approvedAt: report.approvedAt }, afterValue: { approvedAt: updated.approvedAt } });
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}
