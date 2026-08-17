export const roles = ["SYSTEM_ADMINISTRATOR","EXECUTIVE_DIRECTOR","PROGRAMME_MANAGER","PROJECT_MANAGER","FINANCE_OFFICER","MEAL_OFFICER","VOLUNTEER_COORDINATOR","FIELD_OFFICER","VOLUNTEER","BOARD_MEMBER","AUDITOR"] as const;

export type Role = (typeof roles)[number];

export const permissions: Record<Role, string[]> = {
  SYSTEM_ADMINISTRATOR:["access.manage","audit.read","configuration.manage","directorates.manage","geography.read"],
  EXECUTIVE_DIRECTOR:["organisation.read","approvals.final","reports.read","indicators.read","results.read"],
  PROGRAMME_MANAGER:["programmes.manage","projects.manage","activities.read","activities.manage","activities.approve","reports.read","reports.manage","indicators.read","indicators.manage","results.read","results.manage","geography.read"],
  PROJECT_MANAGER:["projects.manage","activities.read","activities.manage","risks.manage","indicators.read","results.read","geography.read"],
  FINANCE_OFFICER:["funding.manage","budgets.manage","expenditure.manage"],
  MEAL_OFFICER:["indicators.manage","indicators.read","results.manage","results.read","data.validate","geography.read"],
  VOLUNTEER_COORDINATOR:["volunteers.manage","assignments.manage"],
  FIELD_OFFICER:["activities.read","attendance.write","beneficiaries.write","geography.read"],
  VOLUNTEER:["profile.read","assignments.read","attendance.write"],
  BOARD_MEMBER:["governance.read","reports.read","indicators.read","results.read"],
  AUDITOR:["audit.read","reports.read","indicators.read","results.read"]
};

export const can = (role: Role, permission: string) => role === "SYSTEM_ADMINISTRATOR" || permissions[role].includes(permission);
