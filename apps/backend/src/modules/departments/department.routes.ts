import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { list } from "./department.controller";

const departmentRouter = Router();
departmentRouter.get("/", asyncHandler(list));

export default departmentRouter;
