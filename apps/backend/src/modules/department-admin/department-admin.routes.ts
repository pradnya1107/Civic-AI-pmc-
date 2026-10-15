import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../middleware/async-handler";
import {
  getDepartmentAdminMeHandler,
  getDepartmentDashboardHandler,
  getDepartmentComplaintsHandler,
} from "../admin/department-admin.controller";

export const departmentAdminRouter = Router();

// Only ADMIN or DEPARTMENT_ADMIN can access their department portal
departmentAdminRouter.use(authenticate, authorize("ADMIN", "DEPARTMENT_ADMIN"));

departmentAdminRouter.get("/me", asyncHandler(getDepartmentAdminMeHandler));
departmentAdminRouter.get("/dashboard", asyncHandler(getDepartmentDashboardHandler));
departmentAdminRouter.get("/complaints", asyncHandler(getDepartmentComplaintsHandler));
