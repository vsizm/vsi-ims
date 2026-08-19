import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { reports, auditEvents } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireServiceAccess(request, "reports.manage");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  const { id } = await params;
  try {
    const db = database();
    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    if (report.submittedByUserId !== session.userId) return NextResponse.json({ error: "Only the report submitter can submit this report." }, { status: 403 });
    if (report.approvedAt) return NextResponse.json({ error: "Approved reports cannot be resubmitted." }, { status: 409 });
    const [latestEvent] = await db.select({ action: auditEvents.action }).from(auditEvents).where(eq(auditEvents.entityId, id)).orderBy(desc(auditEvents.createdAt)).limit(1);
    if (latestEvent?.action === "REPORT_SUBMITTED") return NextResponse.json({ error: "Report is already submitted." }, { status: 409 });
    if (latestEvent?.action === "REPORT_APPROVED") return NextResponse.json({ error: "Approved reports cannot be resubmitted." }, { status: 409 });
    await recordAuditEvent({ actorUserId: session.userId, action: "REPORT_SUBMITTED", entityType: "report", entityId: id, afterValue: { submittedByUserId: report.submittedByUserId, periodStart: report.periodStart, periodEnd: report.periodEnd } });
    return NextResponse.json({ ...report, approvalStatus: "SUBMITTED" });
  } catch (error) { return apiError(error); }
}
