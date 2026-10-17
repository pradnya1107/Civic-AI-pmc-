import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error";
import {
  listAdminComplaints,
  getAdminComplaintById,
  updateAdminComplaintStatus,
  assignAdminComplaintDepartment,
  verifyAdminComplaint,
  type AdminActor,
} from "./admin-complaint.service";

function getActor(request: Parameters<RequestHandler>[0]): AdminActor {
  if (!request.user) {
    throw new AppError("Authentication is required.", 401, "UNAUTHORIZED");
  }
  return {
    id: request.user.id,
    role: request.user.role,
    departmentId: request.user.departmentId,
  };
}

function getParamId(request: Parameters<RequestHandler>[0]): string {
  const id = request.params.id;
  if (!id || typeof id !== "string") {
    throw new AppError("Invalid complaint ID parameter.", 400, "VALIDATION_ERROR");
  }
  return id;
}

export const listAdminComplaintsHandler: RequestHandler = async (
  request,
  response,
) => {
  const result = await listAdminComplaints(request.query);
  response.status(200).json({
    success: true,
    data: result,
  });
};

export const listComplaintsHandler = listAdminComplaintsHandler;

export const getAdminComplaintByIdHandler: RequestHandler = async (
  request,
  response,
) => {
  const id = getParamId(request);
  const result = await getAdminComplaintById(id);
  response.status(200).json({
    success: true,
    data: result,
  });
};

export const getComplaintHandler = getAdminComplaintByIdHandler;

export const updateComplaintStatusHandler: RequestHandler = async (
  request,
  response,
) => {
  const actor = getActor(request);
  const id = getParamId(request);
  const { status, notes, note } = request.body;

  const complaint = await updateAdminComplaintStatus(
    actor,
    id,
    status,
    notes || note,
  );

  response.status(200).json({
    success: true,
    message: `Complaint status updated to '${status}'.`,
    data: { complaint },
  });
};

export const updateStatusHandler = updateComplaintStatusHandler;

export const assignComplaintDepartmentHandler: RequestHandler = async (
  request,
  response,
) => {
  const actor = getActor(request);
  const id = getParamId(request);
  const { departmentId, notes } = request.body;

  const complaint = await assignAdminComplaintDepartment(
    actor,
    id,
    departmentId,
    notes,
  );

  response.status(200).json({
    success: true,
    message:
      departmentId !== null && departmentId !== undefined
        ? "Complaint assigned to department successfully."
        : "Complaint unassigned from department.",
    data: { complaint },
  });
};

export const assignComplaintHandler = assignComplaintDepartmentHandler;

export const verifyComplaintHandler: RequestHandler = async (
  request,
  response,
) => {
  const actor = getActor(request);
  const id = getParamId(request);
  const { notes } = request.body;

  const complaint = await verifyAdminComplaint(actor, id, notes);

  response.status(200).json({
    success: true,
    message: "Complaint verified successfully.",
    data: { complaint },
  });
};
