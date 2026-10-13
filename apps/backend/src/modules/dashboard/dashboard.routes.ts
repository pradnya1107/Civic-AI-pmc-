import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../middleware/async-handler";
import { getDashboard } from "./dashboard.controller";

const dashboardRouter = Router();
dashboardRouter.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(getDashboard),
);

export default dashboardRouter;
