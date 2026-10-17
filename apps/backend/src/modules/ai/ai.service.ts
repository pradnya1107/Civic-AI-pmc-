import { Types } from "mongoose";
import { z } from "zod";
import { COMPLAINT_PRIORITIES } from "../complaints/complaint.model";
import { AIAnalysis, type AIAnalysisRecord } from "./aiAnalysis.model";
import { AppError } from "../../utils/app-error";

const aiResponseSchema = z.object({
  category: z.string().trim().min(1).max(100),
  priority: z.enum(COMPLAINT_PRIORITIES),
  summary: z.string().trim().min(1).max(2000),
  confidence: z.number().min(0).max(1),
  modelVersion: z.string().trim().min(1).max(100),
});

export type ValidatedAIAnalysis = z.infer<typeof aiResponseSchema>;

export function getAiServiceConfig() {
  return {
    url: (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/+$/, ""),
    secret: process.env.AI_SERVICE_SECRET || "dev-ai-service-secret-change-me",
    timeoutMs: Number(process.env.AI_SERVICE_TIMEOUT_MS) || 5000,
  };
}

/**
 * Call internal FastAPI AI service to analyze a complaint.
 * Validates input and output, handles timeouts and downtime, and persists to MongoDB.
 */
export async function analyzeComplaint(
  complaintId: string | Types.ObjectId,
  text: string,
): Promise<AIAnalysisRecord | null> {
  const normalizedId = complaintId.toString();
  const trimmedText = text.trim();

  if (!trimmedText) {
    console.warn(`[AI Service] Cannot analyze complaint ${normalizedId}: empty text.`);
    return null;
  }

  const config = getAiServiceConfig();
  const analyzeUrl = `${config.url}/analyze`;

  let responseData: unknown;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    const response = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AI-Service-Secret": config.secret,
      },
      body: JSON.stringify({
        complaintId: normalizedId,
        complaintText: trimmedText,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      console.warn(
        `[AI Service] Service returned error status ${response.status} for complaint ${normalizedId}.`,
      );
      return null;
    }

    responseData = await response.json();
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn(
        `[AI Service] Request timed out after ${config.timeoutMs}ms for complaint ${normalizedId}.`,
      );
    } else {
      console.warn(
        `[AI Service] Service unavailable or connection error for complaint ${normalizedId}: ${err?.message || "Unknown error"}`,
      );
    }
    return null;
  }

  // Treat generated response as untrusted data and strictly validate
  const validationResult = aiResponseSchema.safeParse(responseData);
  if (!validationResult.success) {
    console.warn(
      `[AI Service] AI response validation failed for complaint ${normalizedId}:`,
      validationResult.error.issues,
    );
    return null;
  }

  const validated = validationResult.data;

  try {
    const complaintRef = new Types.ObjectId(normalizedId);
    const analysisDoc = await AIAnalysis.findOneAndUpdate(
      { complaintRef },
      {
        $set: {
          complaintRef,
          suggestedCategory: validated.category,
          suggestedPriority: validated.priority,
          summary: validated.summary,
          confidence: validated.confidence,
          modelVersion: validated.modelVersion,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    return analysisDoc;
  } catch (dbErr: any) {
    console.error(
      `[AI Service] Failed to persist AIAnalysis in database for complaint ${normalizedId}:`,
      dbErr?.message,
    );
    return null;
  }
}

/**
 * Fire-and-forget background trigger for AI analysis after complaint creation.
 * Returns immediately without waiting or blocking caller.
 */
export function triggerAnalysisAsync(
  complaintId: string | Types.ObjectId,
  text: string,
): void {
  void analyzeComplaint(complaintId, text).catch((err) => {
    console.error(
      `[AI Service] Uncaught rejection in background AI analysis for complaint ${complaintId}:`,
      err?.message,
    );
  });
}

/**
 * Retrieve stored AIAnalysis record for a complaint.
 */
export async function getAnalysisByComplaintId(
  complaintId: string | Types.ObjectId,
): Promise<AIAnalysisRecord | null> {
  const objectId =
    typeof complaintId === "string"
      ? new Types.ObjectId(complaintId)
      : complaintId;
  return AIAnalysis.findOne({ complaintRef: objectId }).lean();
}
