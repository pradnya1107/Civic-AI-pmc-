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
  getHeatmapData,
  resolveComplaintWithVerification,
  confirmResolutionByCitizen,
  disputeResolutionByCitizen,
  getSlaMonitoringOverview,
} from "./complaint.service";
import { getAnalysisByComplaintId } from "../ai/ai.service";
import {
  findDuplicateComplaints,
  supportComplaint,
} from "./duplicate.service";

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

export const heatmap: RequestHandler = async (request, response) => {
  const points = await getHeatmapData(request.query as any);
  response.status(200).json({
    success: true,
    data: { points, count: points.length },
  });
};

export const checkDuplicates: RequestHandler = async (request, response) => {
  const result = await findDuplicateComplaints(request.body);
  response.status(200).json({
    success: true,
    data: result,
  });
};

export const support: RequestHandler = async (request, response) => {
  const actor = actorFromRequest(request);
  const complaintId = complaintIdFromRequest(request);
  const result = await supportComplaint(actor.id, complaintId);
  response.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
};

export const resolve: RequestHandler = async (request, response) => {
  const actor = actorFromRequest(request);
  const complaintId = complaintIdFromRequest(request);
  const complaint = await resolveComplaintWithVerification(
    actor,
    complaintId,
    request.body,
  );
  response.status(200).json({
    success: true,
    message: "Complaint marked as resolved with verification analysis.",
    data: { complaint },
  });
};

export const confirm: RequestHandler = async (request, response) => {
  const actor = actorFromRequest(request);
  const complaintId = complaintIdFromRequest(request);
  const complaint = await confirmResolutionByCitizen(
    actor,
    complaintId,
    request.body,
  );
  response.status(200).json({
    success: true,
    message: "Resolution confirmed. Thank you for your feedback!",
    data: { complaint },
  });
};

export const dispute: RequestHandler = async (request, response) => {
  const actor = actorFromRequest(request);
  const complaintId = complaintIdFromRequest(request);
  const complaint = await disputeResolutionByCitizen(
    actor,
    complaintId,
    request.body,
  );
  response.status(200).json({
    success: true,
    message: "Resolution disputed. Ticket reopened for re-inspection.",
    data: { complaint },
  });
};

export const slaMonitoring: RequestHandler = async (_request, response) => {
  const result = await getSlaMonitoringOverview();
  response.status(200).json({
    success: true,
    data: result,
  });
};
