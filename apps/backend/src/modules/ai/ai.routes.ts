import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { analyzeComplaint, verifyResolution } from "./gemini-ai.service";

export const aiRouter = Router();

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
