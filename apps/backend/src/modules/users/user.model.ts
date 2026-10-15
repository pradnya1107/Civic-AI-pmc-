import { model, Schema } from "mongoose";

export const USER_ROLES = ["CITIZEN", "ADMIN", "SUPER_ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface UserRecord {
  fullName: string;
  name?: string;
  email: string;
  passwordHash: string;
  phoneNumber?: string;
  role: UserRole;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserRecord>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    phoneNumber: { type: String, trim: true, maxlength: 32 },
    role: { type: String, enum: USER_ROLES, default: "CITIZEN", required: true },
    emailVerified: { type: Boolean, default: false, required: true },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: "ACTIVE",
      required: true,
    },
    tokenVersion: { type: Number, default: 0, required: true, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.virtual("name").get(function () {
  return this.fullName;
});

export const User = model<UserRecord>("User", userSchema);
