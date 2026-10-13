import { Types } from "mongoose";
import { AppError } from "../../utils/app-error";
import { User } from "../users/user.model";
import type { ComplaintRecord, ComplaintStatus } from "../complaints/complaint.model";
import { Notification } from "./notification.model";

export async function recordComplaintSubmission(
  complaint: ComplaintRecord & { _id: Types.ObjectId },
): Promise<void> {
  try {
    const administrators = await User.find({
      role: "ADMIN",
      accountStatus: "ACTIVE",
      emailVerified: true,
    })
      .select("_id")
      .lean();

    if (administrators.length === 0) {
      return;
    }

    await Notification.insertMany(
      administrators.map(({ _id }) => ({
        recipientId: _id,
        complaintId: complaint._id,
        type: "COMPLAINT_SUBMITTED",
        title: "New civic complaint",
        message: `Complaint ${complaint.complaintNumber} was submitted.`,
      })),
    );
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Failed to record complaint notifications (${errorName}).`);
  }
}

export async function recordComplaintUpdate(
  complaint: ComplaintRecord & { _id: Types.ObjectId },
  status: ComplaintStatus,
): Promise<void> {
  try {
    await Notification.create({
      recipientId: complaint.citizenId,
      complaintId: complaint._id,
      type: "COMPLAINT_UPDATED",
      title: "Complaint update",
      message: `Complaint ${complaint.complaintNumber} was updated by the municipal team. Current status: ${status}.`,
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Failed to record complaint notification (${errorName}).`);
  }
}

export async function listUserNotifications(
  recipientId: string,
  page: number,
  limit: number,
) {
  const filter = { recipientId: new Types.ObjectId(recipientId) };
  const [notifications, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, readAt: { $exists: false } }),
  ]);
  return {
    notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    unreadCount: unread,
  };
}

export async function markNotificationRead(
  recipientId: string,
  notificationId: string,
) {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: new Types.ObjectId(notificationId),
      recipientId: new Types.ObjectId(recipientId),
    },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" },
  ).lean();

  if (!notification) {
    throw new AppError(
      "Notification not found.",
      404,
      "NOTIFICATION_NOT_FOUND",
    );
  }
  return notification;
}
