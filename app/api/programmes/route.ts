import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { programmes } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { getRequestSession } from "@/lib/auth";
import { programmeInput } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "programmes.read");
  if (denied) return denied;
  try {
    return NextResponse.json(await database().select().from(programmes).orderBy(desc(programmes.createdAt)));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "programmes.manage");
  if (denied) return denied;
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ error: "Authenticated session required." }, { status: 401 });
  const parsed = programmeInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid programme", details: parsed.error.flatten() }, { status: 422 });
  try {
    const [created] = await database().insert(programmes).values(parsed.data).returning();
    await recordAuditEvent({ actorUserId: session.userId, action: "PROGRAMME_CREATED", entityType: "programme", entityId: created.id, afterValue: { code: created.code, name: created.name, active: created.active } });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}