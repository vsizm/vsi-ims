import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { results } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { resultInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "results.read"); if (denied) return denied;
  try { return NextResponse.json(await database().select().from(results).orderBy(desc(results.periodEnd))); }
  catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "results.manage"); if (denied) return denied;
  const parsed = resultInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error:"Invalid result", details:parsed.error.flatten() }, { status:422 });
  try { const [created] = await database().insert(results).values(parsed.data).returning(); return NextResponse.json(created,{status:201}); }
  catch (error) { return apiError(error); }
}
