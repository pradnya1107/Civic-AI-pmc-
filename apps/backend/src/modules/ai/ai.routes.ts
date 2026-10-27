import { Router } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../../middleware/async-handler";
import { authenticate, optionalAuthenticate } from "../../middleware/authenticate";
import { validateRequest } from "../../middleware/validate-request";
import { analyzeComplaint, verifyResolution } from "./gemini-ai.service";
import { classifyWithVgg16 } from "./vgg16-classifier.service";
import { chatRequestSchema, processCitizenMessage } from "./citizen-chat.service";
import { Complaint } from "../complaints/complaint.model";
import { AuditLog } from "../audit/auditLog.model";
import { Notification } from "../notifications/notification.model";

export const aiRouter = Router();

/**
 * Citizen Support Chatbot Endpoint
 * POST /api/v1/ai/chat
 * Open to citizens & visitors for municipal guidance, FAQs, and personalized complaint tracking when authenticated
 */
aiRouter.post(
  "/chat",
  optionalAuthenticate,
  validateRequest(chatRequestSchema),
  asyncHandler(async (request, response) => {
    const user = request.user
      ? {
          id: (request.user as any).id || (request.user as any)._id,
          role: (request.user as any).role,
          name: (request.user as any).name || (request.user as any).fullName,
        }
      : undefined;

    const result = await processCitizenMessage(request.body, user);
    response.status(200).json({
      success: true,
      message: "Chat response generated successfully.",
      data: result,
    });
  }),
);

// AI analysis and status can be called by authenticated users
aiRouter.use(authenticate);

aiRouter.get(
  "/status",
  asyncHandler(async (_request, response) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    response.status(200).json({
      success: true,
      data: {
        configured: hasKey,
        provider: hasKey ? "Google Gemini 1.5/2.0 Flash Vision" : "Civic Intelligent Rule Heuristic",
        vgg16Enabled: true,
        vgg16Model: "VGG-16 Deep Convolutional Neural Network",
        instructions: hasKey
          ? "Gemini API key and VGG-16 Vision classifier are configured and active."
          : "To enable Google Gemini multimodal vision, add GEMINI_API_KEY=your_key in apps/backend/.env.",
      },
    });
  }),
);

aiRouter.post(
  "/analyze-complaint",
  asyncHandler(async (request, response) => {
    const [vgg16Result, result] = await Promise.all([
      classifyWithVgg16({
        imageUrl: request.body.imageUrl,
        imageBase64: request.body.imageBase64,
      }),
      analyzeComplaint(request.body),
    ]);

    // Attach VGG-16 deep vision results
    if (vgg16Result) {
      (result as any).vgg16 = vgg16Result;
      // If VGG-16 flagged non-civic / receipt with high confidence, enforce rejection
      if (vgg16Result.isCivicIssue === false) {
        result.isCivicIssue = false;
        result.rejectionReason = vgg16Result.rejectionReason || "VGG-16 Vision flagged image as non-civic.";
      }
    }

    const complaintId = request.body.complaintId;
    let updatedComplaint: any = null;
    let statusUpdated = false;

    // Requirement: If AI recognizes the image as a REAL PHOTO, change complaint status to UNDER_REVIEW
    if (complaintId) {
      try {
        const auth = result?.authenticityAssessment;
        const isReal = Boolean(
          auth &&
          !auth.possibleAiGenerated &&
          !auth.isGoogleOrWebImage
        );

        if (isReal) {
          const complaint = await Complaint.findById(complaintId);
          if (complaint && complaint.status === "SUBMITTED") {
            const oldStatus = complaint.status;
            complaint.status = "UNDER_REVIEW";
            complaint.aiAnalysis = {
              ...(complaint.aiAnalysis || {}),
              ...result,
            };
            await complaint.save();
            updatedComplaint = complaint.toJSON();
            statusUpdated = true;

            // Audit Log
            const actorId = (request as any).user?.id || complaint.citizenId.toString();
            try {
              await AuditLog.create({
                actorRef: new Types.ObjectId(actorId),
                action: "AI_PHOTO_VERIFIED",
                targetRef: complaint._id,
                targetModel: "Complaint",
                metadata: {
                  previousStatus: oldStatus,
                  newStatus: "UNDER_REVIEW",
                  reason: "AI recognized authentic real camera photo.",
                  complaintNumber: complaint.complaintNumber,
                },
              });
            } catch (auditErr) {
              console.warn("Failed to create audit log for AI photo verification:", auditErr);
            }

            // Citizen Notification
            try {
              await Notification.create({
                recipientId: complaint.citizenId,
                complaintId: complaint._id,
                type: "COMPLAINT_UPDATED",
                title: "Complaint Verified by AI Vision",
                message: `AI Vision confirmed authentic real camera photo for complaint ${complaint.complaintNumber}. Status changed to UNDER_REVIEW.`,
              });
            } catch (notifErr) {
              console.warn("Failed to dispatch AI verification notification:", notifErr);
            }
          }
        }
      } catch (err) {
        console.warn("Could not auto-update complaint status via analyze-complaint:", err);
      }
    }

    response.status(200).json({
      success: true,
      message: statusUpdated
        ? "AI recognized authentic real photo! Complaint status changed to UNDER_REVIEW."
        : "AI analysis completed.",
      data: {
        ...result,
        ...(updatedComplaint ? { complaint: updatedComplaint, statusUpdated: true, newStatus: "UNDER_REVIEW" } : {}),
      },
    });
  }),
);

aiRouter.post(
  "/verify-resolution",
  asyncHandler(async (request, response) => {
    const result = await verifyResolution(request.body);
    const complaintId = request.body.complaintId;
    let updatedComplaint: any = null;
    let statusUpdated = false;

    // Requirement: If AI recognizes resolution photo as a REAL PHOTO, change complaint status to RESOLVED
    if (complaintId) {
      try {
        const auth = result?.authenticityAssessment;
        const isReal = Boolean(
          auth &&
          auth.assessment === "AUTHENTIC_REAL_PHOTO" &&
          !auth.isAiGenerated &&
          !auth.isGoogleOrWebImage
        );

        if (isReal) {
          const complaint = await Complaint.findById(complaintId);
          if (complaint && complaint.status !== "RESOLVED") {
            const oldStatus = complaint.status;
            complaint.status = "RESOLVED";
            if (request.body.resolutionImageUrl) {
              complaint.resolutionImageUrl = request.body.resolutionImageUrl;
            }
            if (request.body.resolutionNotes) {
              complaint.resolutionNotes = request.body.resolutionNotes;
            }
            complaint.aiAnalysis = {
              ...(complaint.aiAnalysis || {}),
              resolutionVerdict: result.verdict,
              resolutionConfidence: result.confidence,
              resolutionAnalysis: result.analysis,
              resolutionAuthenticity: result.authenticityAssessment,
            };
            complaint.resolutionAuthenticity = result.authenticityAssessment;
            await complaint.save();
            updatedComplaint = complaint.toJSON();
            statusUpdated = true;

            // Audit Log
            const actorId = (request as any).user?.id || complaint.citizenId.toString();
            try {
              await AuditLog.create({
                actorRef: new Types.ObjectId(actorId),
                action: "AI_RESOLUTION_VERIFIED",
                targetRef: complaint._id,
                targetModel: "Complaint",
                metadata: {
                  previousStatus: oldStatus,
                  newStatus: "RESOLVED",
                  reason: "AI recognized authentic real camera repair photo.",
                  complaintNumber: complaint.complaintNumber,
                },
              });
            } catch (auditErr) {
              console.warn("Failed to create audit log for AI resolution verification:", auditErr);
            }

            // Citizen Notification
            try {
              await Notification.create({
                recipientId: complaint.citizenId,
                complaintId: complaint._id,
                type: "COMPLAINT_UPDATED",
                title: "Complaint Resolved (AI Verified)",
                message: `AI Vision confirmed authentic repair photo for complaint ${complaint.complaintNumber}. Status changed to RESOLVED.`,
              });
            } catch (notifErr) {
              console.warn("Failed to dispatch AI resolution notification:", notifErr);
            }
          }
        }
      } catch (err) {
        console.warn("Could not auto-update complaint status via verify-resolution:", err);
      }
    }

    response.status(200).json({
      success: true,
      message: statusUpdated
        ? "AI recognized authentic repair photo! Complaint status changed to RESOLVED."
        : "Resolution verification completed.",
      data: {
        ...result,
        ...(updatedComplaint ? { complaint: updatedComplaint, statusUpdated: true, newStatus: "RESOLVED" } : {}),
      },
    });
  }),
);

export default aiRouter;
