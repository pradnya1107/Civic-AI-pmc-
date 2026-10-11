import { model, Schema } from "mongoose";

export interface VerificationCodeRecord {
  email: string;
  codeHash: string;
  expiresAt: Date;
  recordExpiresAt: Date;
  attempts: number;
  sendsInWindow: number;
  windowStartedAt: Date;
  resendAllowedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const verificationCodeSchema = new Schema<VerificationCodeRecord>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    recordExpiresAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0 },
    sendsInWindow: { type: Number, required: true, default: 0 },
    windowStartedAt: { type: Date, required: true },
    resendAllowedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

verificationCodeSchema.index({ email: 1 }, { unique: true });
verificationCodeSchema.index(
  { recordExpiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export const VerificationCode = model<VerificationCodeRecord>(
  "VerificationCode",
  verificationCodeSchema,
);
