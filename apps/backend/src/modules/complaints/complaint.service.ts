import { Types } from "mongoose";
import type { UserRole } from "../users/user.model";
import { Department } from "../departments/department.model";
import { AppError } from "../../utils/app-error";
import { Complaint, calculateSlaDeadline } from "./complaint.model";
import { verifyResolution } from "../ai/gemini-ai.service";
import type {
  ComplaintListQuery,
  CreateComplaintInput,
  UpdateComplaintInput,
} from "./complaint.validation";
import {
  recordComplaintSubmission,
  recordComplaintUpdate,
} from "../notifications/notification.service";
import { Notification } from "../notifications/notification.model";
import { triggerAnalysisAsync } from "../ai/ai.service";
import { AuditLog } from "../audit/auditLog.model";

interface RequestActor {
  id: string;
  role: UserRole;
  departmentId?: string;
}

function requireObjectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

function isPrivilegedAdmin(role: UserRole): boolean {
  return role === "ADMIN" || role === "DEPARTMENT_ADMIN" || role === "SUPER_ADMIN";
}

function actorFilter(actor: RequestActor) {
  if (actor.role === "SUPER_ADMIN") {
    return {};
  }
  if (
    (actor.role === "ADMIN" || actor.role === "DEPARTMENT_ADMIN") &&
    actor.departmentId
  ) {
    return { departmentId: requireObjectId(actor.departmentId) };
  }
  if (actor.role === "ADMIN") {
    return {};
  }
  return { citizenId: requireObjectId(actor.id) };
}

function sanitizeText(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function notFound(): AppError {
  return new AppError("Complaint not found.", 404, "COMPLAINT_NOT_FOUND");
}

export async function createComplaint(
  actor: RequestActor,
  input: CreateComplaintInput,
) {
  const priority = input.priority || "MEDIUM";

  let departmentId: Types.ObjectId | undefined;
  try {
    const deptTerm = input.aiAnalysis?.suggestedDepartment || input.category;
    if (deptTerm) {
      const firstWord = deptTerm.split(/[ &/-]/)[0];
      const matchedDept = await Department.findOne({
        $or: [
          { name: { $regex: new RegExp(deptTerm, "i") } },
          { name: { $regex: new RegExp(firstWord, "i") } },
          { slug: { $regex: new RegExp(firstWord.toLowerCase(), "i") } },
        ],
        isActive: true,
      });
      if (matchedDept) {
        departmentId = matchedDept._id;
      }
    }
  } catch (deptErr) {
    console.warn("Could not auto-assign department:", deptErr);
  }

  // Requirement 8: Never reject complaints if image appears AI-generated; flag for manual officer review.
  const isPossibleAi = input.aiAnalysis?.authenticityAssessment?.possibleAiGenerated;
  const manualReviewNeeded = Boolean(input.aiAnalysis?.manualReviewNeeded || isPossibleAi);
  const manualReviewReason =
    input.aiAnalysis?.manualReviewReason ||
    (isPossibleAi
      ? "Image exhibits cues of possible AI synthesis or digital modification; marked for on-site municipal field verification."
      : undefined);

  const aiAnalysisPayload = input.aiAnalysis
    ? {
        ...input.aiAnalysis,
        manualReviewNeeded,
        ...(manualReviewReason ? { manualReviewReason } : {}),
      }
    : undefined;

  const sanitizedInput = {
    ...input,
    title: sanitizeText(input.title),
    description: sanitizeText(input.description),
    priority,
    ...(aiAnalysisPayload ? { aiAnalysis: aiAnalysisPayload } : {}),
    ...(departmentId ? { departmentId } : {}),
    slaDeadline: calculateSlaDeadline(priority),
    supporters: [],
    supportCount: 0,
  };
  const complaint = await Complaint.create({
    ...sanitizedInput,
    citizenId: requireObjectId(actor.id),
  });
  await recordComplaintSubmission(complaint);

  // Trigger AI analysis asynchronously in background without blocking
  const analysisText = `${complaint.title}. ${complaint.description}`;
  triggerAnalysisAsync(complaint._id, analysisText);

  return complaint.toJSON();
}

export async function listComplaints(
  actor: RequestActor,
  query: ComplaintListQuery,
) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const filter: any = {
    ...actorFilter(actor),
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.ward ? { "location.ward": query.ward } : {}),
  };

  if (query.search) {
    const s = query.search.trim();
    filter.$or = [
      { title: { $regex: s, $options: "i" } },
      { complaintNumber: { $regex: s, $options: "i" } },
      { "location.address": { $regex: s, $options: "i" } },
    ];
  }

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
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

export async function getComplaint(actor: RequestActor, id: string) {
  const objectId = requireObjectId(id);
  const complaint = await Complaint.findById(objectId).lean();
  if (!complaint) {
    throw notFound();
  }

  if (actor.role === "CITIZEN") {
    if (complaint.citizenId.toString() !== actor.id) {
      throw notFound();
    }
  } else if (
    (actor.role === "ADMIN" || actor.role === "DEPARTMENT_ADMIN") &&
    actor.departmentId
  ) {
    if (
      !complaint.departmentId ||
      complaint.departmentId.toString() !== actor.departmentId
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

export async function updateComplaint(
  actor: RequestActor,
  id: string,
  patch: UpdateComplaintInput,
) {
  if (
    !isPrivilegedAdmin(actor.role) &&
    (patch.status !== undefined ||
      patch.priority !== undefined ||
      patch.departmentId !== undefined)
  ) {
    throw new AppError(
      "Only administrators can change complaint status, priority, or department.",
      403,
      "FORBIDDEN",
    );
  }

  const existingComplaint = await Complaint.findById(requireObjectId(id));

  // Cross-department check for department admin
  if (
    (actor.role === "ADMIN" || actor.role === "DEPARTMENT_ADMIN") &&
    actor.departmentId
  ) {
    if (
      existingComplaint &&
      existingComplaint.departmentId &&
      existingComplaint.departmentId.toString() !== actor.departmentId
    ) {
      throw new AppError(
        "You do not have permission to access complaints belonging to another department.",
        403,
        "FORBIDDEN",
      );
    }
  }

  const updates: Record<string, unknown> = { ...patch };
  if (typeof patch.title === "string") {
    updates.title = sanitizeText(patch.title);
  }
  if (typeof patch.description === "string") {
    updates.description = sanitizeText(patch.description);
  }
  const unset: Record<string, 1> = {};
  if (patch.departmentId !== undefined) {
    if (patch.departmentId === null) {
      delete updates.departmentId;
      unset.departmentId = 1;
    } else {
      const departmentExists = await Department.exists({
        _id: patch.departmentId,
        isActive: true,
      });
      if (!departmentExists) {
        throw new AppError(
          "The selected department is unavailable.",
          400,
          "INVALID_DEPARTMENT",
        );
      }
      updates.departmentId = requireObjectId(patch.departmentId);
    }
  }

  const updated = await Complaint.findOneAndUpdate(
    {
      _id: requireObjectId(id),
      ...actorFilter(actor),
      ...(isPrivilegedAdmin(actor.role) ? {} : { status: "SUBMITTED" }),
    },
    {
      $set: updates,
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    },
    { returnDocument: "after", runValidators: true },
  );

  if (!updated) {
    if (
      !isPrivilegedAdmin(actor.role) &&
      (await Complaint.exists({
        _id: requireObjectId(id),
        ...actorFilter(actor),
      }))
    ) {
      throw new AppError(
        "A complaint can only be edited before it is reviewed.",
        409,
        "COMPLAINT_NOT_EDITABLE",
      );
    }
    throw notFound();
  }

  if (isPrivilegedAdmin(actor.role)) {
    if (patch.status !== undefined) {
      await AuditLog.create({
        actorRef: requireObjectId(actor.id),
        action: "STATUS_UPDATE",
        targetRef: updated._id,
        targetModel: "Complaint",
        metadata: {
          previousStatus: existingComplaint?.status,
          newStatus: updated.status,
          complaintNumber: updated.complaintNumber,
        },
      });
      await recordComplaintUpdate(updated, updated.status);
    }
    if (patch.departmentId !== undefined) {
      await AuditLog.create({
        actorRef: requireObjectId(actor.id),
        action: "ASSIGN_DEPARTMENT",
        targetRef: updated._id,
        targetModel: "Complaint",
        metadata: {
          departmentId: updated.departmentId,
          complaintNumber: updated.complaintNumber,
        },
      });
      if (patch.status === undefined) {
        await recordComplaintUpdate(updated, updated.status);
      }
    }
  }

  return updated.toJSON();
}

export async function deleteComplaint(
  actor: RequestActor,
  id: string,
): Promise<void> {
  const complaintObjectId = requireObjectId(id);
  const complaint = await Complaint.findById(complaintObjectId);
  if (!complaint) {
    throw notFound();
  }

  if (actor.role !== "ADMIN") {
    if (complaint.citizenId.toString() !== actor.id) {
      throw notFound();
    }

    if (complaint.status !== "SUBMITTED") {
      throw new AppError(
        "A complaint can only be deleted before it is reviewed.",
        400,
        "COMPLAINT_NOT_DELETABLE",
      );
    }
  } else {
    if (complaint.status !== "RESOLVED") {
      throw new AppError(
        "Only resolved complaints can be deleted by administrators.",
        400,
        "COMPLAINT_NOT_DELETABLE",
      );
    }
  }

  const deleted = await Complaint.findByIdAndDelete(complaintObjectId);
  if (!deleted) {
    throw notFound();
  }

  await Notification.deleteMany({ complaintId: complaintObjectId });
}

/**
 * Fetch geospatial heatmap points for Pune Smart City Map
 */
export async function getHeatmapData(filterQuery: {
  category?: string;
  priority?: string;
  status?: string;
  ward?: string;
}) {
  const filter: any = {};
  if (filterQuery.category && filterQuery.category !== "ALL") {
    filter.category = filterQuery.category;
  }
  if (filterQuery.priority && filterQuery.priority !== "ALL") {
    filter.priority = filterQuery.priority;
  }
  if (filterQuery.status && filterQuery.status !== "ALL") {
    filter.status = filterQuery.status;
  }
  if (filterQuery.ward && filterQuery.ward !== "ALL") {
    filter["location.ward"] = filterQuery.ward;
  }

  // Ensure only complaints with valid latitude/longitude are returned on the heatmap
  filter["location.latitude"] = { $exists: true, $ne: null };
  filter["location.longitude"] = { $exists: true, $ne: null };

  const points = await Complaint.find(filter)
    .select(
      "_id complaintNumber title category priority status location imageUrl resolutionImageUrl supportCount createdAt updatedAt slaDeadline aiAnalysis",
    )
    .populate("departmentId", "name slug")
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  return points;
}

/**
 * Resolve complaint with repair photo and AI before/after verification
 */
export async function resolveComplaintWithVerification(
  actor: RequestActor,
  id: string,
  input: { resolutionImageUrl?: string; resolutionNotes?: string },
) {
  if (!isPrivilegedAdmin(actor.role)) {
    throw new AppError("Only administrators can resolve complaints.", 403, "FORBIDDEN");
  }
  const complaint = await Complaint.findById(requireObjectId(id));
  if (!complaint) throw notFound();

  let aiVerdict: any = undefined;
  if (complaint.imageUrl && input.resolutionImageUrl) {
    try {
      const verification = await verifyResolution({
        originalImageUrl: complaint.imageUrl,
        resolutionImageUrl: input.resolutionImageUrl,
        title: complaint.title,
        category: complaint.category,
      });
      aiVerdict = {
        resolutionVerdict: verification.verdict,
        resolutionConfidence: verification.confidence,
        resolutionAnalysis: verification.analysis,
      };
    } catch (e) {
      console.warn("AI verification error:", e);
    }
  }

  complaint.status = "RESOLVED";
  if (input.resolutionImageUrl) complaint.resolutionImageUrl = input.resolutionImageUrl;
  if (input.resolutionNotes) complaint.resolutionNotes = input.resolutionNotes;
  if (aiVerdict) {
    complaint.aiAnalysis = {
      ...(complaint.aiAnalysis || {}),
      ...aiVerdict,
    };
  }

  await complaint.save();

  await AuditLog.create({
    actorRef: requireObjectId(actor.id),
    action: "STATUS_UPDATE",
    targetRef: complaint._id,
    targetModel: "Complaint",
    metadata: {
      action: "RESOLVE_WITH_VERIFICATION",
      previousStatus: "IN_PROGRESS",
      newStatus: "RESOLVED",
      resolutionVerdict: aiVerdict?.resolutionVerdict || "MANUAL_VERIFIED",
    },
  });

  await recordComplaintUpdate(complaint, "RESOLVED");

  return complaint.toJSON();
}

/**
 * Citizen confirms the municipal resolution
 */
export async function confirmResolutionByCitizen(
  actor: RequestActor,
  id: string,
  input: { rating?: number; feedback?: string },
) {
  const complaint = await Complaint.findById(requireObjectId(id));
  if (!complaint) throw notFound();
  if (complaint.citizenId.toString() !== actor.id) {
    throw new AppError("Only the complainant can confirm resolution.", 403, "FORBIDDEN");
  }

  complaint.citizenConfirmation = {
    confirmed: true,
    rating: input.rating || 5,
    feedback: input.feedback || "Citizen confirmed resolution satisfactory.",
    confirmedAt: new Date(),
  };

  await complaint.save();

  await AuditLog.create({
    actorRef: requireObjectId(actor.id),
    action: "STATUS_UPDATE",
    targetRef: complaint._id,
    targetModel: "Complaint",
    metadata: {
      action: "CITIZEN_CONFIRMED_RESOLUTION",
      rating: input.rating,
      complaintNumber: complaint.complaintNumber,
    },
  });

  return complaint.toJSON();
}

/**
 * Citizen disputes the resolution and reopens the complaint
 */
export async function disputeResolutionByCitizen(
  actor: RequestActor,
  id: string,
  input: { reason: string },
) {
  const complaint = await Complaint.findById(requireObjectId(id));
  if (!complaint) throw notFound();
  if (complaint.citizenId.toString() !== actor.id) {
    throw new AppError("Only the complainant can dispute resolution.", 403, "FORBIDDEN");
  }

  complaint.status = "UNDER_REVIEW";
  complaint.citizenConfirmation = {
    disputed: true,
    disputeReason: input.reason,
    disputedAt: new Date(),
  };

  await complaint.save();

  await AuditLog.create({
    actorRef: requireObjectId(actor.id),
    action: "STATUS_UPDATE",
    targetRef: complaint._id,
    targetModel: "Complaint",
    metadata: {
      action: "CITIZEN_DISPUTED_RESOLUTION",
      disputeReason: input.reason,
      newStatus: "UNDER_REVIEW",
      complaintNumber: complaint.complaintNumber,
    },
  });

  await recordComplaintUpdate(complaint, "UNDER_REVIEW");

  return complaint.toJSON();
}

/**
 * SLA monitoring and overdue breach overview
 */
export async function getSlaMonitoringOverview() {
  const now = new Date();
  const approaching = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const openFilter = {
    status: { $in: ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS"] },
  };

  const [totalOpen, overdueComplaints, approachingComplaints, resolvedCount] = await Promise.all([
    Complaint.countDocuments(openFilter as any),
    Complaint.find({
      ...openFilter,
      slaDeadline: { $lt: now },
    } as any)
      .sort({ slaDeadline: 1 })
      .populate("departmentId", "name slug")
      .limit(50)
      .lean(),
    Complaint.find({
      ...openFilter,
      slaDeadline: { $gte: now, $lte: approaching },
    } as any)
      .sort({ slaDeadline: 1 })
      .populate("departmentId", "name slug")
      .limit(50)
      .lean(),
    Complaint.countDocuments({ status: "RESOLVED" }),
  ]);

  const overdueCount = overdueComplaints.length;
  const compliantCount = Math.max(0, totalOpen - overdueCount);
  const complianceRate = totalOpen > 0 ? Math.round((compliantCount / totalOpen) * 100) : 100;

  return {
    totalOpen,
    overdueCount,
    approachingCount: approachingComplaints.length,
    resolvedCount,
    complianceRate,
    overdueComplaints,
    approachingComplaints,
  };
}
