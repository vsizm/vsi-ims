import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { directorates } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { directorateInput } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "directorates.read");
  if (denied) return denied;
  try {
    const rows = await database().select().from(directorates).where(eq(directorates.active, true)).orderBy(desc(directorates.createdAt));
    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "directorates.manage");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  const parsed = directorateInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid directorate.", details: parsed.error.flatten() }, { status: 422 });
  try {
    const [created] = await database().insert(directorates).values(parsed.data).returning();
    if (!created) return NextResponse.json({ error: "Directorate could not be created." }, { status: 500 });
    await recordAuditEvent({ actorUserId: session.userId, action: "DIRECTORATE_CREATED", entityType: "directorate", entityId: created.id, afterValue: { code: created.code, name: created.name, active: created.active } });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
