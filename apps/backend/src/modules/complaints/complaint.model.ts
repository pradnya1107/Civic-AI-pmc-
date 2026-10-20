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

export interface ComplaintAiAnalysis {
  severity?: string;
  score?: number;
  reasoning?: string;
  suggestedDepartment?: string;
  detectedIssues?: string[];
  generatedDescription?: string;
  resolutionVerdict?: "RESOLVED_VERIFIED" | "POTENTIALLY_UNRESOLVED" | "INCONCLUSIVE";
  resolutionConfidence?: number;
  resolutionAnalysis?: string;
}

export interface AssignedOfficer {
  id?: Types.ObjectId;
  name?: string;
  phone?: string;
  designation?: string;
  assignedAt?: Date;
}

export interface CitizenConfirmation {
  confirmed?: boolean;
  rating?: number;
  feedback?: string;
  disputed?: boolean;
  disputeReason?: string;
  confirmedAt?: Date;
  disputedAt?: Date;
}

export interface InternalNote {
  _id?: Types.ObjectId;
  authorId?: Types.ObjectId;
  authorName?: string;
  authorRole?: string;
  note: string;
  createdAt: Date;
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
  imageUrl?: string;
  resolutionImageUrl?: string;
  resolutionNotes?: string;
  aiAnalysis?: ComplaintAiAnalysis;
  supporters: Types.ObjectId[];
  supportCount: number;
  slaDeadline: Date;
  assignedOfficer?: AssignedOfficer;
  citizenConfirmation?: CitizenConfirmation;
  internalNotes?: InternalNote[];
  createdAt: Date;
  updatedAt: Date;
}

export function calculateSlaDeadline(
  priority: ComplaintPriority,
  fromDate: Date = new Date(),
): Date {
  const hoursMap: Record<ComplaintPriority, number> = {
    CRITICAL: 12,
    HIGH: 24,
    MEDIUM: 48,
    LOW: 72,
  };
  const hours = hoursMap[priority] ?? 48;
  return new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
}

const complaintSchema = new Schema<ComplaintRecord>(
  {
    complaintNumber: {
      type: String,
      required: true,
      unique: true,
      default: () => `CIV-${randomUUID()}`,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
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
    imageUrl: { type: String, trim: true },
    resolutionImageUrl: { type: String, trim: true },
    resolutionNotes: { type: String, trim: true, maxlength: 2000 },
    aiAnalysis: {
      severity: { type: String, trim: true },
      score: { type: Number, min: 0, max: 100 },
      reasoning: { type: String, trim: true },
      suggestedDepartment: { type: String, trim: true },
      detectedIssues: [{ type: String, trim: true }],
      generatedDescription: { type: String, trim: true },
      resolutionVerdict: {
        type: String,
        enum: ["RESOLVED_VERIFIED", "POTENTIALLY_UNRESOLVED", "INCONCLUSIVE"],
      },
      resolutionConfidence: { type: Number, min: 0, max: 100 },
      resolutionAnalysis: { type: String, trim: true },
    },
    supporters: [{ type: Schema.Types.ObjectId, ref: "User" }],
    supportCount: { type: Number, default: 0, min: 0 },
    slaDeadline: {
      type: Date,
      default: function (this: any) {
        return calculateSlaDeadline(this.priority || "MEDIUM");
      },
    },
    assignedOfficer: {
      id: { type: Schema.Types.ObjectId, ref: "User" },
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      designation: { type: String, trim: true },
      assignedAt: { type: Date },
    },
    citizenConfirmation: {
      confirmed: { type: Boolean },
      rating: { type: Number, min: 1, max: 5 },
      feedback: { type: String, trim: true, maxlength: 1000 },
      disputed: { type: Boolean },
      disputeReason: { type: String, trim: true, maxlength: 1000 },
      confirmedAt: { type: Date },
      disputedAt: { type: Date },
    },
    internalNotes: [
      {
        authorId: { type: Schema.Types.ObjectId, ref: "User" },
        authorName: { type: String, trim: true },
        authorRole: { type: String, trim: true },
        note: { type: String, trim: true, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

complaintSchema.index({ citizenId: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ status: 1, citizenId: 1 });
complaintSchema.index({ "location.latitude": 1, "location.longitude": 1 });
complaintSchema.index({ slaDeadline: 1, status: 1 });

export const Complaint = model<ComplaintRecord>("Complaint", complaintSchema);
