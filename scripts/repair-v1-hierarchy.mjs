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

// These are deliberately broad functional directorates so the V1 hierarchy has
// an explicit organisational parent without inventing project-level ownership.
// Existing directorates with the same codes are updated idempotently.
const directorates = [
  ["CEV", "Community Engagement & Volunteerism", "Community engagement, volunteerism and community-facing delivery."],
  ["EIE", "Enterprise, Innovation & Employability", "Entrepreneurship, innovation, employability and enterprise development."],
  ["MHSW", "Mental Health & Student Wellbeing", "Mental health, wellbeing and student support programmes."],
  ["GOV", "Governance, Policy & Advocacy", "Civic leadership, voter education, policy, advocacy and research."],
  ["CPRM", "Communications, Partnerships & Resource Mobilisation", "Communications, partnerships, fundraising, donor relations and knowledge mobilisation."],
  ["CASD", "Climate Action & Sustainable Development", "Climate action, environmental protection and sustainable development."],
];

// Programme -> Directorate mapping. Existing programme names/codes remain
// authoritative; this repair only establishes the missing parent relationship.
const programmeDirectorate = {
  CEV: "CEV",
  EIE: "EIE",
  MHSW: "MHSW",
  CLDG: "GOV",
  PAR: "GOV",
  E2E: "GOV",
  "E2E-2026": "GOV",
  VE26: "GOV",
  CASD: "CASD",
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
  });

  const [programmes] = await Promise.all([
    sql`SELECT code FROM programmes WHERE active = true AND directorate_id IS NULL ORDER BY code`,
  ]);

  if (programmes.length) {
    throw new Error(`Repair incomplete; unassigned active programmes: ${programmes.map((row) => row.code).join(", ")}`);
  }

  console.log("V1 hierarchy repair complete: every active programme now has a Directorate parent.");
} finally {
  await sql.end({ timeout: 5 });
}
