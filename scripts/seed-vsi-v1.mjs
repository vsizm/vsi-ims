import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const provinces = [
  ["LUS", "Lusaka"], ["CB", "Copperbelt"], ["SO", "Southern"], ["EA", "Eastern"],
  ["CE", "Central"], ["NW", "North-Western"], ["NO", "Northern"], ["WE", "Western"]
];

const districts = [
  ["LUS", "LUSAKA", "Lusaka"], ["CB", "KITWE", "Kitwe"], ["SO", "LIVINGSTONE", "Livingstone"],
  ["CB", "NDOLA", "Ndola"], ["EA", "CHIPATA", "Chipata"], ["CE", "KABWE", "Kabwe"],
  ["CB", "CHINGOLA", "Chingola"], ["NW", "SOLWEZI", "Solwezi"], ["NO", "KASAMA", "Kasama"],
  ["CB", "MUFULIRA", "Mufulira"], ["WE", "MONGU", "Mongu"], ["SO", "CHOMA", "Choma"]
];

const districtTargets = {
  LUSAKA: 15000, KITWE: 10000, LIVINGSTONE: 7000, NDOLA: 10000, CHIPATA: 8000, KABWE: 8000,
  CHINGOLA: 8000, SOLWEZI: 8000, KASAMA: 7000, MUFULIRA: 6000, MONGU: 6000, CHOMA: 7000
};

const projects = [
  ["CEV", "Community Engagement and Volunteerism", "CEV-VMP", "Volunteer Management Project"],
  ["CEV", "Community Engagement and Volunteerism", "CEV-CSVP", "Community Service and Volunteerism Project"],
  ["EIE", "Entrepreneurship, Innovation and Employability", "EIE-AAP", "Agriculture and Agro-processing Project"],
  ["EIE", "Entrepreneurship, Innovation and Employability", "EIE-TIEP", "Technology and Innovation Entrepreneurship Project"],
  ["MHSW", "Mental Health and Student Wellbeing", "MHSW-MHRP", "Mental Health Resilience Project"],
  ["MHSW", "Mental Health and Student Wellbeing", "MHSW-SPP", "Suicide Prevention Project"],
  ["CASD", "Climate Action and Sustainable Development", "CASD-KZCGH", "Keep Zambia Clean, Green and Healthy Project"],
  ["CLDG", "Civic Leadership and Democratic Governance", "CLDG-NVPA", "National Values and Principles Awareness Project"],
  ["CLDG", "Civic Leadership and Democratic Governance", "CLDG-VEP", "Voter Education Project"],
  ["PAR", "Policy, Advocacy and Research", "PAR-PREG", "Policy Research and Evidence Generation"],
  ["PAR", "Policy, Advocacy and Research", "PAR-RPK", "Research Publications and Knowledge"],
  ["PAR", "Policy, Advocacy and Research", "PAR-EBA", "Evidence-Based Advocacy"],
  ["PAR", "Policy, Advocacy and Research", "PAR-PLE", "Policy and Legislative Engagement"],
  ["PAR", "Policy, Advocacy and Research", "PAR-PDP", "Policy Dialogue Project"],
  ["PAR", "Policy, Advocacy and Research", "PAR-SYPP", "Student and Youth Policy Participation"],
  ["CPRM", "Communications, Partnerships and Resource Mobilisation", "CPRM-VPIA", "VSI Public Information and Awareness"],
  ["CPRM", "Communications, Partnerships and Resource Mobilisation", "CPRM-DCM", "Digital Communications and Media"],
  ["CPRM", "Communications, Partnerships and Resource Mobilisation", "CPRM-PKD", "Publications and Knowledge Dissemination"],
  ["CPRM", "Communications, Partnerships and Resource Mobilisation", "CPRM-SPD", "Strategic Partnerships Development"],
  ["CPRM", "Communications, Partnerships and Resource Mobilisation", "CPRM-SEE", "Stakeholder Engagement and Events"],
  ["CPRM", "Communications, Partnerships and Resource Mobilisation", "CPRM-FRM", "Fundraising and Resource Mobilisation"],
  ["CPRM", "Communications, Partnerships and Resource Mobilisation", "CPRM-GDR", "Grants and Donor Relations"]
];

try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const provinceIds = new Map();
  for (const [code, name] of provinces) {
    const rows = await sql`INSERT INTO provinces (code, name, active) VALUES (${code}, ${name}, true)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
    provinceIds.set(code, rows[0].id);
  }

  for (const [provinceCode, code, name] of districts) {
    await sql`INSERT INTO districts (province_id, code, name, active) VALUES (${provinceIds.get(provinceCode)}, ${code}, ${name}, true)
      ON CONFLICT (code) DO UPDATE SET province_id = EXCLUDED.province_id, name = EXCLUDED.name`;
  }

  const programmeIds = new Map();
  for (const [code, name] of [...new Map(projects.map(([p, n]) => [p, n])).entries()]) {
    const rows = await sql`INSERT INTO programmes (code, name, objective, active) VALUES (${code}, ${name}, ${`VSI ${name} programme delivery and outcomes`}, true)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
    programmeIds.set(code, rows[0].id);
  }

  for (const [programmeCode, programmeName, code, name] of projects) {
    await sql`INSERT INTO projects (programme_id, code, name, objective, status) VALUES (${programmeIds.get(programmeCode)}, ${code}, ${name}, ${`Deliver the ${name} workstream and its approved VSI outcomes`}, 'DRAFT')
      ON CONFLICT (code) DO UPDATE SET programme_id = EXCLUDED.programme_id, name = EXCLUDED.name`;
  }

  const total = Object.values(districtTargets).reduce((sum, value) => sum + value, 0);
  if (total !== 100000) throw new Error(`2030 district allocation must equal 100000; got ${total}`);

  console.log(`Verified ${districts.length} districts, ${projects.length} projects, and 100,000 unique-beneficiary target allocation.`);
} finally {
  await sql.end({ timeout: 5 });
}
