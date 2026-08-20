import dotenv from "dotenv"; dotenv.config({ path: ".env.local" });
async function main() {
const BASE = process.env.VSI_SEED_BASE_URL ?? "http://localhost:3000/api";
const EMAIL = process.env.VSI_AUTH_EMAIL;
const PASSWORD = process.env.VSI_SEED_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error("VSI_AUTH_EMAIL and VSI_SEED_PASSWORD must be set.");
}

const login = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  }),
});

if (!login.ok) {
  throw new Error(`Login failed: ${login.status} ${await login.text()}`);
}

const cookie = login.headers.get("set-cookie");
if (!cookie) throw new Error("No session cookie returned.");

async function api(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Cookie", cookie!);

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${path} -> ${response.status}: ${text}`
    );
  }

  return text ? JSON.parse(text) : null;
}

const programmes = [
  {
    code: "CEV",
    name: "Community Engagement and Volunteerism",
    objective: "Strengthen volunteerism, community service, student engagement, community mobilisation and social responsibility.",
    projects: [
      ["CEV-VMP", "Volunteer Management Project", "Volunteer recruitment, induction, training, development, deployment, coordination, recognition and retention."],
      ["CEV-CSVP", "Community Service and Volunteerism Project", "Community service, school and community outreach, student volunteer activities, community mobilisation, development activities and social responsibility."],
    ],
  },
  {
    code: "EIE",
    name: "Entrepreneurship, Innovation and Employability",
    objective: "Build practical skills, entrepreneurship, innovation capacity, employability and pathways to enterprise development.",
    projects: [
      ["EIE-AAP", "Agriculture and Agro-processing Project", "Agriculture skills training, agro-processing training, practical demonstrations, entrepreneurship development, value-chain development, market linkage and youth mentorship."],
      ["EIE-TIEP", "Technology and Innovation Entrepreneurship Project", "Digital skills, technology skills development, innovation training, entrepreneurship training, innovation challenges, enterprise development and mentorship."],
    ],
  },
  {
    code: "MHSW",
    name: "Mental Health and Student Wellbeing",
    objective: "Promote mental health awareness, psychosocial wellbeing, resilience, prevention, peer support and appropriate referral pathways.",
    projects: [
      ["MHSW-MHRP", "Mental Health Resilience Project", "Mental health awareness, psychosocial wellbeing education, resilience building, stress-management education, peer support, healthy-learning-environment activities and referral/support linkages."],
      ["MHSW-SPP", "Suicide Prevention Project", "Suicide-prevention awareness, risk awareness, prevention education, peer support, referral pathways and school/community awareness."],
    ],
  },
  {
    code: "CASD",
    name: "Climate Action and Sustainable Development",
    objective: "Advance environmental awareness, climate action, sustainable development, community stewardship and healthy communities.",
    projects: [
      ["CASD-KZCGH", "Keep Zambia Clean, Green and Healthy Project", "Environmental awareness, community clean-ups, waste-management awareness, tree planting, environmental stewardship, climate awareness, community mobilisation and sustainable-development education."],
    ],
  },
  {
    code: "CLDG",
    name: "Civic Leadership and Democratic Governance",
    objective: "Strengthen responsible citizenship, civic knowledge, constitutional literacy, ethical leadership and democratic participation.",
    projects: [
      ["CLDG-NVPA", "National Values and Principles Awareness Project", "National-values awareness, responsible citizenship, constitutional literacy, ethical-leadership sessions, student dialogues, community dialogues and public-awareness campaigns."],
      ["CLDG-VEP", "Voter Education Project", "Voter education, civic education, electoral awareness, voter-registration awareness, democratic-participation education and community civic dialogues."],
    ],
  },
  {
    code: "PAR",
    name: "Policy, Advocacy and Research",
    objective: "Generate evidence, strengthen policy engagement and advocacy, and provide platforms for informed policy dialogue and participation.",
    projects: [
      ["PAR-PREG", "Policy Research and Evidence Generation", "Research studies, surveys, assessments, data collection, data analysis, policy analysis, evidence generation and research dissemination."],
      ["PAR-RPK", "Research Publications and Knowledge", "Research reports, policy briefs, discussion papers, technical papers, State of Students reports, research summaries and knowledge products."],
      ["PAR-EBA", "Evidence-Based Advocacy", "Advocacy issue identification, evidence development, policy dialogues, stakeholder consultations, public awareness, coalition building, media engagement, advocacy campaigns and policy recommendations."],
      ["PAR-PLE", "Policy and Legislative Engagement", "Legislative monitoring, policy monitoring, analysis of proposed legislation, policy positions, technical submissions, government engagement and parliamentary engagement."],
      ["PAR-PDP", "Policy Dialogue Project", "Policy roundtables, stakeholder consultations, public forums, conferences, workshops, seminars and expert dialogues."],
      ["PAR-SYPP", "Student and Youth Policy Participation", "Student consultations, youth consultations, youth policy forums, student policy dialogues, public-policy discussions and youth participation platforms."],
    ],
  },
  {
    code: "CPRM",
    name: "Communications, Partnerships and Resource Mobilisation",
    objective: "Strengthen strategic communications, stakeholder partnerships, knowledge dissemination and sustainable resource mobilisation.",
    projects: [
      ["CPRM-VPIA", "VSI Public Information and Awareness", "Public-awareness campaigns, programme communication, public information, media engagement, press releases and public relations."],
      ["CPRM-DCM", "Digital Communications and Media", "Website content, social media, digital campaigns, photography, videography, graphic design, multimedia production and digital audience engagement."],
      ["CPRM-PKD", "Publications and Knowledge Dissemination", "Newsletters, annual reports, programme publications, research summaries, success stories, knowledge products and public dissemination."],
      ["CPRM-SPD", "Strategic Partnerships Development", "Partner identification, stakeholder mapping, partnership development, institutional collaboration, MoUs, partner engagement and partnership reviews."],
      ["CPRM-SEE", "Stakeholder Engagement and Events", "Stakeholder forums, conferences, workshops, institutional meetings, public events, networking and campaign events."],
      ["CPRM-FRM", "Fundraising and Resource Mobilisation", "Funding-opportunity identification, concept development, proposal development, fundraising campaigns, donor engagement and resource mobilisation."],
      ["CPRM-GDR", "Grants and Donor Relations", "Grant-pipeline management, grant applications, grant negotiations, donor stewardship, grant reporting and donor visibility."],
    ],
  },
];

const existing = await api("/programmes") as Array<{
  id: string;
  code: string;
}>;

const programmeIds = new Map(
  existing.map((programme) => [programme.code, programme.id])
);

for (const programme of programmes) {
  let programmeId = programmeIds.get(programme.code);

  if (!programmeId) {
    const created = await api("/programmes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: programme.code,
        name: programme.name,
        objective: programme.objective,
      }),
    });

    programmeId = created.id;
    console.log(`CREATED PROGRAMME: ${programme.code}`);
  } else {
    console.log(`EXISTS PROGRAMME: ${programme.code}`);
  }

  const existingProjects = await api("/projects") as Array<{
    id: string;
    programmeId: string;
    code: string;
  }>;

  const projectCodes = new Set(
    existingProjects
      .filter((project) => project.programmeId === programmeId)
      .map((project) => project.code)
  );

  for (const [code, name, objective] of programme.projects) {
    if (projectCodes.has(code)) {
      console.log(`  EXISTS PROJECT: ${code}`);
      continue;
    }

    await api("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programmeId,
        code,
        name,
        objective,
      }),
    });

    console.log(`  CREATED PROJECT: ${code}`);
  }
}


// ===== V1 DIRECT-BENEFICIARY TARGET BASELINE =====

const directBeneficiaryTargets = [
  ["CEV-VMP", "CEV-VMP-DIRBEN", "Direct beneficiaries reached through Volunteer Management", 5000],
  ["CEV-CSVP", "CEV-CSVP-DIRBEN", "Direct beneficiaries reached through Community Service and Volunteerism", 15000],
  ["EIE-AAP", "EIE-AAP-DIRBEN", "Direct beneficiaries reached through Agriculture and Agro-processing", 8000],
  ["EIE-TIEP", "EIE-TIEP-DIRBEN", "Direct beneficiaries reached through Technology and Innovation Entrepreneurship", 7000],
  ["MHSW-MHRP", "MHSW-MHRP-DIRBEN", "Direct beneficiaries reached through Mental Health Resilience", 12000],
  ["MHSW-SPP", "MHSW-SPP-DIRBEN", "Direct beneficiaries reached through Suicide Prevention", 8000],
  ["CASD-KZCGH", "CASD-KZCGH-DIRBEN", "Direct beneficiaries reached through Keep Zambia Clean, Green and Healthy", 15000],
  ["CLDG-NVPA", "CLDG-NVPA-DIRBEN", "Direct beneficiaries reached through National Values and Principles Awareness", 15000],
  ["CLDG-VEP", "CLDG-VEP-DIRBEN", "Direct beneficiaries reached through Voter Education", 15000],
] as const;

const indicators = await api("/indicators") as Array<{
  id: string;
  projectId: string;
  code: string;
}>;

const indicatorByCode = new Map(
  indicators.map((indicator) => [indicator.code, indicator])
);

const projectsForTargets = await api("/projects") as Array<{
  id: string;
  code: string;
}>;

const projectByCode = new Map(
  projectsForTargets.map((project) => [project.code, project])
);

for (const [projectCode, indicatorCode, indicatorName, targetValue] of directBeneficiaryTargets) {
  const project = projectByCode.get(projectCode);

  if (!project) {
    throw new Error(`Cannot seed target: project ${projectCode} not found.`);
  }

  let indicator = indicatorByCode.get(indicatorCode);

  if (!indicator) {
    indicator = await api("/indicators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        code: indicatorCode,
        name: indicatorName,
        description: `V1 direct-beneficiary baseline indicator for ${projectCode}.`,
        level: "OUTPUT",
        unit: "COUNT",
      }),
    });

    indicatorByCode.set(indicatorCode, indicator!);
    console.log(`  CREATED INDICATOR: ${indicatorCode}`);
  } else {
    console.log(`  EXISTS INDICATOR: ${indicatorCode}`);
  }
}

const existingTargets = await api("/targets") as Array<{
  id: string;
  indicatorId: string;
  year: number;
}>;

for (const [projectCode, indicatorCode, , targetValue] of directBeneficiaryTargets) {
  const indicator = indicatorByCode.get(indicatorCode);

  if (!indicator) {
    throw new Error(`Indicator ${indicatorCode} was not created/found.`);
  }

  const alreadyExists = existingTargets.some(
    (target) =>
      target.indicatorId === indicator.id &&
      target.year === 2030
  );

  if (alreadyExists) {
    console.log(`  EXISTS TARGET: ${indicatorCode} / 2030`);
    continue;
  }

  await api("/targets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      indicatorId: indicator.id,
      year: 2030,
      targetValue,
      notes: `V1 baseline allocation. Project allocation target: ${targetValue.toLocaleString()} direct beneficiaries.`,
    }),
  });

  console.log(
    `  CREATED TARGET: ${projectCode} / 2030 / ${targetValue.toLocaleString()}`
  );
}

console.log("\n===== V1 DIRECT-BENEFICIARY BASELINE =====");

const finalIndicators = await api("/indicators") as Array<{
  id: string;
  projectCode: string;
  code: string;
}>;

const finalTargets = await api("/targets") as Array<{
  indicatorId: string;
  year: number;
  targetValue: string | number;
  indicatorCode: string;
}>;

const baselineIndicatorCodes = new Set<string>(
  directBeneficiaryTargets.map(([, indicatorCode]) => indicatorCode)
);

const baselineTargets = finalTargets.filter(
  (target) =>
    target.year === 2030 &&
    baselineIndicatorCodes.has(target.indicatorCode)
);

const baselineTotal = baselineTargets.reduce(
  (sum, target) => sum + Number(target.targetValue),
  0
);

console.log(`INDICATORS: ${finalIndicators.filter((i) => baselineIndicatorCodes.has(i.code)).length}`);
console.log(`TARGETS: ${baselineTargets.length}`);
console.log(`TOTAL: ${baselineTotal.toLocaleString()}`);

if (baselineTotal !== 100000) {
  throw new Error(
    `V1 baseline total is ${baselineTotal.toLocaleString()}, expected 100,000.`
  );
}

console.log("\n===== PROGRAMMES =====");
console.log(JSON.stringify(await api("/programmes"), null, 2));

console.log("\n===== PROJECTS =====");
console.log(JSON.stringify(await api("/projects"), null, 2));

}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
