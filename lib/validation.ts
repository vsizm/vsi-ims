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

const geographyCode = z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/, "Invalid geography code.");
export const geographyRef = z.union([z.uuid(), geographyCode]);

export const provinceInput = z.object({
  code: z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9_-]+$/, "Invalid province code."),
  name: z.string().trim().min(2).max(120)
});

export const districtInput = z.object({
  provinceId: geographyRef,
  code: z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9_-]+$/, "Invalid district code."),
  name: z.string().trim().min(2).max(120)
});

export const deliverySiteInput = z.object({
  districtId: geographyRef,
  type: z.enum(["SCHOOL", "INSTITUTION", "COMMUNITY"]),
  name: z.string().trim().min(2).max(180),
  code: z.string().trim().max(64).regex(/^[A-Za-z0-9_-]+$/, "Invalid delivery site code.").optional()
});
