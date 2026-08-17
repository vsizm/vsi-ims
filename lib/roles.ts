export const roles = ["SYSTEM_ADMINISTRATOR","EXECUTIVE_DIRECTOR","PROGRAMME_MANAGER","PROJECT_MANAGER","FINANCE_OFFICER","MEAL_OFFICER","VOLUNTEER_COORDINATOR","FIELD_OFFICER","VOLUNTEER","BOARD_MEMBER","AUDITOR"] as const;
export type Role = (typeof roles)[number];
export const permissions: Record<Role, string[]> = {
  SYSTEM_ADMINISTRATOR:["access.manage","audit.read","configuration.manage","directorates.manage","geography.read","budgets.manage","budgets.approve","expenditure.manage","expenditure.approve","funding.manage","finance.dashboard.read"],
  EXECUTIVE_DIRECTOR:["organisation.read","approvals.final","reports.read","indicators.read","results.read","budgets.read","expenditure.read","finance.dashboard.read"],
  PROGRAMME_MANAGER:["programmes.manage","projects.manage","activities.read","activities.manage","activities.approve","reports.read","reports.manage","indicators.read","indicators.manage","results.read","results.manage","geography.read","interventions.read","interventions.manage","beneficiaries.read","beneficiaries.write","budgets.read","expenditure.read","finance.dashboard.read"],
  PROJECT_MANAGER:["projects.manage","activities.read","activities.manage","risks.manage","indicators.read","results.read","geography.read","interventions.read","interventions.manage","beneficiaries.read","budgets.read","expenditure.read","finance.dashboard.read"],
  FINANCE_OFFICER:["funding.manage","budgets.manage","budgets.approve","expenditure.manage","expenditure.approve","budgets.read","expenditure.read","finance.dashboard.read"],
  MEAL_OFFICER:["indicators.manage","indicators.read","results.manage","results.read","data.validate","geography.read","beneficiaries.read"],
  VOLUNTEER_COORDINATOR:["volunteers.manage","assignments.manage","beneficiaries.read","beneficiaries.write"],
  FIELD_OFFICER:["activities.read","attendance.write","beneficiaries.read","beneficiaries.write","geography.read","interventions.read","interventions.manage"],
  VOLUNTEER:["profile.read","assignments.read","attendance.write"],
  BOARD_MEMBER:["governance.read","reports.read","indicators.read","results.read","budgets.read","expenditure.read","finance.dashboard.read"],
  AUDITOR:["audit.read","reports.read","indicators.read","results.read","beneficiaries.read","interventions.read","budgets.read","expenditure.read","finance.dashboard.read"]
};
export const can = (role: Role, permission: string) => role === "SYSTEM_ADMINISTRATOR" || permissions[role].includes(permission);
