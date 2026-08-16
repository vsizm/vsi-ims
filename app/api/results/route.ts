import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  indicators,
  results,
  targets
} from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { resultInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "results.manage");
  if (denied) return denied;

  try {
    const rows = await database()
      .select({
        id: results.id,
        createdAt: results.createdAt,
        updatedAt: results.updatedAt,
        targetId: results.targetId,
        indicatorId: targets.indicatorId,
        indicatorCode: indicators.code,
        indicatorName: indicators.name,
        targetYear: targets.year,
        targetValue: targets.targetValue,
        periodStart: results.periodStart,
        periodEnd: results.periodEnd,
        actualValue: results.actualValue,
        notes: results.notes
      })
      .from(results)
      .innerJoin(targets, eq(results.targetId, targets.id))
      .innerJoin(indicators, eq(targets.indicatorId, indicators.id))
      .orderBy(desc(results.periodEnd), desc(results.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "results.manage");
  if (denied) return denied;

  const parsed = resultInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid result", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const [target] = await database()
      .select({
        id: targets.id,
        indicatorId: targets.indicatorId
      })
      .from(targets)
      .where(eq(targets.id, parsed.data.targetId))
      .limit(1);

    if (!target) {
      return NextResponse.json(
        { error: "Target not found." },
        { status: 404 }
      );
    }

    const [created] = await database()
      .insert(results)
      .values({
        ...parsed.data,
        actualValue: parsed.data.actualValue.toString()
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
