import { Types } from "mongoose";
import type { UserRole } from "../users/user.model";
import { Department } from "../departments/department.model";
import { AppError } from "../../utils/app-error";
import { Complaint } from "./complaint.model";
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

interface RequestActor {
  id: string;
  role: UserRole;
}

function requireObjectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

function actorFilter(actor: RequestActor) {
  return actor.role === "ADMIN"
    ? {}
    : { citizenId: requireObjectId(actor.id) };
}

function notFound(): AppError {
  return new AppError("Complaint not found.", 404, "COMPLAINT_NOT_FOUND");
}

export async function createComplaint(
  actor: RequestActor,
  input: CreateComplaintInput,
) {
  const complaint = await Complaint.create({
    ...input,
    citizenId: requireObjectId(actor.id),
  });
  await recordComplaintSubmission(complaint);
  return complaint.toJSON();
}

export async function listComplaints(
  actor: RequestActor,
  query: ComplaintListQuery,
) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const filter = {
    ...actorFilter(actor),
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.category ? { category: query.category } : {}),
  };

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
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
  const complaint = await Complaint.findOne({
    _id: requireObjectId(id),
    ...actorFilter(actor),
  }).lean();
  if (!complaint) {
    throw notFound();
  }
  return complaint;
}

export async function updateComplaint(
  actor: RequestActor,
  id: string,
  patch: UpdateComplaintInput,
) {
  if (
    actor.role !== "ADMIN" &&
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

  const updates: Record<string, unknown> = { ...patch };
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
      ...(actor.role === "ADMIN" ? {} : { status: "SUBMITTED" }),
    },
    {
      $set: updates,
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    },
    { returnDocument: "after", runValidators: true },
  );

  if (!updated) {
    if (
      actor.role !== "ADMIN" &&
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

  if (
    actor.role === "ADMIN" &&
    (patch.status !== undefined || patch.departmentId !== undefined)
  ) {
    await recordComplaintUpdate(updated, updated.status);
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
