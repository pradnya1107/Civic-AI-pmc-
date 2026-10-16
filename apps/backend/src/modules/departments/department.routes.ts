import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../middleware/async-handler";
import { list, getById, create, update } from "./department.controller";

const departmentRouter = Router();

// Public / Authenticated read list
departmentRouter.get("/", asyncHandler(list));
departmentRouter.get("/:id", asyncHandler(getById));

// Admin-only management endpoints
departmentRouter.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  asyncHandler(create),
);

departmentRouter.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  asyncHandler(update),
);

export default departmentRouter;

