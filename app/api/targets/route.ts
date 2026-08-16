import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  districts,
  indicators,
  provinces,
  targets
} from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { targetInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "indicators.manage");
  if (denied) return denied;

  try {
    const rows = await database()
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
      .orderBy(desc(targets.year), desc(targets.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "indicators.manage");
  if (denied) return denied;

  const parsed = targetInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid target", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const [indicator] = await database()
      .select({ id: indicators.id })
      .from(indicators)
      .where(eq(indicators.id, parsed.data.indicatorId))
      .limit(1);

    if (!indicator) {
      return NextResponse.json(
        { error: "Indicator not found." },
        { status: 404 }
      );
    }

    let provinceId: string | null = null;
    let districtId: string | null = null;

    if (parsed.data.provinceId) {
      const [province] = await database()
        .select({ id: provinces.id })
        .from(provinces)
        .where(
          eq(provinces.code, parsed.data.provinceId)
        )
        .limit(1);

      if (province) {
        provinceId = province.id;
      } else {
        const [provinceById] = await database()
          .select({ id: provinces.id })
          .from(provinces)
          .where(eq(provinces.id, parsed.data.provinceId))
          .limit(1);

        if (!provinceById) {
          return NextResponse.json(
            { error: `Province not found: ${parsed.data.provinceId}` },
            { status: 404 }
          );
        }

        provinceId = provinceById.id;
      }
    }

    if (parsed.data.districtId) {
      const [district] = await database()
        .select({
          id: districts.id,
          provinceId: districts.provinceId
        })
        .from(districts)
        .where(
          eq(districts.code, parsed.data.districtId)
        )
        .limit(1);

      let districtProvinceId: string | null = null;

      if (district) {
        districtId = district.id;
        districtProvinceId = district.provinceId;
      } else {
        const [districtById] = await database()
          .select({
            id: districts.id,
            provinceId: districts.provinceId
          })
          .from(districts)
          .where(eq(districts.id, parsed.data.districtId))
          .limit(1);

        if (!districtById) {
          return NextResponse.json(
            { error: `District not found: ${parsed.data.districtId}` },
            { status: 404 }
          );
        }

        districtId = districtById.id;
        districtProvinceId = districtById.provinceId;
      }

      if (provinceId && districtProvinceId !== provinceId) {
        return NextResponse.json(
          { error: "District must belong to the selected province." },
          { status: 409 }
        );
      }
    }

    const [created] = await database()
      .insert(targets)
      .values({
        indicatorId: parsed.data.indicatorId,
        year: parsed.data.year,
        targetValue: parsed.data.targetValue.toString(),
        provinceId,
        districtId,
        notes: parsed.data.notes
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
