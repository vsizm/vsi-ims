import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { beneficiaries, districts, interventionParticipants, interventions } from "@/db/schema";
import { VSI_2030_BENEFICIARY_TARGET, vsi2030DistrictTargets } from "@/lib/v1-master-data";

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "reports.read");
  if (denied) return denied;

  try {
    const rows = await database()
      .select({
        districtCode: districts.code,
        beneficiaryCount: sql<number>`count(distinct ${interventionParticipants.beneficiaryId})`
      })
      .from(interventionParticipants)
      .innerJoin(interventions, eq(interventionParticipants.interventionId, interventions.id))
      .innerJoin(beneficiaries, eq(interventionParticipants.beneficiaryId, beneficiaries.id))
      .innerJoin(districts, eq(interventions.districtId, districts.id))
      .where(eq(beneficiaries.active, true))
      .groupBy(districts.code);

    const actualByDistrict = new Map(rows.map((row) => [row.districtCode, Number(row.beneficiaryCount)]));
    const districtsReport = vsi2030DistrictTargets.map((target) => {
      const actual = actualByDistrict.get(target.districtCode) ?? 0;
      return {
        provinceCode: target.provinceCode,
        districtCode: target.districtCode,
        districtName: target.districtName,
        target2030: target.target,
        actualUniqueBeneficiaries: actual,
        progressPercent: target.target === 0 ? 0 : Number(((actual / target.target) * 100).toFixed(2))
      };
    });

    const actualTotal = districtsReport.reduce((sum, row) => sum + row.actualUniqueBeneficiaries, 0);

    return NextResponse.json({
      year: 2030,
      target: VSI_2030_BENEFICIARY_TARGET,
      actualUniqueBeneficiaries: actualTotal,
      progressPercent: Number(((actualTotal / VSI_2030_BENEFICIARY_TARGET) * 100).toFixed(2)),
      districts: districtsReport
    });
  } catch (error) {
    return apiError(error);
  }
}
