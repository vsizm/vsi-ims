import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  districts,
  indicators,
  provinces,
  results,
  targets
} from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { targetUpdateInput } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "indicators.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [target] = await database()
      .select({
        id: targets.id,
        createdAt: targets.createdAt,
        updatedAt: targets.updatedAt,
        indicatorId: targets.indicatorId,
        indicatorCode: indicators.code,
        indicatorName: indicators.name,
        year: targets.year,
        targetValue: targets.targetValue,
        provinceId: targets.provinceId,
        provinceCode: provinces.code,
        provinceName: provinces.name,
        districtId: targets.districtId,
        districtCode: districts.code,
        districtName: districts.name,
        notes: targets.notes
      })
      .from(targets)
      .innerJoin(indicators, eq(targets.indicatorId, indicators.id))
      .leftJoin(provinces, eq(targets.provinceId, provinces.id))
      .leftJoin(districts, eq(targets.districtId, districts.id))
      .where(eq(targets.id, id))
      .limit(1);

    if (!target) {
      return NextResponse.json(
        { error: "Target not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(target);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireServiceAccess(request, "indicators.manage");
  if (denied) return denied;

  const { id } = await params;
  const parsed = targetUpdateInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid target update", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const [existing] = await database()
      .select()
      .from(targets)
      .where(eq(targets.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Target not found." },
        { status: 404 }
      );
    }

    const indicatorId = parsed.data.indicatorId ?? existing.indicatorId;

    let provinceId =
      parsed.data.provinceId !== undefined
        ? parsed.data.provinceId
        : existing.provinceId;

    let districtId =
      parsed.data.districtId !== undefined
        ? parsed.data.districtId
        : existing.districtId;

    const [indicator] = await database()
      .select({ id: indicators.id })
      .from(indicators)
      .where(eq(indicators.id, indicatorId))
      .limit(1);

    if (!indicator) {
      return NextResponse.json(
        { error: "Indicator not found." },
        { status: 404 }
      );
    }

    if (provinceId) {
      const [provinceByCode] = await database()
        .select({ id: provinces.id })
        .from(provinces)
        .where(eq(provinces.code, provinceId))
        .limit(1);

      if (provinceByCode) {
        provinceId = provinceByCode.id;
      } else {
        const [provinceById] = await database()
          .select({ id: provinces.id })
          .from(provinces)
          .where(eq(provinces.id, provinceId))
          .limit(1);

        if (!provinceById) {
          return NextResponse.json(
            { error: `Province not found: ${provinceId}` },
            { status: 404 }
          );
        }

        provinceId = provinceById.id;
      }
    }

    if (districtId) {
      const [districtByCode] = await database()
        .select({
          id: districts.id,
          provinceId: districts.provinceId
        })
        .from(districts)
        .where(eq(districts.code, districtId))
        .limit(1);

      let district = districtByCode;

      if (!district) {
        const [districtById] = await database()
          .select({
            id: districts.id,
            provinceId: districts.provinceId
          })
          .from(districts)
          .where(eq(districts.id, districtId))
          .limit(1);

        district = districtById;
      }

      if (!district) {
        return NextResponse.json(
          { error: `District not found: ${districtId}` },
          { status: 404 }
        );
      }

      districtId = district.id;

      if (provinceId && district.provinceId !== provinceId) {
        return NextResponse.json(
          { error: "District must belong to the selected province." },
          { status: 409 }
        );
      }
    }

    const { targetValue, provinceId: _provinceId, districtId: _districtId, ...updateData } =
      parsed.data;

    const [updated] = await database()
      .update(targets)
      .set({
        ...updateData,
        provinceId,
        districtId,
        ...(targetValue !== undefined
          ? { targetValue: targetValue.toString() }
          : {}),
        updatedAt: new Date()
      })
      .where(eq(targets.id, id))
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
  const denied = requireServiceAccess(request, "indicators.manage");
  if (denied) return denied;

  const { id } = await params;

  try {
    const [target] = await database()
      .select({ id: targets.id })
      .from(targets)
      .where(eq(targets.id, id))
      .limit(1);

    if (!target) {
      return NextResponse.json(
        { error: "Target not found." },
        { status: 404 }
      );
    }

    const [result] = await database()
      .select({ id: results.id })
      .from(results)
      .where(eq(results.targetId, id))
      .limit(1);

    if (result) {
      return NextResponse.json(
        { error: "Target cannot be deleted while it has results." },
        { status: 409 }
      );
    }

    await database()
      .delete(targets)
      .where(eq(targets.id, id));

    return NextResponse.json({
      deleted: true,
      id
    });
  } catch (error) {
    return apiError(error);
  }
}
