import type { RequestHandler } from "express";
import { validateToken } from "../modules/auth/auth.service";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "./async-handler";

const authenticateRequest: RequestHandler = async (request, _response, next) => {
  const authorization = request.header("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/);
  if (!match) {
    throw new AppError("Authentication is required.", 401, "UNAUTHORIZED");
  }

  const user = await validateToken(match[1]);
  request.user = user;
  next();
};

export const authenticate = asyncHandler(authenticateRequest);

const optionalAuthenticateRequest: RequestHandler = async (request, _response, next) => {
  const authorization = request.header("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/);
  if (match) {
    try {
      const user = await validateToken(match[1]);
      request.user = user;
    } catch {
      // Ignore token failure for optional authentication (guest chat support)
    }
  }
  next();
};

export const optionalAuthenticate = asyncHandler(optionalAuthenticateRequest);
