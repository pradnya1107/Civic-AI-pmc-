import { z } from "zod";
import { COMPLAINT_STATUSES, COMPLAINT_PRIORITIES } from "../complaints/complaint.model";

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

export const updateComplaintStatusSchema = z
  .object({
    status: z.enum(COMPLAINT_STATUSES),
    notes: z.string().trim().max(1000).optional(),
  })
  .passthrough();

export const assignComplaintDepartmentSchema = z
  .object({
    departmentId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .passthrough();

export const verifyComplaintSchema = z
  .object({
    notes: z.string().trim().max(1000).optional(),
  })
  .passthrough();
