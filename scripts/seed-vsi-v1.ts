import { eq } from "drizzle-orm";
import { database } from "@/lib/db";
import { districts, programmes, projects, provinces } from "@/db/schema";
import { vsi2030DistrictTargets, vsiProgrammeProjects } from "@/lib/v1-master-data";

const db = database();

const provinceNames: Record<string, string> = {
  LUS: "Lusaka",
  CB: "Copperbelt",
  SO: "Southern",
  EA: "Eastern",
  CE: "Central",
  NW: "North-Western",
  NO: "Northern",
  WE: "Western"
};

async function ensureProvince(code: string, name: string) {
  const existing = await db.select().from(provinces).where(eq(provinces.code, code)).limit(1);
  if (existing[0]) {
    if (existing[0].name !== name) throw new Error(`Province code ${code} is already assigned to ${existing[0].name}`);
    return existing[0];
  }
  const [created] = await db.insert(provinces).values({ code, name, active: true }).returning();
  return created;
}

async function ensureDistrict(provinceId: string, code: string, name: string) {
  const existing = await db.select().from(districts).where(eq(districts.code, code)).limit(1);
  if (existing[0]) {
    if (existing[0].provinceId !== provinceId || existing[0].name !== name) {
      throw new Error(`District code ${code} conflicts with existing geography data`);
    }
    return existing[0];
  }
  const [created] = await db.insert(districts).values({ provinceId, code, name, active: true }).returning();
  return created;
}

async function ensureProgramme(code: string, name: string) {
  const existing = await db.select().from(programmes).where(eq(programmes.code, code)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(programmes).values({
    code,
    name,
    objective: `VSI ${name} programme delivery and outcomes`,
    active: true
  }).returning();
  return created;
}

async function ensureProject(programmeId: string, code: string, name: string) {
  const existing = await db.select().from(projects).where(eq(projects.code, code)).limit(1);
  if (existing[0]) {
    if (existing[0].programmeId !== programmeId) throw new Error(`Project code ${code} belongs to another programme`);
    return existing[0];
  }
  const [created] = await db.insert(projects).values({
    programmeId,
    code,
    name,
    objective: `Deliver the ${name} workstream and its approved VSI outcomes`,
    status: "DRAFT"
  }).returning();
  return created;
}

async function main() {
  for (const [code, name] of Object.entries(provinceNames)) await ensureProvince(code, name);

  for (const item of vsi2030DistrictTargets) {
    const province = await ensureProvince(item.provinceCode, provinceNames[item.provinceCode]);
    await ensureDistrict(province.id, item.districtCode, item.districtName);
  }

  for (const item of vsiProgrammeProjects) {
    const programme = await ensureProgramme(item.programmeCode, item.programmeName);
    await ensureProject(programme.id, item.projectCode, item.projectName);
  }

  console.log(`Seeded/verified ${vsi2030DistrictTargets.length} priority districts and ${vsiProgrammeProjects.length} projects across the 7 VSI programmes.`);
  console.log("VSI 2030 unique-beneficiary target: 100,000 across the 12 agreed districts.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
