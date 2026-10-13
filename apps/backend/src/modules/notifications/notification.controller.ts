import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error";
import {
  listUserNotifications,
  markNotificationRead,
} from "./notification.service";

function recipientId(request: Parameters<RequestHandler>[0]): string {
  if (!request.user) {
    throw new AppError("Authentication is required.", 401, "UNAUTHORIZED");
  }
  return request.user.id;
}

export const list: RequestHandler = async (request, response) => {
  const query = request.validatedQuery as {
    page?: string;
    limit?: string;
  };
  const result = await listUserNotifications(
    recipientId(request),
    Number(query.page ?? 1),
    Number(query.limit ?? 20),
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
