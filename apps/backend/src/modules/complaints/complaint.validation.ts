import { z } from "zod";
import {
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
} from "./complaint.model";

const locationSchema = z
  .object({
    address: z.string().trim().min(1).max(300),
    ward: z.string().trim().max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .strict()
  .refine(
    (location) =>
      (location.latitude === undefined) ===
      (location.longitude === undefined),
    "Latitude and longitude must be provided together.",
  );

export const createComplaintSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10).max(5000),
    category: z.string().trim().min(1).max(80),
    location: locationSchema,
    priority: z.enum(COMPLAINT_PRIORITIES).optional(),
    imageUrl: z.string().trim().optional(),
    aiAnalysis: z
      .object({
        severity: z.string().optional(),
        score: z.number().optional(),
        reasoning: z.string().optional(),
        suggestedDepartment: z.string().optional(),
        detectedIssues: z.array(z.string()).optional(),
        generatedDescription: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export const complaintIdSchema = z
  .object({ id: z.string().regex(/^[a-f\d]{24}$/i) })
  .strict();

export const complaintListQuerySchema = z
  .object({
    page: z.string().regex(/^[1-9]\d{0,5}$/).optional(),
    limit: z.string().regex(/^[1-9]\d{0,2}$/).optional(),
    status: z.enum(COMPLAINT_STATUSES).optional(),
    priority: z.enum(COMPLAINT_PRIORITIES).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    ward: z.string().trim().optional(),
    search: z.string().trim().optional(),
  })
  .strict()
  .refine((query) => !query.limit || Number(query.limit) <= 100);

export const updateComplaintSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    location: locationSchema.optional(),
    status: z.enum(COMPLAINT_STATUSES).optional(),
    priority: z.enum(COMPLAINT_PRIORITIES).optional(),
    departmentId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
    imageUrl: z.string().trim().optional(),
    resolutionImageUrl: z.string().trim().optional(),
    resolutionNotes: z.string().trim().max(2000).optional(),
    assignedOfficer: z
      .object({
        id: z.string().regex(/^[a-f\d]{24}$/i).optional(),
        name: z.string().trim().min(1).max(100),
        phone: z.string().trim().optional(),
        designation: z.string().trim().optional(),
      })
      .optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0);

export const duplicateCheckSchema = z
  .object({
    category: z.string().trim().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    address: z.string().trim().optional(),
    title: z.string().trim().optional(),
  })
  .strict();

export const citizenConfirmSchema = z
  .object({
    rating: z.number().min(1).max(5).optional(),
    feedback: z.string().trim().max(1000).optional(),
  })
  .strict();

export const citizenDisputeSchema = z
  .object({
    reason: z.string().trim().min(5).max(1000),
  })
  .strict();

export const resolveComplaintSchema = z
  .object({
    resolutionImageUrl: z.string().trim().optional(),
    resolutionNotes: z.string().trim().max(2000).optional(),
  })
  .strict();

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;
export type ComplaintListQuery = z.infer<typeof complaintListQuerySchema>;
export type DuplicateCheckInput = z.infer<typeof duplicateCheckSchema>;
export type CitizenConfirmInput = z.infer<typeof citizenConfirmSchema>;
export type CitizenDisputeInput = z.infer<typeof citizenDisputeSchema>;
export type ResolveComplaintInput = z.infer<typeof resolveComplaintSchema>;
