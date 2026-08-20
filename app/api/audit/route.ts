import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auditEvents } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "audit.read");
  if (denied) return denied;
  try {
    const rows = await database().select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(200);
    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}
