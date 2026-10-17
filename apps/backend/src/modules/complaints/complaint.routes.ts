import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../middleware/async-handler";
import { validateRequest } from "../../middleware/validate-request";
import {
  complaintIdSchema,
  complaintListQuerySchema,
  createComplaintSchema,
  updateComplaintSchema,
  duplicateCheckSchema,
  citizenConfirmSchema,
  citizenDisputeSchema,
  resolveComplaintSchema,
} from "./complaint.validation";
import {
  create,
  getById,
  list,
  remove,
  update,
  heatmap,
  checkDuplicates,
  support,
  resolve,
  confirm,
  dispute,
  slaMonitoring,
} from "./complaint.controller";

const complaintRouter = Router();

complaintRouter.use(authenticate);

// Heatmap endpoint (before /:id)
complaintRouter.get("/heatmap", asyncHandler(heatmap));

// Smart duplicate detection (before /:id)
complaintRouter.post(
  "/check-duplicates",
  validateRequest(duplicateCheckSchema),
  asyncHandler(checkDuplicates),
);

// SLA monitoring metrics (before /:id)
complaintRouter.get("/sla-monitoring", asyncHandler(slaMonitoring));

complaintRouter.post(
  "/",
  validateRequest(createComplaintSchema),
  asyncHandler(create),
);
complaintRouter.get(
  "/",
  validateRequest(complaintListQuerySchema, "query"),
  asyncHandler(list),
);
complaintRouter.get(
  "/:id",
  validateRequest(complaintIdSchema, "params"),
  asyncHandler(getById),
);
complaintRouter.patch(
  "/:id",
  validateRequest(complaintIdSchema, "params"),
  validateRequest(updateComplaintSchema),
  asyncHandler(update),
);
complaintRouter.delete(
  "/:id",
  validateRequest(complaintIdSchema, "params"),
  asyncHandler(remove),
);

// Community support / upvoting
complaintRouter.post(
  "/:id/support",
  validateRequest(complaintIdSchema, "params"),
  asyncHandler(support),
);

// Administrative resolution with before/after photo verification
complaintRouter.post(
  "/:id/resolve",
  validateRequest(complaintIdSchema, "params"),
  validateRequest(resolveComplaintSchema),
  asyncHandler(resolve),
);

// Citizen resolution confirmation
complaintRouter.post(
  "/:id/confirm",
  validateRequest(complaintIdSchema, "params"),
  validateRequest(citizenConfirmSchema),
  asyncHandler(confirm),
);

// Citizen dispute & reopening
complaintRouter.post(
  "/:id/dispute",
  validateRequest(complaintIdSchema, "params"),
  validateRequest(citizenDisputeSchema),
  asyncHandler(dispute),
);

export default complaintRouter;
