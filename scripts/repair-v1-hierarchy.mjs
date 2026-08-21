import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    try { loadEnvFile(file); } catch {}
    if (process.env.DATABASE_URL) break;
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required (set it in the shell, .env.local, or .env)");
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

// VSI's IMS operating model is intentionally lean. Programmes and CPRM are
// the primary organisational engines; MEAL, Finance/Admin, Policy/Advocacy,
// Legal/Compliance and Operations are enabling/support functions.
const directorates = [
  ["PROG", "Directorate of Programmes", "Primary programme, project and activity delivery."],
  ["CPRM", "Directorate of Communications, Partnerships & Resource Mobilisation", "Strategic communications, partnerships, fundraising, donor relations and resource mobilisation."],
  ["PAR", "Directorate of Policy, Advocacy & Research", "Policy, advocacy, research, evidence and institutional influence."],
  ["MEAL", "Directorate of Monitoring, Evaluation, Accountability & Learning", "Performance measurement, learning, accountability, reporting and evidence."],
  ["FIN_ADMIN", "Directorate of Finance & Administration", "Financial management, administration, controls and organisational support."],
  ["LEGAL_COMP", "Directorate of Legal & Compliance", "Legal, regulatory, governance and compliance support."],
  ["OPS", "Directorate of Operations & Field Delivery", "Operational coordination, logistics and field implementation support."],
];

// Existing programme codes remain authoritative. This repair only changes
// their organisational parent and deactivates legacy thematic directorates;
// it does not delete records or alter programme/project/activity ownership.
const programmeDirectorate = {
  CEV: "PROG",
  EIE: "PROG",
  MHSW: "PROG",
  CASD: "PROG",
  CLDG: "PAR",
  PAR: "PAR",
  VE26: "PAR",
  E2E: "PAR",
  "E2E-2026": "PAR",
  CPRM: "CPRM",
};

try {
  await sql.begin(async (tx) => {
    const ids = new Map();

    for (const [code, name, description] of directorates) {
      const rows = await tx`
        INSERT INTO directorates (code, name, description, active)
        VALUES (${code}, ${name}, ${description}, true)
        ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              active = true,
              updated_at = now()
        RETURNING id
      `;
      ids.set(code, rows[0].id);
    }

    for (const [programmeCode, directorateCode] of Object.entries(programmeDirectorate)) {
      const directorateId = ids.get(directorateCode);
      if (!directorateId) throw new Error(`Missing repair directorate ${directorateCode}`);

      await tx`
        UPDATE programmes
        SET directorate_id = ${directorateId}, updated_at = now()
        WHERE code = ${programmeCode} AND active = true
      `;
    }

    // Preserve legacy data for audit/history, but remove it from the active
    // organisational structure shown to users.
    await tx`
      UPDATE directorates
      SET active = false, updated_at = now()
      WHERE active = true
        AND code NOT IN (${sql.unsafe(directorates.map(([code]) => `'${code}'`).join(","))})
    `;
  });

  const [orphans] = await Promise.all([
    sql`SELECT code FROM programmes WHERE active = true AND directorate_id IS NULL ORDER BY code`,
  ]);

  if (orphans.length) {
    throw new Error(`Repair incomplete; unassigned active programmes: ${orphans.map((row) => row.code).join(", ")}`);
  }

  console.log("VSI V1 hierarchy repair complete: active structure is limited to the agreed seven functional Directorates.");
} finally {
  await sql.end({ timeout: 5 });
}
