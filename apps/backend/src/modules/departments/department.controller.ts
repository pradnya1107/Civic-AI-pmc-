import type { RequestHandler } from "express";
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  getDepartmentById,
} from "./department.service";

export const list: RequestHandler = async (request, response) => {
  const includeInactive = request.query.all === "true" || request.query.includeInactive === "true";
  const departments = await listDepartments({ includeInactive });
  response.status(200).json({
    success: true,
    data: { departments },
  });
};

export const getById: RequestHandler = async (request, response) => {
  const department = await getDepartmentById(request.params.id as string);
  response.status(200).json({
    success: true,
    data: { department },
  });
};

export const create: RequestHandler = async (request, response) => {
  const department = await createDepartment(request.body);
  response.status(201).json({
    success: true,
    message: "Department created successfully.",
    data: { department },
  });
};

export const update: RequestHandler = async (request, response) => {
  const department = await updateDepartment(request.params.id as string, request.body);
  response.status(200).json({
    success: true,
    message: "Department updated successfully.",
    data: { department },
  });
};

