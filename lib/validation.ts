import { z } from "zod";
export const programmeInput = z.object({ code:z.string().trim().min(2).max(32), name:z.string().trim().min(3).max(160), objective:z.string().trim().min(10).max(2000) });
export const projectInput = z.object({ programmeId:z.uuid(), code:z.string().trim().min(2).max(32), name:z.string().trim().min(3).max(180), objective:z.string().trim().min(10).max(2000), startDate:z.string().date().optional(), endDate:z.string().date().optional() }).refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, { message:"Project end date must be after its start date.", path:["endDate"] });
export const activityInput = z.object({ projectId:z.uuid(), title:z.string().trim().min(3).max(180), description:z.string().trim().max(3000).optional(), dueDate:z.string().date().optional() });
export const reportInput = z.object({ projectId:z.uuid(), periodStart:z.string().date(), periodEnd:z.string().date(), narrative:z.string().trim().min(20).max(10000) }).refine((data) => data.periodStart <= data.periodEnd, { message:"Report end date must be after its start date.", path:["periodEnd"] });

export const activityRejectionInput = z.object({
  reason: z.string().trim().min(10).max(2000)
});

export const directorateInput = z.object({
  code: z.string().trim().min(2).max(32),
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional()
});

export const indicatorInput = z.object({
  projectId: z.uuid(),
  activityId: z.uuid().optional(),
  code: z.string().trim().min(2).max(64),
  name: z.string().trim().min(3).max(240),
  description: z.string().trim().max(3000).optional(),
  level: z.enum(["OUTPUT", "OUTCOME"]),
  unit: z.enum(["COUNT", "PERCENTAGE", "RATE", "OTHER"])
});

export const indicatorUpdateInput = indicatorInput.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one indicator field is required." }
);


export const targetInput = z.object({
  indicatorId: z.uuid(),
  year: z.number().int().min(2000).max(2100),
  targetValue: z.number().nonnegative(),
  provinceId: z.string().trim().min(1).optional(),
  districtId: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(3000).optional()
});

export const targetUpdateInput = targetInput.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one target field is required." }
);

export const resultInputBase = z.object({
  targetId: z.uuid(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  actualValue: z.number().nonnegative(),
  notes: z.string().trim().max(3000).optional()
});

export const resultInput = resultInputBase.refine(
  (data) => data.periodStart <= data.periodEnd,
  {
    message: "Result period end must be after its start date.",
    path: ["periodEnd"]
  }
);

export const resultUpdateInput = resultInputBase.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one result field is required." }
).refine(
  (data) =>
    !data.periodStart ||
    !data.periodEnd ||
    data.periodStart <= data.periodEnd,
  {
    message: "Result period end must be after its start date.",
    path: ["periodEnd"]
  }
);

export const beneficiaryInputBase = z.object({
  beneficiaryCode: z.string().trim().min(2).max(64),
  fullName: z.string().trim().min(2).max(240),
  dateOfBirth: z.string().date().optional(),
  ageGroup: z.enum(["CHILD", "YOUTH", "ADULT"]),
  sex: z.enum(["FEMALE", "MALE", "NOT_STATED"]).optional(),
  pwd: z.boolean().optional(),
  provinceId: z.string().trim().min(1).optional(),
  districtId: z.string().trim().min(1).optional(),
  deliverySiteId: z.uuid().optional()
});

export const beneficiaryInput = beneficiaryInputBase;

export const beneficiaryUpdateInput = beneficiaryInputBase.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one beneficiary field is required." }
);

export const interventionInputBase = z.object({
  projectId: z.uuid(),
  activityId: z.uuid().optional(),
  districtId: z.uuid(),
  deliverySiteId: z.uuid().optional(),
  interventionDate: z.string().date(),
  title: z.string().trim().min(3).max(180),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETE", "CANCELLED"]).optional(),
  notes: z.string().trim().max(3000).optional()
});

export const interventionInput = interventionInputBase;

export const interventionUpdateInput = interventionInputBase.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one intervention field is required." }
);


export const interventionParticipantInput = z.object({
  beneficiaryId: z.uuid()
});
