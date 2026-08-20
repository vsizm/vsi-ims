import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

const TARGET = 100_000;

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "beneficiaries.read");
  if (denied) return denied;

  try {
    const overall = await database().execute(sql`
      select count(distinct ip.beneficiary_id)::int as unique_beneficiaries
      from intervention_participants ip
      inner join beneficiaries b on b.id = ip.beneficiary_id
      inner join interventions i on i.id = ip.intervention_id
      where b.active = true
    `);

    const districtRows = await database().execute(sql`
      select
        d.id,
        d.code,
        d.name,
        count(distinct ip.beneficiary_id)::int as unique_beneficiaries
      from districts d
      left join beneficiaries b on b.district_id = d.id and b.active = true
      left join intervention_participants ip on ip.beneficiary_id = b.id
      group by d.id, d.code, d.name
      order by d.name
    `);

    const uniqueBeneficiaries = Number(overall.rows[0]?.unique_beneficiaries ?? 0);
    return NextResponse.json({
      target: TARGET,
      uniqueBeneficiaries,
      remaining: Math.max(TARGET - uniqueBeneficiaries, 0),
      progressPercent: Number(((uniqueBeneficiaries / TARGET) * 100).toFixed(2)),
      districts: districtRows.rows,
      methodology: "Unique beneficiary IDs from authoritative intervention participation records; repeat participation is counted once.",
    });
  } catch (error) {
    return apiError(error);
  }
}
