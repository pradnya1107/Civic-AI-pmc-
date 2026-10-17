import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../middleware/async-handler";
import { validateRequest } from "../../middleware/validate-request";
import {
  adminComplaintIdParamSchema,
  adminComplaintListQuerySchema,
  adminAssignSchema,
  adminStatusUpdateSchema,
} from "./admin-complaint.validation";
import {
  listComplaintsHandler,
  getComplaintHandler,
  updateStatusHandler,
  assignComplaintHandler,
} from "./admin-complaint.controller";

export const adminComplaintRouter = Router();

// All routes require authentication + admin-level role
adminComplaintRouter.use(
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN", "DEPARTMENT_ADMIN"),
);

// GET /api/v1/admin/complaints — list all complaints (paginated + filtered)
adminComplaintRouter.get(
  "/",
  validateRequest(adminComplaintListQuerySchema, "query"),
  asyncHandler(listComplaintsHandler),
);

// GET /api/v1/admin/complaints/:id — get single complaint
adminComplaintRouter.get(
  "/:id",
  validateRequest(adminComplaintIdParamSchema, "params"),
  asyncHandler(getComplaintHandler),
);

// PATCH /api/v1/admin/complaints/:id/status — advance lifecycle status
adminComplaintRouter.patch(
  "/:id/status",
  validateRequest(adminComplaintIdParamSchema, "params"),
  validateRequest(adminStatusUpdateSchema),
  asyncHandler(updateStatusHandler),
);

// PATCH /api/v1/admin/complaints/:id/assign — assign to department
adminComplaintRouter.patch(
  "/:id/assign",
  validateRequest(adminComplaintIdParamSchema, "params"),
  validateRequest(adminAssignSchema),
  asyncHandler(assignComplaintHandler),
);
