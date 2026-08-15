import { boolean, date, integer, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

const id = {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
};

export const directorates = pgTable("directorates", {
  ...id,
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull()
});

export const projectStatus = pgEnum("project_status", ["DRAFT", "ACTIVE", "ON_HOLD", "CLOSED"]);
export const activityStatus = pgEnum("activity_status", ["PLANNED", "IN_PROGRESS", "COMPLETE", "CANCELLED"]);
export const activityApprovalStatus = pgEnum("activity_approval_status", ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]);

export const programmes = pgTable("programmes", {
  ...id,
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  objective: text("objective").notNull(),
  active: boolean("active").default(true).notNull()
});

export const projects = pgTable("projects", {
  ...id,
  programmeId: uuid("programme_id").references(() => programmes.id).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  objective: text("objective").notNull(),
  status: projectStatus("status").default("DRAFT").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date")
});

export const activities = pgTable("activities", {
  ...id,
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  status: activityStatus("status").default("PLANNED").notNull(),
  approvalStatus: activityApprovalStatus("approval_status").default("DRAFT").notNull(),
  dueDate: date("due_date"),
  ownerUserId: uuid("owner_user_id"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  submittedByUserId: uuid("submitted_by_user_id"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedByUserId: uuid("approved_by_user_id"),
  rejectionReason: text("rejection_reason")
});

export const reports = pgTable("reports", {
  ...id,
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  narrative: text("narrative").notNull(),
  submittedByUserId: uuid("submitted_by_user_id").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true })
});

export const auditEvents = pgTable("audit_events", {
  ...id,
  actorUserId: uuid("actor_user_id").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  beforeValue: text("before_value"),
  afterValue: text("after_value")
});

// -----------------------------------------------------------------------------
// Foundation v1: Geography
// Province -> District -> Delivery site (school/institution/community)
// -----------------------------------------------------------------------------

export const provinces = pgTable("provinces", {
  ...id,
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  active: boolean("active").default(true).notNull()
});

export const districts = pgTable("districts", {
  ...id,
  provinceId: uuid("province_id").references(() => provinces.id).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  active: boolean("active").default(true).notNull()
});

export const deliverySiteType = pgEnum("delivery_site_type", ["SCHOOL", "INSTITUTION", "COMMUNITY"]);

export const deliverySites = pgTable("delivery_sites", {
  ...id,
  districtId: uuid("district_id").references(() => districts.id).notNull(),
  type: deliverySiteType("type").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  code: varchar("code", { length: 64 }),
  active: boolean("active").default(true).notNull()
});

// -----------------------------------------------------------------------------
// Foundation v1: Beneficiaries
// A beneficiary is a person. Participation is stored separately so repeated
// participation does not inflate unique beneficiary counts.
// -----------------------------------------------------------------------------

export const beneficiarySex = pgEnum("beneficiary_sex", ["FEMALE", "MALE", "NOT_STATED"]);
export const beneficiaryAgeGroup = pgEnum("beneficiary_age_group", ["CHILD", "YOUTH", "ADULT"]);

export const beneficiaries = pgTable("beneficiaries", {
  ...id,
  beneficiaryCode: varchar("beneficiary_code", { length: 64 }).notNull().unique(),
  fullName: varchar("full_name", { length: 240 }).notNull(),
  dateOfBirth: date("date_of_birth"),
  ageGroup: beneficiaryAgeGroup("age_group").notNull(),
  sex: beneficiarySex("sex").default("NOT_STATED").notNull(),
  pwd: boolean("pwd").default(false).notNull(),
  provinceId: uuid("province_id").references(() => provinces.id),
  districtId: uuid("district_id").references(() => districts.id),
  deliverySiteId: uuid("delivery_site_id").references(() => deliverySites.id),
  active: boolean("active").default(true).notNull()
});

// -----------------------------------------------------------------------------
// Foundation v1: Interventions and participation
// -----------------------------------------------------------------------------

export const interventionStatus = pgEnum("intervention_status", ["PLANNED", "IN_PROGRESS", "COMPLETE", "CANCELLED"]);

export const interventions = pgTable("interventions", {
  ...id,
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  activityId: uuid("activity_id").references(() => activities.id),
  districtId: uuid("district_id").references(() => districts.id).notNull(),
  deliverySiteId: uuid("delivery_site_id").references(() => deliverySites.id),
  interventionDate: date("intervention_date").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  status: interventionStatus("status").default("PLANNED").notNull(),
  notes: text("notes")
});

export const interventionParticipants = pgTable("intervention_participants", {
  ...id,
  interventionId: uuid("intervention_id").references(() => interventions.id).notNull(),
  beneficiaryId: uuid("beneficiary_id").references(() => beneficiaries.id).notNull()
});

// -----------------------------------------------------------------------------
// Foundation v1: Indicators, targets and actual results
// -----------------------------------------------------------------------------

export const indicatorLevel = pgEnum("indicator_level", ["OUTPUT", "OUTCOME"]);
export const indicatorUnit = pgEnum("indicator_unit", ["COUNT", "PERCENTAGE", "RATE", "OTHER"]);

export const indicators = pgTable("indicators", {
  ...id,
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  activityId: uuid("activity_id").references(() => activities.id),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 240 }).notNull(),
  description: text("description"),
  level: indicatorLevel("level").notNull(),
  unit: indicatorUnit("unit").notNull(),
  active: boolean("active").default(true).notNull()
});

export const targets = pgTable("targets", {
  ...id,
  indicatorId: uuid("indicator_id").references(() => indicators.id).notNull(),
  year: integer("year").notNull(),
  targetValue: numeric("target_value", { precision: 14, scale: 2 }).notNull(),
  provinceId: uuid("province_id").references(() => provinces.id),
  districtId: uuid("district_id").references(() => districts.id),
  notes: text("notes")
});

export const results = pgTable("results", {
  ...id,
  targetId: uuid("target_id").references(() => targets.id).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  actualValue: numeric("actual_value", { precision: 14, scale: 2 }).notNull(),
  notes: text("notes")
});

// Other vertical slices own their authoritative data and reference projects rather than duplicate project data.
