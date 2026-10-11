import type { RequestHandler } from "express";
import { listDepartments } from "./department.service";

export const list: RequestHandler = async (_request, response) => {
  const departments = await listDepartments();
  response.status(200).json({
    success: true,
    data: { departments },
  });
};
