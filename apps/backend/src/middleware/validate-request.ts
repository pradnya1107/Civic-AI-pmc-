import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/app-error";

type RequestPart = "body" | "params" | "query";

export function validateRequest(
  schema: ZodType,
  part: RequestPart = "body",
): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request[part]);

    if (!result.success) {
      next(
        new AppError(
          "Request validation failed.",
          400,
          "VALIDATION_ERROR",
        ),
      );
      return;
    }

    if (part === "query") {
      request.validatedQuery = result.data;
    } else {
      request[part] = result.data;
    }
    next();
  };
}
