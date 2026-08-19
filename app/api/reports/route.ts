import { desc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { reports, projects, auditEvents } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { reportInput } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "reports.read"); if (denied) return denied;
  try {
    const db = database();
    const rows = await db.select().from(reports).orderBy(desc(reports.createdAt));
    if (!rows.length) return NextResponse.json([]);
    const ids = rows.map(r => r.id);
    const events = await db.select({ entityId: auditEvents.entityId, action: auditEvents.action, createdAt: auditEvents.createdAt })
      .from(auditEvents).where(inArray(auditEvents.entityId, ids)).orderBy(desc(auditEvents.createdAt));
    const latest = new Map<string, string>();
    for (const event of events) if (!latest.has(event.entityId)) latest.set(event.entityId, event.action);
    return NextResponse.json(rows.map(report => ({
      ...report,
      approvalStatus: report.approvedAt ? "APPROVED" : latest.get(report.id) === "REPORT_REJECTED" ? "REJECTED" : latest.get(report.id) === "REPORT_SUBMITTED" ? "SUBMITTED" : "DRAFT"
    })));
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "reports.manage"); if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error:"Authenticated session required." }, {status:401});
  const parsed = reportInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error:"Invalid report", details:parsed.error.flatten() }, {status:422});
  try {
    const [project] = await database().select({id:projects.id}).from(projects).where(eq(projects.id, parsed.data.projectId)).limit(1);
    if (!project) return NextResponse.json({error:"Project not found."},{status:404});
    const [created] = await database().insert(reports).values({...parsed.data, submittedByUserId:session.userId}).returning();
    await recordAuditEvent({ actorUserId: session.userId, action: "REPORT_CREATED", entityType: "report", entityId: created.id, afterValue: { projectId: created.projectId, periodStart: created.periodStart, periodEnd: created.periodEnd, approvalStatus: "DRAFT" } });
    return NextResponse.json({ ...created, approvalStatus: "DRAFT" },{status:201});
  } catch (error) { return apiError(error); }
}
