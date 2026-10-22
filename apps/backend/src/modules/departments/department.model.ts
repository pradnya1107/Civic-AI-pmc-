import { model, Schema, Types } from "mongoose";

export interface DepartmentRecord {
  name: string;
  code: string;
  category: string;
  officialEmail: string;
  contactNumber: string;
  adminId?: Types.ObjectId;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<DepartmentRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },
    category: { type: String, trim: true, maxlength: 100 },
    officialEmail: { type: String, lowercase: true, trim: true, maxlength: 254 },
    contactNumber: { type: String, trim: true, maxlength: 32 },
    adminId: { type: Schema.Types.ObjectId, ref: "User" },
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

// Pre-validate hook to ensure code, category, officialEmail, contactNumber, slug are always set
departmentSchema.pre("validate", function () {
  if (!this.code) {
    const raw = this.slug || this.name || "DEPT";
    this.code = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10) || ("DEPT-" + Date.now().toString(36).toUpperCase());
  } else {
    this.code = this.code.trim().toUpperCase();
  }

  if (!this.slug) {
    const raw = this.code || this.name || "dept";
    this.slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || ("dept-" + Date.now());
  }

  if (!this.category) {
    this.category = "General Administration";
  }

  if (!this.officialEmail) {
    this.officialEmail = `${this.slug.replace(/[^a-zA-Z0-9]/g, "")}@pmc.gov.in`;
  }

  if (!this.contactNumber) {
    this.contactNumber = "+91 20 2550 1000";
  }
});

export const Department = model<DepartmentRecord>(
  "Department",
  departmentSchema,
);
