import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error";
import type {
  ComplaintListQuery,
  CreateComplaintInput,
  UpdateComplaintInput,
} from "./complaint.validation";
import {
  createComplaint,
  deleteComplaint,
  getComplaint,
  listComplaints,
  updateComplaint,
} from "./complaint.service";
import { getAnalysisByComplaintId } from "../ai/ai.service";

function actorFromRequest(request: Parameters<RequestHandler>[0]) {
  const user = request.user;
  if (!user) {
    throw new Error("Authenticated user is missing from the request.");
  }
  return {
    id: user.id,
    role: user.role,
    departmentId: user.departmentId,
  };
}

function complaintIdFromRequest(request: Parameters<RequestHandler>[0]) {
  const id = request.params.id;
  if (typeof id !== "string") {
    throw new AppError("Complaint id is invalid.", 400, "VALIDATION_ERROR");
  }
  return id;
}

export const create: RequestHandler = async (request, response) => {
  const complaint = await createComplaint(
    actorFromRequest(request),
    request.body as CreateComplaintInput,
  );
  response.status(201).json({
    success: true,
    message: "Complaint submitted successfully.",
    data: { complaint },
  });
};

export const list: RequestHandler = async (request, response) => {
  const result = await listComplaints(
    actorFromRequest(request),
    request.validatedQuery as ComplaintListQuery,
  );
  response.status(200).json({ success: true, data: result });
};

export const getById: RequestHandler = async (request, response) => {
  const complaint = await getComplaint(
    actorFromRequest(request),
    complaintIdFromRequest(request),
  );
  response.status(200).json({ success: true, data: { complaint } });
};

export const update: RequestHandler = async (request, response) => {
  const complaint = await updateComplaint(
    actorFromRequest(request),
    complaintIdFromRequest(request),
    request.body as UpdateComplaintInput,
  );
  response.status(200).json({
    success: true,
    message: "Complaint updated successfully.",
    data: { complaint },
  });
};

export const remove: RequestHandler = async (request, response) => {
  await deleteComplaint(
    actorFromRequest(request),
    complaintIdFromRequest(request),
  );
  response.status(200).json({
    success: true,
    message: "Complaint deleted successfully.",
  });
};

export const getAiAnalysis: RequestHandler = async (request, response) => {
  const complaintId = complaintIdFromRequest(request);
  const actor = actorFromRequest(request);

  // Verify complaint exists and actor has permission
  const complaint = await getComplaint(actor, complaintId);

  const analysis = await getAnalysisByComplaintId(complaint._id);
  if (!analysis) {
    throw new AppError(
      "AI analysis not found for this complaint.",
      404,
      "ANALYSIS_NOT_FOUND",
    );
  }

  response.status(200).json({
    success: true,
    data: { analysis },
  });
};

