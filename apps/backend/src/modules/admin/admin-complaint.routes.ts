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
} from "./admin-complaint.validation";
import {
  listAdminComplaintsHandler,
  getAdminComplaintByIdHandler,
  updateComplaintStatusHandler,
  assignComplaintDepartmentHandler,
  verifyComplaintHandler,
} from "./admin-complaint.controller";

export const adminComplaintRouter = Router();

// Only ADMIN or SUPER_ADMIN can access administrative complaint operations
adminComplaintRouter.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

adminComplaintRouter.get(
  "/",
  validateRequest(adminComplaintListQuerySchema, "query"),
  asyncHandler(listAdminComplaintsHandler),
);

adminComplaintRouter.get(
  "/:id",
  asyncHandler(getAdminComplaintByIdHandler),
);

adminComplaintRouter.patch(
  "/:id/status",
  validateRequest(updateComplaintStatusSchema),
  asyncHandler(updateComplaintStatusHandler),
);

adminComplaintRouter.patch(
  "/:id/assign",
  validateRequest(assignComplaintDepartmentSchema),
  asyncHandler(assignComplaintDepartmentHandler),
);

adminComplaintRouter.patch(
  "/:id/verify",
  validateRequest(verifyComplaintSchema),
  asyncHandler(verifyComplaintHandler),
);

export default adminComplaintRouter;
