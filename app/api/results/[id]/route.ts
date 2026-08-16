import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  indicators,
  results,
  targets
} from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { resultUpdateInput } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "results.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [result] = await database()
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
      .where(eq(results.id, id))
      .limit(1);

    if (!result) {
      return NextResponse.json(
        { error: "Result not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "results.manage");
  if (denied) return denied;

  const { id } = await params;
  const parsed = resultUpdateInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid result update", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const [existing] = await database()
      .select()
      .from(results)
      .where(eq(results.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Result not found." },
        { status: 404 }
      );
    }

    if (parsed.data.targetId) {
      const [target] = await database()
        .select({ id: targets.id })
        .from(targets)
        .where(eq(targets.id, parsed.data.targetId))
        .limit(1);

      if (!target) {
        return NextResponse.json(
          { error: "Target not found." },
          { status: 404 }
        );
      }
    }

    const { actualValue, ...updateData } = parsed.data;

    const [updated] = await database()
      .update(results)
      .set({
        ...updateData,
        ...(actualValue !== undefined
          ? { actualValue: actualValue.toString() }
          : {}),
        updatedAt: new Date()
      })
      .where(eq(results.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "results.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [result] = await database()
      .select({ id: results.id })
      .from(results)
      .where(eq(results.id, id))
      .limit(1);

    if (!result) {
      return NextResponse.json(
        { error: "Result not found." },
        { status: 404 }
      );
    }

    await database()
      .delete(results)
      .where(eq(results.id, id));

    return NextResponse.json({
      deleted: true,
      id
    });
  } catch (error) {
    return apiError(error);
  }
}
