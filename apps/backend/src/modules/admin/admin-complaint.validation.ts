import { z } from "zod";
import {
  COMPLAINT_STATUSES,
  COMPLAINT_PRIORITIES,
} from "../complaints/complaint.model";

export const adminComplaintListQuerySchema = z
  .object({
    status: z.enum(COMPLAINT_STATUSES).optional(),
    priority: z.enum(COMPLAINT_PRIORITIES).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    departmentId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
    page: z
      .string()
      .regex(/^[1-9]\d{0,5}$/)
      .optional(),
    limit: z
      .string()
      .regex(/^[1-9]\d{0,2}$/)
      .optional(),
  })
  .strict()
  .refine((q) => !q.limit || Number(q.limit) <= 100);

export const adminStatusUpdateSchema = z
  .object({
    status: z.enum(COMPLAINT_STATUSES),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const adminAssignSchema = z
  .object({
    departmentId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .nullable(),
  })
  .strict();

export const adminComplaintIdParamSchema = z
  .object({ id: z.string().regex(/^[a-f\d]{24}$/i) })
  .strict();

export type AdminComplaintListQuery = z.infer<
  typeof adminComplaintListQuerySchema
>;
export type AdminStatusUpdateInput = z.infer<typeof adminStatusUpdateSchema>;
export type AdminAssignInput = z.infer<typeof adminAssignSchema>;
