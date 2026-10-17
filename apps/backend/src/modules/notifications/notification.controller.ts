import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error";
import {
  listUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notification.service";

function recipientId(request: Parameters<RequestHandler>[0]): string {
  if (!request.user) {
    throw new AppError("Authentication is required.", 401, "UNAUTHORIZED");
  }
  return request.user.id;
}

export const list: RequestHandler = async (request, response) => {
  const query = (request.query || {}) as {
    page?: string;
    limit?: string;
    unreadOnly?: string | boolean;
  };
  const isUnreadOnly =
    query.unreadOnly === true ||
    query.unreadOnly === "true" ||
    request.path.includes("unread");

  const result = await listUserNotifications(
    recipientId(request),
    Number(query.page ?? 1),
    Number(query.limit ?? 20),
    isUnreadOnly,
  );
  response.status(200).json({ success: true, data: result });
};

export const markRead: RequestHandler = async (request, response) => {
  const id = request.params.id;
  if (typeof id !== "string") {
    throw new AppError("Notification id is invalid.", 400, "VALIDATION_ERROR");
  }
  const notification = await markNotificationRead(recipientId(request), id);
  response.status(200).json({
    success: true,
    message: "Notification marked as read.",
    data: { notification },
  });
};

export const markAllRead: RequestHandler = async (request, response) => {
  const result = await markAllNotificationsRead(recipientId(request));
  response.status(200).json({
    success: true,
    message: "All notifications marked as read.",
    data: result,
  });
};
