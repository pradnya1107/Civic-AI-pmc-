import { Types } from "mongoose";
import { Complaint, COMPLAINT_STATUSES } from "../complaints/complaint.model";
import type { ComplaintStatus } from "../complaints/complaint.model";
import { Department } from "../departments/department.model";
import { AuditLog } from "../audit/auditLog.model";
import { AppError } from "../../utils/app-error";
import { recordComplaintUpdate } from "../notifications/notification.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminComplaintListQuery {
  status?: ComplaintStatus;
  category?: string;
  departmentId?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

// Valid lifecycle transitions — key: current status, value: allowed next statuses
const VALID_TRANSITIONS: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["ASSIGNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "UNDER_REVIEW"],
  IN_PROGRESS: ["RESOLVED", "UNDER_REVIEW"],
  RESOLVED: [],
  REJECTED: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireObjectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError("Invalid ID format.", 400, "INVALID_ID");
  }
  return new Types.ObjectId(value);
}

async function writeAuditLog(
  actorId: string,
  action: string,
  complaintId: Types.ObjectId,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await AuditLog.create({
    actorRef: requireObjectId(actorId),
    action,
    targetRef: complaintId,
    targetModel: "Complaint",
    metadata,
  });
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Admin — list all complaints with optional filters and pagination.
 * SUPER_ADMIN and ADMIN see all; DEPARTMENT_ADMIN sees only their department.
 */
export async function adminListComplaints(
  actor: { id: string; role: string; departmentId?: string },
  query: AdminComplaintListQuery,
) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));

  const filter: Record<string, unknown> = {};

  // Department admins are scoped to their own department
  if (actor.role === "DEPARTMENT_ADMIN" && actor.departmentId) {
    filter.departmentId = requireObjectId(actor.departmentId);
  } else if (query.departmentId) {
    filter.departmentId = requireObjectId(query.departmentId);
  }

  if (query.status) filter.status = query.status;
  if (query.category) filter.category = { $regex: query.category, $options: "i" };
  if (query.priority) filter.priority = query.priority;

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate("citizenId", "fullName email")
      .populate("departmentId", "name slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  return {
    complaints,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Admin — get a single complaint by ID (with populated fields).
 * DEPARTMENT_ADMIN is scoped to their own department.
 */
export async function adminGetComplaint(
  actor: { id: string; role: string; departmentId?: string },
  id: string,
) {
  const complaint = await Complaint.findById(requireObjectId(id))
    .populate("citizenId", "fullName email")
    .populate("departmentId", "name slug")
    .lean();

  if (!complaint) {
    throw new AppError("Complaint not found.", 404, "COMPLAINT_NOT_FOUND");
  }

  // Department admin cross-department check
  if (actor.role === "DEPARTMENT_ADMIN" && actor.departmentId) {
    if (
      !complaint.departmentId ||
      (complaint.departmentId as Types.ObjectId).toString() !== actor.departmentId
    ) {
      throw new AppError(
        "You do not have permission to access complaints belonging to another department.",
        403,
        "FORBIDDEN",
      );
    }
  }

  return complaint;
}

/**
 * Admin — update complaint status with lifecycle transition validation.
 * Records an AuditLog entry and fires notification on each valid transition.
 */
export async function adminUpdateComplaintStatus(
  actor: { id: string; role: string; departmentId?: string },
  id: string,
  newStatus: ComplaintStatus,
  note?: string,
) {
  const complaintId = requireObjectId(id);

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new AppError("Complaint not found.", 404, "COMPLAINT_NOT_FOUND");
  }

  // Department admin cross-department guard
  if (actor.role === "DEPARTMENT_ADMIN" && actor.departmentId) {
    if (
      !complaint.departmentId ||
      complaint.departmentId.toString() !== actor.departmentId
    ) {
      throw new AppError(
        "You do not have permission to manage complaints belonging to another department.",
        403,
        "FORBIDDEN",
      );
    }
  }

  const allowed = VALID_TRANSITIONS[complaint.status];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Cannot transition complaint from '${complaint.status}' to '${newStatus}'. ` +
        `Allowed transitions: ${allowed.length > 0 ? allowed.join(", ") : "none (terminal state)"}`,
      400,
      "INVALID_STATUS_TRANSITION",
    );
  }

  const previousStatus = complaint.status;
  complaint.status = newStatus;
  await complaint.save();

  // Audit log
  await writeAuditLog(actor.id, "COMPLAINT_STATUS_UPDATED", complaintId, {
    previousStatus,
    newStatus,
    note: note ?? null,
    complaintNumber: complaint.complaintNumber,
  });

  // Notify citizen
  await recordComplaintUpdate(complaint, newStatus);

  return complaint.toJSON();
}

/**
 * Admin — assign (or unassign) a complaint to a department.
 * Automatically advances status to ASSIGNED when a department is set.
 */
export async function adminAssignComplaint(
  actor: { id: string; role: string },
  id: string,
  departmentId: string | null,
) {
  const complaintId = requireObjectId(id);

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new AppError("Complaint not found.", 404, "COMPLAINT_NOT_FOUND");
  }

  let newDeptId: Types.ObjectId | undefined;

  if (departmentId !== null) {
    const dept = await Department.findOne({
      _id: requireObjectId(departmentId),
      isActive: true,
    });
    if (!dept) {
      throw new AppError(
        "The selected department is unavailable or does not exist.",
        400,
        "INVALID_DEPARTMENT",
      );
    }
    newDeptId = dept._id as Types.ObjectId;
  }

  const previousDepartmentId = complaint.departmentId?.toString() ?? null;
  complaint.departmentId = newDeptId;

  // Auto-advance status to ASSIGNED when a department is set (if currently SUBMITTED/UNDER_REVIEW)
  let statusAdvanced = false;
  if (
    newDeptId &&
    (complaint.status === "SUBMITTED" || complaint.status === "UNDER_REVIEW")
  ) {
    complaint.status = "ASSIGNED";
    statusAdvanced = true;
  }

  // If unassigning, revert to UNDER_REVIEW if it was ASSIGNED
  if (!newDeptId && complaint.status === "ASSIGNED") {
    complaint.status = "UNDER_REVIEW";
  }

  await complaint.save();

  // Audit log
  await writeAuditLog(actor.id, "COMPLAINT_ASSIGNED", complaintId, {
    previousDepartmentId,
    newDepartmentId: newDeptId?.toString() ?? null,
    statusAdvanced,
    complaintNumber: complaint.complaintNumber,
  });

  if (statusAdvanced) {
    await recordComplaintUpdate(complaint, complaint.status);
  }

  const populated = await Complaint.findById(complaintId)
    .populate("citizenId", "fullName email")
    .populate("departmentId", "name slug")
    .lean();

  return populated;
}
