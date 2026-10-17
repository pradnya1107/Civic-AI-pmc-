import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../middleware/async-handler";
import { validateRequest } from "../../middleware/validate-request";
import {
  notificationIdSchema,
  notificationListQuerySchema,
} from "./notification.validation";
import { list, markRead, markAllRead } from "./notification.controller";

const notificationRouter = Router();
notificationRouter.use(authenticate);
notificationRouter.get(
  "/",
  validateRequest(notificationListQuerySchema, "query"),
  asyncHandler(list),
);
notificationRouter.patch("/read-all", asyncHandler(markAllRead));
notificationRouter.patch(
  "/:id/read",
  validateRequest(notificationIdSchema, "params"),
  asyncHandler(markRead),
);

export default notificationRouter;
