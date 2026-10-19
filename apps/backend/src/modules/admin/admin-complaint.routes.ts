import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../middleware/async-handler";
import { validateRequest } from "../../middleware/validate-request";
import {
  adminComplaintListQuerySchema,
  updateComplaintStatusSchema,
  assignComplaintDepartmentSchema,
  verifyComplaintSchema,
  adminComplaintIdParamSchema,
} from "./admin-complaint.validation";
import {
  listAdminComplaintsHandler,
  getAdminComplaintByIdHandler,
  updateComplaintStatusHandler,
  assignComplaintDepartmentHandler,
  verifyComplaintHandler,
} from "./admin-complaint.controller";

export const adminComplaintRouter = Router();

// Allow ADMIN, SUPER_ADMIN, and DEPARTMENT_ADMIN
adminComplaintRouter.use(
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN", "DEPARTMENT_ADMIN"),
);

// GET /api/v1/admin/complaints - List all complaints
adminComplaintRouter.get(
  "/",
  validateRequest(adminComplaintListQuerySchema, "query"),
  asyncHandler(listAdminComplaintsHandler),
);

// GET /api/v1/admin/complaints/:id - Get single complaint
adminComplaintRouter.get(
  "/:id",
  validateRequest(adminComplaintIdParamSchema, "params"),
  asyncHandler(getAdminComplaintByIdHandler),
);

// PATCH /api/v1/admin/complaints/:id/status - Update complaint status
adminComplaintRouter.patch(
  "/:id/status",
  validateRequest(adminComplaintIdParamSchema, "params"),
  validateRequest(updateComplaintStatusSchema),
  asyncHandler(updateComplaintStatusHandler),
);

// PATCH /api/v1/admin/complaints/:id/assign - Assign department
adminComplaintRouter.patch(
  "/:id/assign",
  validateRequest(adminComplaintIdParamSchema, "params"),
  validateRequest(assignComplaintDepartmentSchema),
  asyncHandler(assignComplaintDepartmentHandler),
);

// PATCH /api/v1/admin/complaints/:id/verify - Verify complaint
adminComplaintRouter.patch(
  "/:id/verify",
  validateRequest(adminComplaintIdParamSchema, "params"),
  validateRequest(verifyComplaintSchema),
  asyncHandler(verifyComplaintHandler),
);

export default adminComplaintRouter;
