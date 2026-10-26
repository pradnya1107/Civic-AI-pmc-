import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message,
      error: { code: error.code },
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    response.status(409).json({
      success: false,
      message: "An account with this email already exists.",
      error: { code: "EMAIL_ALREADY_EXISTS" },
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    response.status(400).json({
      success: false,
      message: "Request body contains invalid JSON.",
      error: { code: "INVALID_JSON" },
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    (("type" in error && error.type === "entity.too.large") ||
      ("status" in error && error.status === 413) ||
      ("statusCode" in error && error.statusCode === 413))
  ) {
    response.status(413).json({
      success: false,
      message: "The uploaded image or file is too large. Please select an image under 10MB.",
      error: { code: "PAYLOAD_TOO_LARGE" },
    });
    return;
  }

  const errorName =
    error instanceof Error ? error.name : "UnknownError";
  console.error(`Unhandled request error (${errorName}):`, error);

  response.status(500).json({
    success: false,
    message:
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? error.message
        : "An unexpected error occurred.",
    error: { code: "INTERNAL_SERVER_ERROR" },
  });
};

