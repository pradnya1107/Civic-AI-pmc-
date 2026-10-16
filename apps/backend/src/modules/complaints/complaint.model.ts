import { randomUUID } from "node:crypto";
import { model, Schema, Types } from "mongoose";

export const COMPLAINT_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const COMPLAINT_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;
export type ComplaintPriority = (typeof COMPLAINT_PRIORITIES)[number];

export interface ComplaintLocation {
  address: string;
  ward?: string;
  latitude?: number;
  longitude?: number;
}

export interface ComplaintRecord {
  complaintNumber: string;
  title: string;
  description: string;
  category: string;
  location: ComplaintLocation;
  citizenId: Types.ObjectId;
  departmentId?: Types.ObjectId;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  createdAt: Date;
  updatedAt: Date;
}

const complaintSchema = new Schema<ComplaintRecord>(
  {
    complaintNumber: {
      type: String,
      required: true,
      unique: true,
      default: () => `CIV-${randomUUID()}`,
    },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    location: {
      address: { type: String, required: true, trim: true, maxlength: 300 },
      ward: { type: String, trim: true, maxlength: 100 },
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
    citizenId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    priority: {
      type: String,
      enum: COMPLAINT_PRIORITIES,
      default: "MEDIUM",
      required: true,
    },
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: "SUBMITTED",
      required: true,
    },
  },
  { timestamps: true },
);

complaintSchema.index({ citizenId: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ status: 1, citizenId: 1 });

export const Complaint = model<ComplaintRecord>("Complaint", complaintSchema);
