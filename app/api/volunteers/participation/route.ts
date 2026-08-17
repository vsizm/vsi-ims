import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { volunteerParticipation, volunteers, activities } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

const input = z.object({ volunteerId: z.string().uuid(), activityId: z.string().uuid(), participationDate: z.string().date(), hours: z.coerce.number().positive().max(24), notes: z.string().trim().max(4000).optional() });
export async function GET(request: NextRequest) { const denied = requireServiceAccess(request, "assignments.read"); if (denied) return denied; try { return NextResponse.json(await database().select().from(volunteerParticipation).orderBy(desc(volunteerParticipation.participationDate))); } catch (error) { return apiError(error); } }
export async function POST(request: NextRequest) { const denied = requireServiceAccess(request, "assignments.manage"); if (denied) return denied; const parsed = input.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Invalid participation record", details: parsed.error.flatten() }, { status: 422 }); try { const db = database(); const [v] = await db.select({ id: volunteers.id }).from(volunteers).where(eq(volunteers.id, parsed.data.volunteerId)).limit(1); if (!v) return NextResponse.json({ error: "Volunteer not found." }, { status: 404 }); const [a] = await db.select({ id: activities.id }).from(activities).where(eq(activities.id, parsed.data.activityId)).limit(1); if (!a) return NextResponse.json({ error: "Activity not found." }, { status: 404 }); const [created] = await db.insert(volunteerParticipation).values({ ...parsed.data, hours: String(parsed.data.hours) }).returning(); return NextResponse.json(created, { status: 201 }); } catch (error) { return apiError(error); } }
