import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../middleware/async-handler";
import {
  createAdminHandler,
  listAdminsHandler,
  updateAdminHandler,
  listCitizensHandler,
} from "./department-admin.controller";

export const superAdminDeptRouter = Router();

// Only SUPER_ADMIN can manage department admins
superAdminDeptRouter.use(authenticate, authorize("SUPER_ADMIN"));

superAdminDeptRouter.post("/", asyncHandler(createAdminHandler));
superAdminDeptRouter.get("/", asyncHandler(listAdminsHandler));
superAdminDeptRouter.patch("/:id", asyncHandler(updateAdminHandler));

export const superAdminCitizenRouter = Router();
superAdminCitizenRouter.use(authenticate, authorize("SUPER_ADMIN", "ADMIN"));
superAdminCitizenRouter.get("/", asyncHandler(listCitizensHandler));

