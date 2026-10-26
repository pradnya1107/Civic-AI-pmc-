import { Types } from "mongoose";
import { AppError } from "../../utils/app-error";
import { User } from "../users/user.model";
import { Department } from "../departments/department.model";
import type { ComplaintRecord, ComplaintStatus } from "../complaints/complaint.model";
import { Notification, type NotificationType } from "./notification.model";

export async function recordComplaintSubmission(
  complaint: ComplaintRecord & { _id: Types.ObjectId },
): Promise<void> {
  try {
    const notificationsToCreate: Array<{
      recipientId: Types.ObjectId;
      complaintId: Types.ObjectId;
      type: NotificationType;
      title: string;
      message: string;
    }> = [];
    const handledRecipients = new Set<string>();

    let deptName = "Municipal Department";
    if (complaint.departmentId) {
      const dept = await Department.findById(complaint.departmentId).select("name code").lean();
      if (dept) {
        deptName = dept.name;
      }

      // 1. Notify Department Administrators of the assigned department
      const deptAdmins = await User.find({
        departmentId: complaint.departmentId,
        role: { $in: ["DEPARTMENT_ADMIN", "ADMIN"] },
        accountStatus: "ACTIVE",
      })
        .select("_id")
        .lean();

      for (const admin of deptAdmins) {
        const idStr = admin._id.toString();
        if (!handledRecipients.has(idStr)) {
          handledRecipients.add(idStr);
          notificationsToCreate.push({
            recipientId: admin._id,
            complaintId: complaint._id,
            type: "COMPLAINT_SUBMITTED",
            title: "New Complaint Auto-Assigned by AI",
            message: `Complaint ${complaint.complaintNumber} (${complaint.category}) was auto-forwarded by AI to your department (${deptName}).`,
          });
        }
      }
    }

    // 2. Notify Super Administrators for central tracking
    const administrators = await User.find({
      role: "ADMIN",
      accountStatus: "ACTIVE",
      emailVerified: true,
    })
      .select("_id")
      .lean();

    for (const admin of administrators) {
      const idStr = admin._id.toString();
      if (!handledRecipients.has(idStr)) {
        handledRecipients.add(idStr);
        notificationsToCreate.push({
          recipientId: admin._id,
          complaintId: complaint._id,
          type: "COMPLAINT_SUBMITTED",
          title: "New civic complaint",
          message: `Complaint ${complaint.complaintNumber} was submitted.`,
        });
      }
    }

    if (notificationsToCreate.length > 0) {
      await Notification.insertMany(notificationsToCreate);
    }
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
  unreadOnly?: boolean,
) {
  const filter: Record<string, unknown> = {
    recipientId: new Types.ObjectId(recipientId),
  };
  if (unreadOnly) {
    filter.readAt = { $exists: false };
  }

  const [rawNotifications, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      recipientId: new Types.ObjectId(recipientId),
      readAt: { $exists: false },
    }),
  ]);

  const notifications = rawNotifications.map((n) => ({
    ...n,
    id: n._id.toString(),
    isRead: Boolean(n.readAt),
  }));

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
  return {
    ...notification,
    id: notification._id.toString(),
    isRead: Boolean(notification.readAt),
  };
}

export async function markAllNotificationsRead(recipientId: string) {
  const result = await Notification.updateMany(
    {
      recipientId: new Types.ObjectId(recipientId),
      readAt: { $exists: false },
    },
    { $set: { readAt: new Date() } },
  );
  return { modifiedCount: result.modifiedCount };
}
