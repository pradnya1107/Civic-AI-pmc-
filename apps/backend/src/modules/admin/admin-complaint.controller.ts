import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error";
import type {
  AdminAssignInput,
  AdminComplaintListQuery,
  AdminStatusUpdateInput,
} from "./admin-complaint.validation";
import {
  adminAssignComplaint,
  adminGetComplaint,
  adminListComplaints,
  adminUpdateComplaintStatus,
} from "./admin-complaint.service";
import type { ComplaintStatus } from "../complaints/complaint.model";

function actorFromRequest(request: Parameters<RequestHandler>[0]) {
  const user = request.user;
  if (!user) {
    throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
  }
  return { id: user.id, role: user.role, departmentId: user.departmentId };
}

function requireId(request: Parameters<RequestHandler>[0]): string {
  const id = request.params.id;
  if (typeof id !== "string") {
    throw new AppError("Invalid complaint ID.", 400, "VALIDATION_ERROR");
  }
  return id;
}

/**
 * GET /api/v1/admin/complaints
 * List all complaints with pagination and optional filters.
 */
export const listComplaintsHandler: RequestHandler = async (
  request,
  response,
) => {
  const query = request.validatedQuery as AdminComplaintListQuery;
  const result = await adminListComplaints(actorFromRequest(request), {
    ...query,
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
  });
  response.status(200).json({ success: true, data: result });
};

/**
 * GET /api/v1/admin/complaints/:id
 * Get a single complaint by ID (with populated citizen and department).
 */
export const getComplaintHandler: RequestHandler = async (request, response) => {
  const complaint = await adminGetComplaint(
    actorFromRequest(request),
    requireId(request),
  );
  response.status(200).json({ success: true, data: { complaint } });
};

/**
 * PATCH /api/v1/admin/complaints/:id/status
 * Advance the complaint status lifecycle.
 */
export const updateStatusHandler: RequestHandler = async (request, response) => {
  const body = request.body as AdminStatusUpdateInput;
  const updated = await adminUpdateComplaintStatus(
    actorFromRequest(request),
    requireId(request),
    body.status as ComplaintStatus,
    body.note,
  );
  response.status(200).json({
    success: true,
    message: `Complaint status updated to '${updated.status}'.`,
    data: { complaint: updated },
  });
};

/**
 * PATCH /api/v1/admin/complaints/:id/assign
 * Assign (or unassign) a complaint to a department.
 */
export const assignComplaintHandler: RequestHandler = async (
  request,
  response,
) => {
  const body = request.body as AdminAssignInput;
  const updated = await adminAssignComplaint(
    actorFromRequest(request),
    requireId(request),
    body.departmentId,
  );
  response.status(200).json({
    success: true,
    message:
      body.departmentId !== null
        ? "Complaint assigned to department successfully."
        : "Complaint unassigned from department.",
    data: { complaint: updated },
  });
};
