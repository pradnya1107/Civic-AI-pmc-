import { model, Schema } from "mongoose";

export interface DepartmentRecord {
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<DepartmentRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    description: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

export const Department = model<DepartmentRecord>(
  "Department",
  departmentSchema,
);
