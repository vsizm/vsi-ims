import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { volunteerTraining, volunteers } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

const input = z.object({ volunteerId: z.string().uuid(), title: z.string().trim().min(2).max(180), trainingDate: z.string().date(), provider: z.string().trim().max(180).optional(), certificateReference: z.string().trim().max(120).optional(), completed: z.boolean().default(true) });
export async function GET(request: NextRequest) { const denied = requireServiceAccess(request, "volunteers.read"); if (denied) return denied; try { return NextResponse.json(await database().select().from(volunteerTraining).orderBy(desc(volunteerTraining.trainingDate))); } catch (error) { return apiError(error); } }
export async function POST(request: NextRequest) { const denied = requireServiceAccess(request, "volunteers.manage"); if (denied) return denied; const parsed = input.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Invalid training record", details: parsed.error.flatten() }, { status: 422 }); try { const [v] = await database().select({ id: volunteers.id }).from(volunteers).where(eq(volunteers.id, parsed.data.volunteerId)).limit(1); if (!v) return NextResponse.json({ error: "Volunteer not found." }, { status: 404 }); const [created] = await database().insert(volunteerTraining).values(parsed.data).returning(); return NextResponse.json(created, { status: 201 }); } catch (error) { return apiError(error); } }
