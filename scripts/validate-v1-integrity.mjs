import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("FAIL: DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const failures = [];
const fail = (message) => { failures.push(message); console.error(`FAIL: ${message}`); };

try {
  const orphanProgrammes = await sql`SELECT code, name FROM programmes WHERE active = true AND directorate_id IS NULL ORDER BY code`;
  for (const row of orphanProgrammes) fail(`Active programme ${row.code} (${row.name}) has no Directorate assignment`);

  const orphanProjects = await sql`SELECT p.code, p.name FROM projects p JOIN programmes pr ON pr.id = p.programme_id WHERE p.status <> 'CLOSED' AND pr.directorate_id IS NULL ORDER BY p.code`;
  for (const row of orphanProjects) fail(`Non-closed project ${row.code} (${row.name}) rolls through a programme with no Directorate`);

  const invalidBudgets = await sql`SELECT budget_code, level FROM finance_budgets WHERE
    (level = 'DIRECTORATE' AND (directorate_id IS NULL OR programme_id IS NOT NULL OR project_id IS NOT NULL OR activity_id IS NOT NULL))
    OR (level = 'PROGRAMME' AND (programme_id IS NULL OR directorate_id IS NOT NULL OR project_id IS NOT NULL OR activity_id IS NOT NULL))
    OR (level = 'PROJECT' AND (project_id IS NULL OR directorate_id IS NOT NULL OR programme_id IS NOT NULL OR activity_id IS NOT NULL))
    OR (level = 'ACTIVITY' AND (activity_id IS NULL OR directorate_id IS NOT NULL OR programme_id IS NOT NULL OR project_id IS NOT NULL))
    ORDER BY budget_code`;
  for (const row of invalidBudgets) fail(`Budget ${row.budget_code} violates its ${row.level} scope`);

  console.log(`Checked ${orphanProgrammes.length} orphaned active programmes, ${orphanProjects.length} orphaned non-closed projects, and ${invalidBudgets.length} invalid budget scopes.`);
  if (failures.length) {
    console.error(`V1 integrity validation failed with ${failures.length} issue(s).`);
    process.exit(1);
  }
  console.log("V1 integrity validation passed.");
} finally {
  await sql.end({ timeout: 5 });
}
