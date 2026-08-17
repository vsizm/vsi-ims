export const VSI_2030_BENEFICIARY_TARGET = 100_000;

export const vsi2030DistrictTargets = [
  { provinceCode: "LUS", districtCode: "LUSAKA", districtName: "Lusaka", target: 15_000 },
  { provinceCode: "CB", districtCode: "KITWE", districtName: "Kitwe", target: 10_000 },
  { provinceCode: "SO", districtCode: "LIVINGSTONE", districtName: "Livingstone", target: 7_000 },
  { provinceCode: "CB", districtCode: "NDOLA", districtName: "Ndola", target: 10_000 },
  { provinceCode: "EA", districtCode: "CHIPATA", districtName: "Chipata", target: 8_000 },
  { provinceCode: "CE", districtCode: "KABWE", districtName: "Kabwe", target: 8_000 },
  { provinceCode: "CB", districtCode: "CHINGOLA", districtName: "Chingola", target: 8_000 },
  { provinceCode: "NW", districtCode: "SOLWEZI", districtName: "Solwezi", target: 8_000 },
  { provinceCode: "NO", districtCode: "KASAMA", districtName: "Kasama", target: 7_000 },
  { provinceCode: "CB", districtCode: "MUFULIRA", districtName: "Mufulira", target: 6_000 },
  { provinceCode: "WE", districtCode: "MONGU", districtName: "Mongu", target: 6_000 },
  { provinceCode: "SO", districtCode: "CHOMA", districtName: "Choma", target: 7_000 }
] as const;

const calculatedTarget = vsi2030DistrictTargets.reduce((sum, item) => sum + item.target, 0);
if (calculatedTarget !== VSI_2030_BENEFICIARY_TARGET) {
  throw new Error(`Invalid VSI 2030 district allocation: ${calculatedTarget} !== ${VSI_2030_BENEFICIARY_TARGET}`);
}

export const vsiProgrammeProjects = [
  { programmeCode: "CEV", programmeName: "Community Engagement and Volunteerism", projectCode: "CEV-VMP", projectName: "Volunteer Management Project" },
  { programmeCode: "CEV", programmeName: "Community Engagement and Volunteerism", projectCode: "CEV-CSVP", projectName: "Community Service and Volunteerism Project" },
  { programmeCode: "EIE", programmeName: "Entrepreneurship, Innovation and Employability", projectCode: "EIE-AAP", projectName: "Agriculture and Agro-processing Project" },
  { programmeCode: "EIE", programmeName: "Entrepreneurship, Innovation and Employability", projectCode: "EIE-TIEP", projectName: "Technology and Innovation Entrepreneurship Project" },
  { programmeCode: "MHSW", programmeName: "Mental Health and Student Wellbeing", projectCode: "MHSW-MHRP", projectName: "Mental Health Resilience Project" },
  { programmeCode: "MHSW", programmeName: "Mental Health and Student Wellbeing", projectCode: "MHSW-SPP", projectName: "Suicide Prevention Project" },
  { programmeCode: "CASD", programmeName: "Climate Action and Sustainable Development", projectCode: "CASD-KZCGH", projectName: "Keep Zambia Clean, Green and Healthy Project" },
  { programmeCode: "CLDG", programmeName: "Civic Leadership and Democratic Governance", projectCode: "CLDG-NVPA", projectName: "National Values and Principles Awareness Project" },
  { programmeCode: "CLDG", programmeName: "Civic Leadership and Democratic Governance", projectCode: "CLDG-VEP", projectName: "Voter Education Project" },
  { programmeCode: "PAR", programmeName: "Policy, Advocacy and Research", projectCode: "PAR-PREG", projectName: "Policy Research and Evidence Generation" },
  { programmeCode: "PAR", programmeName: "Policy, Advocacy and Research", projectCode: "PAR-RPK", projectName: "Research Publications and Knowledge" },
  { programmeCode: "PAR", programmeName: "Policy, Advocacy and Research", projectCode: "PAR-EBA", projectName: "Evidence-Based Advocacy" },
  { programmeCode: "PAR", programmeName: "Policy, Advocacy and Research", projectCode: "PAR-PLE", projectName: "Policy and Legislative Engagement" },
  { programmeCode: "PAR", programmeName: "Policy, Advocacy and Research", projectCode: "PAR-PDP", projectName: "Policy Dialogue Project" },
  { programmeCode: "PAR", programmeName: "Policy, Advocacy and Research", projectCode: "PAR-SYPP", projectName: "Student and Youth Policy Participation" },
  { programmeCode: "CPRM", programmeName: "Communications, Partnerships and Resource Mobilisation", projectCode: "CPRM-VPIA", projectName: "VSI Public Information and Awareness" },
  { programmeCode: "CPRM", programmeName: "Communications, Partnerships and Resource Mobilisation", projectCode: "CPRM-DCM", projectName: "Digital Communications and Media" },
  { programmeCode: "CPRM", programmeName: "Communications, Partnerships and Resource Mobilisation", projectCode: "CPRM-PKD", projectName: "Publications and Knowledge Dissemination" },
  { programmeCode: "CPRM", programmeName: "Communications, Partnerships and Resource Mobilisation", projectCode: "CPRM-SPD", projectName: "Strategic Partnerships Development" },
  { programmeCode: "CPRM", programmeName: "Communications, Partnerships and Resource Mobilisation", projectCode: "CPRM-SEE", projectName: "Stakeholder Engagement and Events" },
  { programmeCode: "CPRM", programmeName: "Communications, Partnerships and Resource Mobilisation", projectCode: "CPRM-FRM", projectName: "Fundraising and Resource Mobilisation" },
  { programmeCode: "CPRM", programmeName: "Communications, Partnerships and Resource Mobilisation", projectCode: "CPRM-GDR", projectName: "Grants and Donor Relations" }
] as const;

export const vsiProgrammeCodes = ["CEV", "EIE", "MHSW", "CASD", "CLDG", "PAR", "CPRM"] as const;
