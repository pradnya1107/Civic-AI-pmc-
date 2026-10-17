import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../middleware/async-handler";
import { validateRequest } from "../../middleware/validate-request";
import {
  complaintIdSchema,
  complaintListQuerySchema,
  createComplaintSchema,
  updateComplaintSchema,
} from "./complaint.validation";
import {
  create,
  getAiAnalysis,
  getById,
  list,
  remove,
  update,
} from "./complaint.controller";

const complaintRouter = Router();

complaintRouter.use(authenticate);
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
complaintRouter.get(
  "/:id/ai",
  authorize("ADMIN", "DEPARTMENT_ADMIN", "SUPER_ADMIN"),
  validateRequest(complaintIdSchema, "params"),
  asyncHandler(getAiAnalysis),
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

export default complaintRouter;
