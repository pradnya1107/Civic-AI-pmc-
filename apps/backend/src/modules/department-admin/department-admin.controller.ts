import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error";
import {
  getDepartmentAdminMe,
  getDepartmentDashboardMetrics,
  getDepartmentAnalytics,
  getDepartmentComplaints,
  getDepartmentComplaintDetails,
  updateDepartmentComplaintStatus,
  updateDepartmentComplaintPriority,
  assignDepartmentComplaintOfficer,
  addDepartmentComplaintInternalNote,
  verifyDepartmentComplaintResolution,
  getDepartmentOfficers,
  createDepartmentOfficer,
  exportDepartmentComplaintsCsv,
  type DepartmentAdminActor,
} from "./department-admin.service";

function getAuthorizedDepartmentId(request: Parameters<RequestHandler>[0]): string {
  const departmentId = request.user?.departmentId?.toString();
  if (!departmentId) {
    throw new AppError(
      "No department assignment is associated with your account.",
      403,
      "FORBIDDEN",
    );
  }
  return departmentId;
}

function getActor(request: Parameters<RequestHandler>[0]): DepartmentAdminActor {
  if (!request.user) {
    throw new AppError("Authentication is required.", 401, "UNAUTHORIZED");
  }
  const departmentId = getAuthorizedDepartmentId(request);
  return {
    id: request.user.id,
    name: request.user.fullName || "Department Admin",
    role: request.user.role,
    departmentId,
  };
}

function getParamId(request: Parameters<RequestHandler>[0]): string {
  const id = request.params.id;
  if (!id || typeof id !== "string") {
    throw new AppError("Invalid complaint ID parameter.", 400, "VALIDATION_ERROR");
  }
  return id;
}

export const getDepartmentAdminMeHandler: RequestHandler = async (request, response) => {
  if (!request.user?.id) {
    throw new AppError("Authentication is required.", 401, "UNAUTHORIZED");
  }
  const result = await getDepartmentAdminMe(request.user.id);
  response.status(200).json({
    success: true,
    data: result,
  });
};

export const getDepartmentDashboardHandler: RequestHandler = async (request, response) => {
  const departmentId = getAuthorizedDepartmentId(request);
  const data = await getDepartmentDashboardMetrics(departmentId);
  response.status(200).json({
    success: true,
    data,
  });
};

export const getDepartmentAnalyticsHandler: RequestHandler = async (request, response) => {
  const departmentId = getAuthorizedDepartmentId(request);
  const days = request.query.days ? parseInt(request.query.days as string, 10) : 14;
  const data = await getDepartmentAnalytics(departmentId, days);
  response.status(200).json({
    success: true,
    data,
  });
};

export const getDepartmentComplaintsHandler: RequestHandler = async (request, response) => {
  const departmentId = getAuthorizedDepartmentId(request);
  const result = await getDepartmentComplaints(departmentId, request.query);
  response.status(200).json({
    success: true,
    data: result,
  });
};

export const getDepartmentComplaintByIdHandler: RequestHandler = async (request, response) => {
  const departmentId = getAuthorizedDepartmentId(request);
  const id = getParamId(request);
  const result = await getDepartmentComplaintDetails(departmentId, id);
  response.status(200).json({
    success: true,
    data: result,
  });
};

export const updateComplaintStatusHandler: RequestHandler = async (request, response) => {
  const actor = getActor(request);
  const id = getParamId(request);
  const { status, notes, note } = request.body;

  if (!status) {
    throw new AppError("Status is required.", 400, "VALIDATION_ERROR");
  }

  const complaint = await updateDepartmentComplaintStatus(
    actor.departmentId,
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

export const updateComplaintPriorityHandler: RequestHandler = async (request, response) => {
  const actor = getActor(request);
  const id = getParamId(request);
  const { priority, notes } = request.body;

  if (!priority) {
    throw new AppError("Priority is required.", 400, "VALIDATION_ERROR");
  }

  const complaint = await updateDepartmentComplaintPriority(
    actor.departmentId,
    actor,
    id,
    priority,
    notes,
  );

  response.status(200).json({
    success: true,
    message: `Complaint priority updated to '${priority}'.`,
    data: { complaint },
  });
};

export const assignOfficerHandler: RequestHandler = async (request, response) => {
  const actor = getActor(request);
  const id = getParamId(request);
  const { officerId, name, phone, designation, notes } = request.body;

  const complaint = await assignDepartmentComplaintOfficer(
    actor.departmentId,
    actor,
    id,
    { officerId, name, phone, designation },
    notes,
  );

  response.status(200).json({
    success: true,
    message: name ? `Assigned to ${name} successfully.` : "Officer assignment updated.",
    data: { complaint },
  });
};

export const addInternalNoteHandler: RequestHandler = async (request, response) => {
  const actor = getActor(request);
  const id = getParamId(request);
  const { note } = request.body;

  const complaint = await addDepartmentComplaintInternalNote(
    actor.departmentId,
    actor,
    id,
    note,
  );

  response.status(200).json({
    success: true,
    message: "Internal note added successfully.",
    data: { complaint },
  });
};

export const verifyResolutionHandler: RequestHandler = async (request, response) => {
  const actor = getActor(request);
  const id = getParamId(request);
  const { verdict, notes, rejectionReason } = request.body;

  if (!verdict || !["APPROVE", "REJECT"].includes(verdict)) {
    throw new AppError("Verdict must be either 'APPROVE' or 'REJECT'.", 400, "VALIDATION_ERROR");
  }

  const complaint = await verifyDepartmentComplaintResolution(
    actor.departmentId,
    actor,
    id,
    verdict,
    notes,
    rejectionReason,
  );

  response.status(200).json({
    success: true,
    message:
      verdict === "APPROVE"
        ? "Resolution approved and verified."
        : "Resolution rejected and reopened for inspection.",
    data: { complaint },
  });
};

export const getDepartmentOfficersHandler: RequestHandler = async (request, response) => {
  const departmentId = getAuthorizedDepartmentId(request);
  const officers = await getDepartmentOfficers(departmentId);
  response.status(200).json({
    success: true,
    data: { officers },
  });
};

export const createDepartmentOfficerHandler: RequestHandler = async (request, response) => {
  const departmentId = getAuthorizedDepartmentId(request);
  const officer = await createDepartmentOfficer(departmentId, request.body);
  response.status(201).json({
    success: true,
    message: "Department field officer created successfully.",
    data: { officer },
  });
};

export const exportComplaintsCsvHandler: RequestHandler = async (request, response) => {
  const departmentId = getAuthorizedDepartmentId(request);
  const csv = await exportDepartmentComplaintsCsv(departmentId);

  response.setHeader("Content-Type", "text/csv");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="department-complaints-${new Date().toISOString().split("T")[0]}.csv"`,
  );
  response.status(200).send(csv);
};
