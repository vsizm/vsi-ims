export const roles = ["SYSTEM_ADMINISTRATOR","EXECUTIVE_DIRECTOR","PROGRAMME_MANAGER","PROJECT_MANAGER","FINANCE_OFFICER","MEAL_OFFICER","VOLUNTEER_COORDINATOR","FIELD_OFFICER","VOLUNTEER","BOARD_MEMBER","AUDITOR"] as const;

export type Role = (typeof roles)[number];

export const permissions: Record<Role, string[]> = {
  SYSTEM_ADMINISTRATOR:["access.manage","audit.read","configuration.manage","directorates.manage"],
  EXECUTIVE_DIRECTOR:["organisation.read","approvals.final","reports.read"],
  PROGRAMME_MANAGER:["programmes.manage","projects.manage","activities.read","activities.manage","activities.approve","reports.read","reports.manage"],
  PROJECT_MANAGER:["projects.manage","activities.read","activities.manage","risks.manage"],
  FINANCE_OFFICER:["funding.manage","budgets.manage","expenditure.manage"],
  MEAL_OFFICER:["indicators.manage","results.manage","data.validate"],
  VOLUNTEER_COORDINATOR:["volunteers.manage","assignments.manage"],
  FIELD_OFFICER:["activities.read","attendance.write","beneficiaries.write"],
  VOLUNTEER:["profile.read","assignments.read","attendance.write"],
  BOARD_MEMBER:["governance.read","reports.read"],
  AUDITOR:["audit.read","reports.read"]
};

export const can = (role: Role, permission: string) => permissions[role].includes(permission);
