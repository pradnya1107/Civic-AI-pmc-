import { Types } from "mongoose";
import { User, type UserRole } from "../users/user.model";
import { Department } from "../departments/department.model";
import { AppError } from "../../utils/app-error";
import { Complaint, calculateSlaDeadline } from "./complaint.model";
import { getSlaStatusDetails, PMC_PUBLIC_HOLIDAYS } from "./sla-calendar.service";
import { verifyResolution, isGoogleOrWebSearchUrl } from "../ai/gemini-ai.service";
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

  // Check AI confidence and authenticity flags
  const isPossibleAi = Boolean(input.aiAnalysis?.authenticityAssessment?.possibleAiGenerated);

  // Extract calibrated confidence score if supplied by provider (do not invent if not provided)
  const aiConfidenceScore = typeof input.aiAnalysis?.confidenceScore === "number"
    ? input.aiAnalysis.confidenceScore
    : (typeof input.aiAnalysis?.confidence === "number"
        ? (input.aiAnalysis.confidence <= 1 ? input.aiAnalysis.confidence * 100 : input.aiAnalysis.confidence)
        : undefined);

  // AI confidence below operational threshold (60%) triggers manual review
  const isLowConfidence = aiConfidenceScore !== undefined && aiConfidenceScore < 60;

  const manualReviewNeeded = Boolean(
    input.aiAnalysis?.manualReviewNeeded ||
    isPossibleAi ||
    isLowConfidence
  );

  const manualReviewReason =
    input.aiAnalysis?.manualReviewReason ||
    (isPossibleAi
      ? "Image exhibits cues of possible AI synthesis or digital modification; marked for on-site municipal field verification."
      : isLowConfidence
        ? `AI prediction confidence (${Math.round(aiConfidenceScore!)}%) is below operational threshold (60%); flagged for municipal officer manual verification.`
        : undefined);

  let departmentId: Types.ObjectId | undefined;
  try {
    // Only use AI suggestedDepartment if AI prediction is confident and manual review is not needed!
    // When confidence is low or manual review is required, rely on citizen's selected category.
    const deptTerm = (!manualReviewNeeded && input.aiAnalysis?.suggestedDepartment)
      ? input.aiAnalysis.suggestedDepartment
      : input.category;

    if (deptTerm) {
      const firstWord = deptTerm.split(/[ &/-]/)[0];
      const matchedDept = await Department.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${deptTerm}$`, "i") } },
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

  // Requirement: Strictly reject complaints if image is AI-created OR taken from Google / web
  let isSyntheticUrl = false;
  let isGoogleWebUrl = false;
  if (input.imageUrl && (input.imageUrl.startsWith("http://") || input.imageUrl.startsWith("https://"))) {
    try {
      const lower = input.imageUrl.toLowerCase();
      const urlPath = new URL(input.imageUrl).pathname.toLowerCase();
      isSyntheticUrl = /ai[-_]?gen|synthetic[-_]?sample|test[-_]?ai|midjourney|dall[-_]?e|stablediffusion|flux|generated/i.test(urlPath);
      isGoogleWebUrl = isGoogleOrWebSearchUrl(input.imageUrl);
    } catch {
      isSyntheticUrl = false;
      isGoogleWebUrl = false;
    }
  }

  const isGoogleWeb = Boolean(input.aiAnalysis?.authenticityAssessment?.isGoogleOrWebImage || isGoogleWebUrl);

  if (isPossibleAi || isSyntheticUrl) {
    throw new AppError(
      "Complaint submission rejected: The uploaded photo is an AI-created or synthetic image. Pune Municipal Corporation requires authentic real-world camera photographs.",
      422,
      "AI_GENERATED_IMAGE_REJECTED",
    );
  }

  if (isGoogleWeb) {
    throw new AppError(
      "Complaint submission rejected: The uploaded photo was taken from Google Images or the internet. Complaints must be clicked directly by camera on-site.",
      422,
      "GOOGLE_WEB_IMAGE_REJECTED",
    );
  }

  // Reject complaints if the AI analysis identified no visible civic issue (non-civic / receipt / invoice / fake complaint)
  const isNonCivicImage = Boolean(
    input.aiAnalysis && (
      input.aiAnalysis.isCivicIssue === false ||
      input.aiAnalysis.civicIssue?.isCivicIssue === false ||
      input.aiAnalysis.detectedCivicIssue?.toLowerCase().includes("no visible") ||
      input.aiAnalysis.detectedCivicIssue?.toLowerCase().includes("non-civic") ||
      (typeof input.aiAnalysis.confidenceScore === "number" && input.aiAnalysis.confidenceScore === 0) ||
      (Array.isArray(input.aiAnalysis.safetyHazards) && input.aiAnalysis.safetyHazards.some((h: string) => /non[-_]?civic|invoice|document|receipt/i.test(h)))
    )
  );

  if (isNonCivicImage) {
    throw new AppError(
      "Complaint submission rejected: The uploaded photo does not contain any recognizable municipal or civic issue (e.g. potholes, garbage, water leaks, drainage, streetlights). Invoices, receipts, documents, and non-civic photos are strictly prohibited.",
      422,
      "NON_CIVIC_IMAGE_REJECTED",
    );
  }

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
  const complaint = await Complaint.findById(objectId)
    .populate("departmentId", "name code category officialEmail contactNumber slug description")
    .lean();
  if (!complaint) {
    throw notFound();
  }

  if (actor.role === "CITIZEN") {
    if (complaint.citizenId.toString() !== actor.id) {
      throw notFound();
    }
    // Omit sensitive internal staff notes from citizen view
    if (complaint.internalNotes) {
      delete (complaint as any).internalNotes;
    }
  } else if (
    (actor.role === "ADMIN" || actor.role === "DEPARTMENT_ADMIN") &&
    actor.departmentId
  ) {
    const rawDept = complaint.departmentId as any;
    const complaintDeptId =
      rawDept && typeof rawDept === "object" && "_id" in rawDept
        ? rawDept._id?.toString()
        : rawDept?.toString();
    if (
      !complaintDeptId ||
      complaintDeptId !== actor.departmentId
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
      "_id complaintNumber title category priority status location imageUrl resolutionImageUrl supportCount createdAt updatedAt slaDeadline aiAnalysis citizenId",
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
  input: {
    resolutionImageUrl?: string;
    resolutionNotes?: string;
    humanReviewed?: boolean;
    forceResolve?: boolean;
  },
) {
  if (!isPrivilegedAdmin(actor.role)) {
    throw new AppError("Only administrators can resolve complaints.", 403, "FORBIDDEN");
  }
  const complaint = await Complaint.findById(requireObjectId(id));
  if (!complaint) throw notFound();

  let aiVerdict: any = undefined;
  if (input.resolutionImageUrl) {
    try {
      const verification = await verifyResolution({
        originalImageUrl: complaint.imageUrl || "",
        resolutionImageUrl: input.resolutionImageUrl,
        title: complaint.title,
        category: complaint.category,
      });
      aiVerdict = {
        resolutionVerdict: verification.verdict,
        resolutionConfidence: verification.confidence,
        resolutionAnalysis: verification.analysis,
        resolutionAuthenticity: verification.authenticityAssessment,
      };

      // STRICT PROTECTION: If photo is recognized as AI generated or unrelated photo, block submission!
      if (verification.authenticityAssessment?.isAiGenerated) {
        throw new AppError(
          "Resolution rejected: Uploaded photo was recognized by AI as an AI-generated or synthetic image. Officers cannot submit AI-generated photos. Please capture and upload an authentic on-site camera photograph.",
          422,
          "AI_GENERATED_IMAGE_REJECTED",
        );
      }

    } catch (e: any) {
      if (
        e instanceof AppError ||
        e?.errorCode === "AI_GENERATED_IMAGE_REJECTED" ||
        e?.errorCode === "UNRELATED_PHOTO_REJECTED" ||
        e?.statusCode === 422
      ) {
        throw e;
      }
      console.warn("AI verification error:", e);
      aiVerdict = {
        resolutionVerdict: "INCONCLUSIVE",
        resolutionConfidence: 50,
        resolutionAnalysis: "Automated verification encountered an error; manual inspection required.",
      };
    }
  }

  // Verification Safety Check:
  // If verification returns POTENTIALLY_UNRESOLVED, do NOT mark complaint RESOLVED unless an authorized
  // administrator has explicitly reviewed and confirmed the resolution (humanReviewed: true).
  const isPotentiallyUnresolved = aiVerdict?.resolutionVerdict === "POTENTIALLY_UNRESOLVED";
  const isHumanConfirmed = Boolean(input.humanReviewed || input.forceResolve);

  if (isPotentiallyUnresolved && !isHumanConfirmed) {
    // Follow safe existing workflow: preserve evidence & analysis, leave in IN_PROGRESS, log audit, and reject unsupported resolution
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
      action: "RESOLUTION_VERIFICATION_REJECTED",
      targetRef: complaint._id,
      targetModel: "Complaint",
      metadata: {
        action: "RESOLUTION_VERIFICATION_BLOCKED",
        previousStatus: complaint.status,
        newStatus: complaint.status,
        resolutionVerdict: "POTENTIALLY_UNRESOLVED",
        analysis: aiVerdict.resolutionAnalysis,
        complaintNumber: complaint.complaintNumber,
      },
    });

    throw new AppError(
      aiVerdict.resolutionAnalysis ||
        "Resolution verification failed: visual evidence indicates the civic defect is potentially unresolved. Manual inspection and confirmation are required.",
      400,
      "RESOLUTION_VERIFICATION_FAILED",
    );
  }

  complaint.status = "RESOLVED";
  if (input.resolutionImageUrl) complaint.resolutionImageUrl = input.resolutionImageUrl;
  if (input.resolutionNotes) complaint.resolutionNotes = input.resolutionNotes;
  if (aiVerdict) {
    complaint.aiAnalysis = {
      ...(complaint.aiAnalysis || {}),
      ...aiVerdict,
    };
    if (aiVerdict.resolutionAuthenticity) {
      complaint.resolutionAuthenticity = aiVerdict.resolutionAuthenticity;
    }
  }

  // Officer Accountability: Record authenticated officer ID/name and exact resolution timestamp
  const resolvingUser = await User.findById(requireObjectId(actor.id)).select("fullName email role").lean();
  const resolutionTimestamp = new Date();

  complaint.resolutionAudit = {
    resolvedBy: {
      officerId: requireObjectId(actor.id),
      officerName: resolvingUser?.fullName || "Municipal Officer",
      officerEmail: resolvingUser?.email,
      officerRole: actor.role,
      timestamp: resolutionTimestamp,
    },
    resolvedAt: resolutionTimestamp,
    isRejectionActive: false,
  };

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
      photoAuthenticity: aiVerdict?.resolutionAuthenticity?.assessment || "AUTHENTIC_REAL_PHOTO",
      officerId: actor.id,
      officerName: resolvingUser?.fullName || "Municipal Officer",
      officerEmail: resolvingUser?.email,
      resolvingOfficerId: actor.id,
      resolvingOfficerName: resolvingUser?.fullName || "Municipal Officer",
      resolutionTimestamp,
      ...(isHumanConfirmed ? { humanReviewConfirmed: true } : {}),
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

  const overdueWithDetails = overdueComplaints.map((c: any) => ({
    ...c,
    slaDetails: getSlaStatusDetails(c.slaDeadline, c.status, now),
  }));

  const approachingWithDetails = approachingComplaints.map((c: any) => ({
    ...c,
    slaDetails: getSlaStatusDetails(c.slaDeadline, c.status, now),
  }));

  return {
    totalOpen,
    overdueCount,
    approachingCount: approachingComplaints.length,
    resolvedCount,
    complianceRate,
    workingCalendar: {
      standardHours: "09:30 - 18:00 IST (Mon - Fri)",
      weekendPolicy: "Saturdays & Sundays excluded from non-emergency resolution time",
      emergencyPolicy: "CRITICAL priority handled under 24x7 continuous emergency response",
      totalRegisteredHolidays: Object.keys(PMC_PUBLIC_HOLIDAYS).length,
    },
    overdueComplaints: overdueWithDetails,
    approachingComplaints: approachingWithDetails,
  };
}
