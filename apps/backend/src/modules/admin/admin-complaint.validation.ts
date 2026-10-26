import { z } from "zod";
import {
  COMPLAINT_STATUSES,
  COMPLAINT_PRIORITIES,
} from "../complaints/complaint.model";

export const adminComplaintListQuerySchema = z
  .object({
    page: z.string().regex(/^[1-9]\d{0,5}$/).optional(),
    limit: z.string().regex(/^[1-9]\d{0,2}$/).optional(),
    status: z.string().optional(),
    category: z.string().trim().max(100).optional(),
    departmentId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    priority: z.string().optional(),
    search: z.string().trim().max(200).optional(),
    sortBy: z.enum(["newest", "oldest", "priority", "status"]).optional(),
  })
  .passthrough();

export const adminStatusUpdateSchema = z
  .object({
    status: z.enum(COMPLAINT_STATUSES),
    note: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .passthrough();

export const updateComplaintStatusSchema = adminStatusUpdateSchema;

export const adminAssignSchema = z
  .object({
    departmentId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .passthrough();

export const assignComplaintDepartmentSchema = adminAssignSchema;

export const verifyComplaintSchema = z
  .object({
    notes: z.string().trim().max(1000).optional(),
  })
  .passthrough();

export const rejectResolutionSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(10, "A detailed rejection reason of at least 10 characters is required.")
      .max(1000),
    returnedStatus: z.enum(["IN_PROGRESS", "UNDER_REVIEW"]).optional(),
  })
  .passthrough();

export const adminComplaintIdParamSchema = z
  .object({
    id: z.string().regex(/^[a-f\d]{24}$/i),
  })
  .passthrough();

export type AdminComplaintListQuery = z.infer<typeof adminComplaintListQuerySchema>;
export type AdminStatusUpdateInput = z.infer<typeof adminStatusUpdateSchema>;
export type AdminAssignInput = z.infer<typeof adminAssignSchema>;
export type RejectResolutionInput = z.infer<typeof rejectResolutionSchema>;
