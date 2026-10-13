import { model, Schema, Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "COMPLAINT_SUBMITTED",
  "COMPLAINT_UPDATED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationRecord {
  recipientId: Types.ObjectId;
  complaintId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationRecord>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    readAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });

export const Notification = model<NotificationRecord>(
  "Notification",
  notificationSchema,
);
