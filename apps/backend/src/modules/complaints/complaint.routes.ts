import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
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
  getById,
  list,
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
complaintRouter.patch(
  "/:id",
  validateRequest(complaintIdSchema, "params"),
  validateRequest(updateComplaintSchema),
  asyncHandler(update),
);

export default complaintRouter;
