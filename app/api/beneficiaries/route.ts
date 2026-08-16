import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  beneficiaries,
  deliverySites,
  districts,
  provinces
} from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { beneficiaryInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "beneficiaries.write");
  if (denied) return denied;

  try {
    const rows = await database()
      .select({
        id: beneficiaries.id,
        createdAt: beneficiaries.createdAt,
        updatedAt: beneficiaries.updatedAt,
        beneficiaryCode: beneficiaries.beneficiaryCode,
        fullName: beneficiaries.fullName,
        dateOfBirth: beneficiaries.dateOfBirth,
        ageGroup: beneficiaries.ageGroup,
        sex: beneficiaries.sex,
        pwd: beneficiaries.pwd,
        provinceId: beneficiaries.provinceId,
        provinceCode: provinces.code,
        provinceName: provinces.name,
        districtId: beneficiaries.districtId,
        districtCode: districts.code,
        districtName: districts.name,
        deliverySiteId: beneficiaries.deliverySiteId,
        deliverySiteName: deliverySites.name,
        active: beneficiaries.active
      })
      .from(beneficiaries)
      .leftJoin(provinces, eq(beneficiaries.provinceId, provinces.id))
      .leftJoin(districts, eq(beneficiaries.districtId, districts.id))
      .leftJoin(deliverySites, eq(beneficiaries.deliverySiteId, deliverySites.id))
      .orderBy(desc(beneficiaries.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = requireServiceAccess(request, "beneficiaries.write");
  if (denied) return denied;

  const parsed = beneficiaryInput.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid beneficiary", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const {
      provinceId,
      districtId,
      deliverySiteId
    } = parsed.data;

    if (provinceId) {
      const [province] = await database()
        .select({ id: provinces.id })
        .from(provinces)
        .where(eq(provinces.id, provinceId))
        .limit(1);

      if (!province) {
        return NextResponse.json(
          { error: "Province not found." },
          { status: 404 }
        );
      }
    }

    if (districtId) {
      const [district] = await database()
        .select({
          id: districts.id,
          provinceId: districts.provinceId
        })
        .from(districts)
        .where(eq(districts.id, districtId))
        .limit(1);

      if (!district) {
        return NextResponse.json(
          { error: "District not found." },
          { status: 404 }
        );
      }

      if (provinceId && district.provinceId !== provinceId) {
        return NextResponse.json(
          { error: "District must belong to the selected province." },
          { status: 409 }
        );
      }
    }

    if (deliverySiteId) {
      const [site] = await database()
        .select({
          id: deliverySites.id,
          districtId: deliverySites.districtId
        })
        .from(deliverySites)
        .where(eq(deliverySites.id, deliverySiteId))
        .limit(1);

      if (!site) {
        return NextResponse.json(
          { error: "Delivery site not found." },
          { status: 404 }
        );
      }

      if (districtId && site.districtId !== districtId) {
        return NextResponse.json(
          { error: "Delivery site must belong to the selected district." },
          { status: 409 }
        );
      }
    }

    const [existing] = await database()
      .select({ id: beneficiaries.id })
      .from(beneficiaries)
      .where(eq(beneficiaries.beneficiaryCode, parsed.data.beneficiaryCode))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Beneficiary code already exists." },
        { status: 409 }
      );
    }

    const [created] = await database()
      .insert(beneficiaries)
      .values(parsed.data)
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
