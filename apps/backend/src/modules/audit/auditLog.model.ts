import { model, Schema, Types } from "mongoose";

export interface AuditLogRecord {
  actorRef: Types.ObjectId; // reference to User
  action: string;
  targetRef?: Types.ObjectId; // reference to target document
  targetModel?: string; // name of the model of the target
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<AuditLogRecord>(
  {
    actorRef: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, trim: true },
    targetRef: { type: Schema.Types.ObjectId },
    targetModel: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

auditLogSchema.index({ actorRef: 1, createdAt: -1 });

export const AuditLog = model<AuditLogRecord>("AuditLog", auditLogSchema);
