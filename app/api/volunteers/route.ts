import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { volunteers } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

const volunteerInput = z.object({ volunteerCode: z.string().trim().min(2).max(64), fullName: z.string().trim().min(2).max(240), email: z.string().email().max(240).optional().or(z.literal("")), phone: z.string().trim().max(40).optional(), dateOfBirth: z.string().date().optional().or(z.literal("")), sex: z.enum(["FEMALE", "MALE", "NOT_STATED"]).default("NOT_STATED"), provinceId: z.string().uuid().optional().nullable(), districtId: z.string().uuid().optional().nullable(), status: z.enum(["APPLICANT","ACTIVE","INACTIVE","ALUMNI"]).default("APPLICANT"), joinedAt: z.string().date().optional().or(z.literal("")), notes: z.string().trim().max(4000).optional() });

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "volunteers.read"); if (denied) return denied;
  try { return NextResponse.json(await database().select().from(volunteers).orderBy(asc(volunteers.status), desc(volunteers.createdAt))); } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "volunteers.manage"); if (denied) return denied;
  const parsed = volunteerInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid volunteer", details: parsed.error.flatten() }, { status: 422 });
  try { const [created] = await database().insert(volunteers).values(parsed.data).returning(); return NextResponse.json(created, { status: 201 }); } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest) {
  const denied = requireServiceAccess(request, "volunteers.manage"); if (denied) return denied;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Volunteer id is required." }, { status: 400 });
  const parsed = volunteerInput.partial().safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid volunteer update", details: parsed.error.flatten() }, { status: 422 });
  try { const [updated] = await database().update(volunteers).set({ ...parsed.data, updatedAt: new Date() }).where(eq(volunteers.id, id)).returning(); if (!updated) return NextResponse.json({ error: "Volunteer not found." }, { status: 404 }); return NextResponse.json(updated); } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  const denied = requireServiceAccess(request, "volunteers.manage"); if (denied) return denied;
  const id = request.nextUrl.searchParams.get("id"); if (!id) return NextResponse.json({ error: "Volunteer id is required." }, { status: 400 });
  try { const [existing] = await database().select({ id: volunteers.id, status: volunteers.status }).from(volunteers).where(eq(volunteers.id, id)).limit(1); if (!existing) return NextResponse.json({ error: "Volunteer not found." }, { status: 404 }); if (existing.status === "ACTIVE") return NextResponse.json({ error: "Active volunteers cannot be deleted. Mark the record INACTIVE or ALUMNI instead." }, { status: 422 }); await database().delete(volunteers).where(eq(volunteers.id, id)); return NextResponse.json({ ok: true }); } catch (error) { return apiError(error); }
}
