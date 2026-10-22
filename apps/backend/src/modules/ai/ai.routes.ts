import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { authenticate, optionalAuthenticate } from "../../middleware/authenticate";
import { validateRequest } from "../../middleware/validate-request";
import { analyzeComplaint, verifyResolution } from "./gemini-ai.service";
import { chatRequestSchema, processCitizenMessage } from "./citizen-chat.service";

export const aiRouter = Router();

/**
 * Citizen Support Chatbot Endpoint
 * POST /api/v1/ai/chat
 * Open to citizens for municipal guidance, FAQs, and personalized complaint tracking when authenticated
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

// Protected AI routes below require authentication
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
        instructions: hasKey
          ? "Gemini API key is configured and active."
          : "To enable Google Gemini multimodal vision, add GEMINI_API_KEY=your_key in apps/backend/.env.",
      },
    });
  }),
);

aiRouter.post(
  "/analyze-complaint",
  asyncHandler(async (request, response) => {
    const result = await analyzeComplaint(request.body);
    response.status(200).json({
      success: true,
      message: "AI analysis completed.",
      data: result,
    });
  }),
);

aiRouter.post(
  "/verify-resolution",
  asyncHandler(async (request, response) => {
    const result = await verifyResolution(request.body);
    response.status(200).json({
      success: true,
      message: "Resolution verification completed.",
      data: result,
    });
  }),
);

export default aiRouter;
