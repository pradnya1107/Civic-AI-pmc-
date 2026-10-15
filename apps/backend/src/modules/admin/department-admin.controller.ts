import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error";
import {
  createDepartmentAdmin,
  listDepartmentAdmins,
  getDepartmentDashboard,
  getDepartmentComplaints,
} from "./department-admin.service";
import { Department } from "../departments/department.model";

export const createAdminHandler: RequestHandler = async (request, response) => {
  const { departmentId, fullName, email } = request.body;

  const result = await createDepartmentAdmin({
    departmentId,
    fullName,
    email,
  });

  response.status(201).json({
    success: true,
    message: "Department admin account created successfully.",
    data: result,
  });
};

export const listAdminsHandler: RequestHandler = async (_request, response) => {
  const admins = await listDepartmentAdmins();

  response.status(200).json({
    success: true,
    data: { admins },
  });
};

export const getDepartmentDashboardHandler: RequestHandler = async (
  request,
  response,
) => {
  const departmentId = request.user?.departmentId;
  if (!departmentId) {
    throw new AppError(
      "No department assignment is associated with your account.",
      403,
      "FORBIDDEN",
    );
  }

  const data = await getDepartmentDashboard(departmentId);

  response.status(200).json({
    success: true,
    data,
  });
};

export const getDepartmentComplaintsHandler: RequestHandler = async (
  request,
  response,
) => {
  const departmentId = request.user?.departmentId;
  if (!departmentId) {
    throw new AppError(
      "No department assignment is associated with your account.",
      403,
      "FORBIDDEN",
    );
  }

  const complaints = await getDepartmentComplaints(departmentId);

  response.status(200).json({
    success: true,
    data: { complaints },
  });
};

export const getDepartmentAdminMeHandler: RequestHandler = async (
  request,
  response,
) => {
  const user = request.user;
  if (!user) {
    throw new AppError("Authentication is required.", 401, "UNAUTHORIZED");
  }

  let department = null;
  if (user.departmentId) {
    const deptDoc = await Department.findById(user.departmentId);
    if (deptDoc) {
      department = {
        id: deptDoc.id,
        name: deptDoc.name,
        slug: deptDoc.slug,
      };
    }
  }

  response.status(200).json({
    success: true,
    data: {
      admin: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department,
        accountStatus: user.accountStatus,
      },
    },
  });
};
