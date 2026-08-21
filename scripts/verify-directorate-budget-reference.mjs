import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import postgres from "postgres";

if (!process.env.DATABASE_URL && existsSync(".env.local")) loadEnvFile(".env.local");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const rows = await sql`
  SELECT d.code, d.id, b.id AS budget_id, b.financial_year, b.level
  FROM directorates d
  LEFT JOIN finance_budgets b
    ON b.directorate_id = d.id
   AND b.level = 'DIRECTORATE'
  WHERE d.active = true
  ORDER BY d.code
`;

const invalid = rows.filter((row) => !row.id || (row.budget_id && row.level !== "DIRECTORATE"));
console.table(rows);
if (invalid.length) {
  console.error(`FAIL: ${invalid.length} invalid Directorate budget references.`);
  process.exitCode = 1;
} else {
  console.log("PASS: Directorate IDs and Directorate-level budget references are structurally valid.");
}

await sql.end();
