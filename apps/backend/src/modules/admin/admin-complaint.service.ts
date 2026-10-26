import { Types } from "mongoose";
import { AppError } from "../../utils/app-error";
import { Complaint, type ComplaintStatus, type ComplaintPriority } from "../complaints/complaint.model";
import { User } from "../users/user.model";
import { Department } from "../departments/department.model";
import { AuditLog } from "../audit/auditLog.model";
import { Notification } from "../notifications/notification.model";
import { recordComplaintUpdate } from "../notifications/notification.service";

export interface AdminActor {
  id: string;
  role: string;
  departmentId?: string;
}

export interface AdminComplaintListQuery {
  page?: string | number;
  limit?: string | number;
  status?: string;
  category?: string;
  departmentId?: string;
  priority?: string;
  search?: string;
  sortBy?: "newest" | "oldest" | "priority" | "status";
}

const VALID_TRANSITIONS: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "IN_PROGRESS", "REJECTED"],
  UNDER_REVIEW: ["ASSIGNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "UNDER_REVIEW"],
  IN_PROGRESS: ["RESOLVED", "UNDER_REVIEW"],
  RESOLVED: ["IN_PROGRESS", "UNDER_REVIEW"], // Super Admin rejection / reopening of fake/invalid resolutions
  REJECTED: [],
};

function requireObjectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError("Invalid complaint ID format.", 400, "VALIDATION_ERROR");
  }
  return new Types.ObjectId(value);
}

export async function listAdminComplaints(query: AdminComplaintListQuery) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));

  const filter: Record<string, unknown> = {};

  if (query.status && query.status !== "ALL") {
    filter.status = query.status;
  }

  if (query.category && query.category !== "ALL") {
    filter.category = query.category;
  }

  if (query.departmentId && query.departmentId !== "ALL") {
    filter.departmentId = new Types.ObjectId(query.departmentId);
  }

  if (query.priority && query.priority !== "ALL") {
    filter.priority = query.priority;
  }

  if (query.search && query.search.trim()) {
    const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [
      { complaintNumber: regex },
      { title: regex },
      { description: regex },
      { category: regex },
      { "location.address": regex },
      { "location.ward": regex },
    ];
  }

  let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
  if (query.sortBy === "oldest") {
    sortOption = { createdAt: 1 };
  } else if (query.sortBy === "status") {
    sortOption = { status: 1, createdAt: -1 };
  }

  const [complaints, total, metricsRaw] = await Promise.all([
    Complaint.find(filter)
      .populate("departmentId", "name slug")
      .populate("citizenId", "fullName email phoneNumber")
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(filter),
    Complaint.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const metrics: Record<string, number> = {
    total: 0,
    submitted: 0,
    underReview: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    closed: 0,
  };

  for (const item of metricsRaw) {
    const count = item.count || 0;
    metrics.total += count;
    switch (item._id) {
      case "SUBMITTED":
        metrics.submitted = count;
        break;
      case "UNDER_REVIEW":
        metrics.underReview = count;
        break;
      case "ASSIGNED":
        metrics.assigned = count;
        break;
      case "IN_PROGRESS":
        metrics.inProgress = count;
        break;
      case "RESOLVED":
        metrics.resolved = count;
        break;
      case "REJECTED":
        metrics.rejected = count;
        break;
      case "CLOSED":
        metrics.closed = count;
        break;
    }
  }

  return {
    complaints,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
    metrics,
  };
}

export async function adminListComplaints(
  actor: AdminActor,
  query: AdminComplaintListQuery,
) {
  const enrichedQuery = { ...query };
  if (actor.role === "DEPARTMENT_ADMIN" && actor.departmentId) {
    enrichedQuery.departmentId = actor.departmentId;
  }
  return listAdminComplaints(enrichedQuery);
}

export async function getAdminComplaintById(id: string) {
  const objectId = requireObjectId(id);
  const complaint = await Complaint.findById(objectId)
    .populate("departmentId", "name slug contactEmail contactPhone")
    .populate("citizenId", "fullName email phoneNumber")
    .lean();

  if (!complaint) {
    throw new AppError("Complaint not found.", 404, "COMPLAINT_NOT_FOUND");
  }

  const auditLogs = await AuditLog.find({ targetRef: objectId })
    .populate("actorRef", "fullName email role")
    .sort({ createdAt: -1 })
    .lean();

  return {
    complaint,
    auditLogs,
  };
}

export async function adminGetComplaint(actor: AdminActor, id: string) {
  const res = await getAdminComplaintById(id);
  if (actor.role === "DEPARTMENT_ADMIN" && actor.departmentId) {
    const deptId = (res.complaint.departmentId as any)?._id?.toString() || res.complaint.departmentId?.toString();
    if (!deptId || deptId !== actor.departmentId) {
      throw new AppError(
        "You do not have permission to access complaints belonging to another department.",
        403,
        "FORBIDDEN",
      );
    }
  }
  return res.complaint;
}

export async function updateAdminComplaintStatus(
  actor: AdminActor,
  id: string,
  newStatus: ComplaintStatus,
  notes?: string,
) {
  const objectId = requireObjectId(id);
  const complaint = await Complaint.findById(objectId);
  if (!complaint) {
    throw new AppError("Complaint not found.", 404, "COMPLAINT_NOT_FOUND");
  }

  if (actor.role === "DEPARTMENT_ADMIN" && actor.departmentId) {
    const deptId = complaint.departmentId?.toString();
    if (!deptId || deptId !== actor.departmentId) {
      throw new AppError(
        "You do not have permission to manage complaints belonging to another department.",
        403,
        "FORBIDDEN",
      );
    }
  }

  const allowed = VALID_TRANSITIONS[complaint.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Cannot transition complaint from '${complaint.status}' to '${newStatus}'. Allowed transitions: ${allowed.length > 0 ? allowed.join(", ") : "none"}`,
      400,
      "INVALID_STATUS_TRANSITION",
    );
  }

  const oldStatus = complaint.status;
  complaint.status = newStatus;
  await complaint.save();

  // Create Audit Log
  await AuditLog.create({
    actorRef: requireObjectId(actor.id),
    action: "STATUS_UPDATE",
    targetRef: complaint._id,
    targetModel: "Complaint",
    metadata: {
      oldStatus,
      newStatus,
      notes: notes || undefined,
      complaintNumber: complaint.complaintNumber,
    },
  });

  // Create citizen notification
  try {
    await Notification.create({
      recipientId: complaint.citizenId,
      complaintId: complaint._id,
      type: "COMPLAINT_UPDATED",
      title: "Complaint Status Updated",
      message: `Complaint ${complaint.complaintNumber} status changed from ${oldStatus} to ${newStatus}.${notes ? ` Note: ${notes}` : ""}`,
    });
  } catch (err) {
    console.error("Failed to dispatch status notification:", err);
  }

  return Complaint.findById(objectId)
    .populate("departmentId", "name slug")
    .populate("citizenId", "fullName email phoneNumber")
    .lean();
}

export async function adminUpdateComplaintStatus(
  actor: AdminActor,
  id: string,
  newStatus: ComplaintStatus,
  note?: string,
) {
  return updateAdminComplaintStatus(actor, id, newStatus, note);
}

export async function assignAdminComplaintDepartment(
  actor: AdminActor,
  id: string,
  departmentId?: string | null,
  notes?: string,
) {
  const objectId = requireObjectId(id);
  const complaint = await Complaint.findById(objectId);
  if (!complaint) {
    throw new AppError("Complaint not found.", 404, "COMPLAINT_NOT_FOUND");
  }

  let deptDoc = null;
  if (departmentId) {
    const deptObjectId = requireObjectId(departmentId);
    deptDoc = await Department.findById(deptObjectId);
    if (!deptDoc) {
      throw new AppError("Department not found.", 400, "INVALID_DEPARTMENT");
    }
    complaint.departmentId = deptObjectId;
    if (complaint.status === "SUBMITTED" || complaint.status === "UNDER_REVIEW") {
      complaint.status = "ASSIGNED";
    }
  } else {
    complaint.departmentId = undefined;
    if (complaint.status === "ASSIGNED") {
      complaint.status = "UNDER_REVIEW";
    }
  }

  await complaint.save();

  // Create Audit Log
  await AuditLog.create({
    actorRef: requireObjectId(actor.id),
    action: "ASSIGN_DEPARTMENT",
    targetRef: complaint._id,
    targetModel: "Complaint",
    metadata: {
      departmentId: deptDoc?._id,
      departmentName: deptDoc?.name || "Unassigned",
      notes: notes || undefined,
      complaintNumber: complaint.complaintNumber,
    },
  });

  // Create citizen notification
  try {
    await Notification.create({
      recipientId: complaint.citizenId,
      complaintId: complaint._id,
      type: "COMPLAINT_UPDATED",
      title: "Department Assigned",
      message: `Complaint ${complaint.complaintNumber} has been assigned to ${deptDoc ? deptDoc.name : "municipal department"}.`,
    });
  } catch (err) {
    console.error("Failed to dispatch assign notification:", err);
  }

  return Complaint.findById(objectId)
    .populate("departmentId", "name slug")
    .populate("citizenId", "fullName email phoneNumber")
    .lean();
}

export async function adminAssignComplaint(
  actor: AdminActor,
  id: string,
  departmentId: string | null,
) {
  return assignAdminComplaintDepartment(actor, id, departmentId);
}

export async function verifyAdminComplaint(
  actor: AdminActor,
  id: string,
  notes?: string,
) {
  const objectId = requireObjectId(id);
  const complaint = await Complaint.findById(objectId);
  if (!complaint) {
    throw new AppError("Complaint not found.", 404, "COMPLAINT_NOT_FOUND");
  }

  const oldStatus = complaint.status;
  complaint.status = "UNDER_REVIEW";
  await complaint.save();

  // Create Audit Log
  await AuditLog.create({
    actorRef: requireObjectId(actor.id),
    action: "VERIFY_COMPLAINT",
    targetRef: complaint._id,
    targetModel: "Complaint",
    metadata: {
      previousStatus: oldStatus,
      status: "UNDER_REVIEW",
      notes: notes || "Verified by PMC municipal administration",
      complaintNumber: complaint.complaintNumber,
    },
  });

  // Create citizen notification
  try {
    await Notification.create({
      recipientId: complaint.citizenId,
      complaintId: complaint._id,
      type: "COMPLAINT_UPDATED",
      title: "Complaint Verified",
      message: `Complaint ${complaint.complaintNumber} has been verified by the municipal authority and is under active review.`,
    });
  } catch (err) {
    console.error("Failed to dispatch verify notification:", err);
  }

  return Complaint.findById(objectId)
    .populate("departmentId", "name slug")
    .populate("citizenId", "fullName email phoneNumber")
    .lean();
}

/**
 * Super Admin rejects fraudulent or incorrect resolution evidence and reopens complaint
 */
export async function rejectComplaintResolution(
  adminActor: AdminActor,
  complaintId: string,
  input: { reason: string; returnedStatus?: "IN_PROGRESS" | "UNDER_REVIEW" },
) {
  const objectId = requireObjectId(complaintId);
  const complaint = await Complaint.findById(objectId);
  if (!complaint) {
    throw new AppError("Complaint not found.", 404, "COMPLAINT_NOT_FOUND");
  }

  if (complaint.status !== "RESOLVED") {
    throw new AppError(
      "Only resolved complaints can have their resolution evidence rejected.",
      400,
      "INVALID_STATUS_TRANSITION",
    );
  }

  const reason = (input.reason || "").trim();
  if (!reason || reason.length < 10) {
    throw new AppError(
      "A detailed rejection reason of at least 10 characters is required.",
      400,
      "VALIDATION_ERROR",
    );
  }

  const returnedStatus = input.returnedStatus || "IN_PROGRESS";
  const adminUser = await User.findById(requireObjectId(adminActor.id))
    .select("fullName email role")
    .lean();

  const previousResolutionImageUrl = complaint.resolutionImageUrl;
  const previousResolutionNotes = complaint.resolutionNotes;
  const resolvingOfficerName =
    complaint.resolutionAudit?.resolvedBy?.officerName ||
    complaint.assignedOfficer?.name ||
    "Field Officer";

  complaint.status = returnedStatus;
  complaint.resolutionAudit = {
    ...(complaint.resolutionAudit || {}),
    isRejectionActive: true,
    rejectedBy: {
      adminId: requireObjectId(adminActor.id),
      adminName: adminUser?.fullName || "Super Admin",
      adminEmail: adminUser?.email,
    },
    rejectionReason: reason,
    rejectedAt: new Date(),
    previousResolutionImageUrl,
    returnedStatus,
  };

  await complaint.save();

  // Audit Log: Record Super Admin resolution rejection
  await AuditLog.create({
    actorRef: requireObjectId(adminActor.id),
    action: "RESOLUTION_EVIDENCE_REJECTED_BY_ADMIN",
    targetRef: complaint._id,
    targetModel: "Complaint",
    metadata: {
      action: "SUPER_ADMIN_REJECTED_RESOLUTION",
      previousStatus: "RESOLVED",
      newStatus: returnedStatus,
      rejectionReason: reason,
      rejectedBy: adminUser?.fullName || "Super Admin",
      resolvingOfficer: resolvingOfficerName,
      previousResolutionNotes,
      previousResolutionImageUrl,
      complaintNumber: complaint.complaintNumber,
    },
  });

  // Notify citizen that complaint resolution was rejected by PMC and returned to active work
  try {
    await Notification.create({
      recipientId: complaint.citizenId,
      complaintId: complaint._id,
      type: "COMPLAINT_UPDATED",
      title: "Resolution Under Re-Investigation",
      message: `PMC Administration audited complaint ${complaint.complaintNumber}: Previous resolution evidence did not meet municipal standards and has been reopened for proper remediation.`,
    });
  } catch (notifErr) {
    console.error("Failed to notify citizen of resolution rejection:", notifErr);
  }

  await recordComplaintUpdate(complaint, returnedStatus);

  return Complaint.findById(objectId)
    .populate("departmentId", "name slug")
    .populate("citizenId", "fullName email phoneNumber")
    .lean();
}
