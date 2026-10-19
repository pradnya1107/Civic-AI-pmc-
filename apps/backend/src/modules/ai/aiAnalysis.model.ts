import { model, Schema, Types } from "mongoose";
import {
  COMPLAINT_PRIORITIES,
  type ComplaintPriority,
} from "../complaints/complaint.model";

export interface AIAnalysisRecord {
  complaintRef: Types.ObjectId;
  suggestedCategory: string;
  suggestedPriority: ComplaintPriority;
  summary: string;
  confidence: number;
  modelVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiAnalysisSchema = new Schema<AIAnalysisRecord>(
  {
    complaintRef: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      unique: true,
      index: true,
    },
    suggestedCategory: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    suggestedPriority: {
      type: String,
      enum: COMPLAINT_PRIORITIES,
      required: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    modelVersion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  },
);

aiAnalysisSchema.index({ createdAt: -1 });

export const AIAnalysis = model<AIAnalysisRecord>("AIAnalysis", aiAnalysisSchema);
