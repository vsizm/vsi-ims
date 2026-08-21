import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import postgres from "postgres";

// Keep the validator runnable from Codespaces/local shells where DATABASE_URL
// lives in the project's local env file rather than the exported shell.
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
const failures = [];
const expectedDirectorates = ["PROG", "CPRM", "PAR", "MEAL", "FIN_ADMIN", "LEGAL_COMP", "OPS"];

function fail(message) {
  failures.push(message);
  console.error(`FAIL: ${message}`);
}

try {
  const [activeDirectorates] = await Promise.all([
    sql`SELECT code, name FROM directorates WHERE active = true ORDER BY code`,
  ]);

  const actualCodes = activeDirectorates.map((row) => row.code);
  const missingDirectorates = expectedDirectorates.filter((code) => !actualCodes.includes(code));
  const unexpectedDirectorates = actualCodes.filter((code) => !expectedDirectorates.includes(code));

  for (const code of missingDirectorates) fail(`Required active Directorate ${code} is missing`);
  for (const code of unexpectedDirectorates) fail(`Unexpected active Directorate ${code} is present`);
  if (actualCodes.length === expectedDirectorates.length && failures.length === 0) {
    console.log("PASS: active Directorate structure matches the agreed seven-function VSI operating model.");
  }

  const [orphanProgrammes] = await Promise.all([
    sql`SELECT code, name FROM programmes WHERE active = true AND directorate_id IS NULL ORDER BY code`,
  ]);

  for (const row of orphanProgrammes) fail(`Active programme ${row.code} (${row.name}) has no Directorate assignment`);

  const [orphanProjects] = await Promise.all([
    sql`SELECT p.code, p.name FROM projects p JOIN programmes pr ON pr.id = p.programme_id WHERE p.status <> 'CLOSED' AND pr.directorate_id IS NULL ORDER BY p.code`,
  ]);

  for (const row of orphanProjects) fail(`Active/non-closed project ${row.code} (${row.name}) rolls up through a programme with no Directorate`);

  const [invalidBudgets] = await Promise.all([
    sql`SELECT budget_code, level FROM finance_budgets WHERE
      (level = 'DIRECTORATE' AND (directorate_id IS NULL OR programme_id IS NOT NULL OR project_id IS NOT NULL OR activity_id IS NOT NULL))
      OR (level = 'PROGRAMME' AND (programme_id IS NULL OR directorate_id IS NOT NULL OR project_id IS NOT NULL OR activity_id IS NOT NULL))
      OR (level = 'PROJECT' AND (project_id IS NULL OR directorate_id IS NOT NULL OR programme_id IS NOT NULL OR activity_id IS NOT NULL))
      OR (level = 'ACTIVITY' AND (activity_id IS NULL OR directorate_id IS NOT NULL OR programme_id IS NOT NULL OR project_id IS NOT NULL))
      ORDER BY budget_code`,
  ]);

  for (const row of invalidBudgets) fail(`Budget ${row.budget_code} violates its ${row.level} scope`);

  const [projectParentErrors] = await Promise.all([
    sql`SELECT p.code, p.name FROM projects p JOIN programmes pr ON pr.id = p.programme_id WHERE pr.directorate_id IS NULL AND p.status <> 'CLOSED' ORDER BY p.code`,
  ]);

  if (projectParentErrors.length === 0) console.log("PASS: every non-closed project rolls through a Directorate-assigned programme.");

  console.log(`Checked ${activeDirectorates.length} active Directorates, ${orphanProgrammes.length} Directorate-orphaned programmes, ${orphanProjects.length} hierarchy-orphaned projects, and ${invalidBudgets.length} invalid budget scopes.`);

  if (failures.length) {
    console.error(`\nV1 integrity validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("V1 integrity validation passed.");
  }
} finally {
  await sql.end({ timeout: 5 });
}
