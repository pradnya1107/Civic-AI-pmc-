import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../middleware/async-handler";
import {
  getDepartmentAdminMeHandler,
  getDepartmentDashboardHandler,
  getDepartmentAnalyticsHandler,
  getDepartmentComplaintsHandler,
  getDepartmentComplaintByIdHandler,
  updateComplaintStatusHandler,
  resolveDepartmentComplaintHandler,
  updateComplaintPriorityHandler,
  assignOfficerHandler,
  addInternalNoteHandler,
  verifyResolutionHandler,
  getDepartmentOfficersHandler,
  createDepartmentOfficerHandler,
  exportComplaintsCsvHandler,
} from "./department-admin.controller";
import { changePasswordHandler } from "../auth/auth.controller";

export const departmentAdminRouter = Router();

// Only ADMIN or DEPARTMENT_ADMIN can access their department portal
departmentAdminRouter.use(authenticate, authorize("ADMIN", "DEPARTMENT_ADMIN"));

// Change password for logged-in department admin
departmentAdminRouter.post("/change-password", asyncHandler(changePasswordHandler));

// Department admin profile & department info
departmentAdminRouter.get("/me", asyncHandler(getDepartmentAdminMeHandler));

// Dashboard metrics & priority queue
departmentAdminRouter.get("/dashboard", asyncHandler(getDepartmentDashboardHandler));

// In-depth department analytics & trends
departmentAdminRouter.get("/analytics", asyncHandler(getDepartmentAnalyticsHandler));

// Officers / Field workers directory & creation
departmentAdminRouter.get("/officers", asyncHandler(getDepartmentOfficersHandler));
departmentAdminRouter.post("/officers", asyncHandler(createDepartmentOfficerHandler));

// Export department complaints CSV (must be placed before /complaints/:id)
departmentAdminRouter.get("/complaints/export", asyncHandler(exportComplaintsCsvHandler));

// Complaints management listing & filtering
departmentAdminRouter.get("/complaints", asyncHandler(getDepartmentComplaintsHandler));

// Single complaint details with audit logs
departmentAdminRouter.get("/complaints/:id", asyncHandler(getDepartmentComplaintByIdHandler));

// Status update with workflow validation
departmentAdminRouter.patch("/complaints/:id/status", asyncHandler(updateComplaintStatusHandler));

// Complete and resolve complaint with resolution photo and AI authenticity scan
departmentAdminRouter.post("/complaints/:id/resolve", asyncHandler(resolveDepartmentComplaintHandler));
departmentAdminRouter.patch("/complaints/:id/resolve", asyncHandler(resolveDepartmentComplaintHandler));

// Priority update & SLA recalculation
departmentAdminRouter.patch("/complaints/:id/priority", asyncHandler(updateComplaintPriorityHandler));

// Officer assignment / reassignment
departmentAdminRouter.patch("/complaints/:id/assign-officer", asyncHandler(assignOfficerHandler));

// Add internal investigation note
departmentAdminRouter.post("/complaints/:id/notes", asyncHandler(addInternalNoteHandler));

// Verify or reject resolution evidence
departmentAdminRouter.patch("/complaints/:id/verify-resolution", asyncHandler(verifyResolutionHandler));

export default departmentAdminRouter;
