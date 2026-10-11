import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { getJwtSecret } from "../config/auth";
import { User } from "../modules/users/user.model";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "./async-handler";

const authenticateRequest: RequestHandler = async (request, _response, next) => {
  const jwtSecret = getJwtSecret();
  const authorization = request.header("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/);
  if (!match) {
    throw new AppError("Authentication is required.", 401, "UNAUTHORIZED");
  }

  let subject: string;
  let tokenVersion: number;
  try {
    const decoded = jwt.verify(match[1], jwtSecret, {
      algorithms: ["HS256"],
    });
    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      typeof decoded.tokenVersion !== "number"
    ) {
      throw new Error("Invalid token claims");
    }
    subject = decoded.sub;
    tokenVersion = decoded.tokenVersion;
  } catch {
    throw new AppError("Authentication is required.", 401, "UNAUTHORIZED");
  }

  const user = await User.findById(subject).select("+tokenVersion");
  if (
    !user ||
    user.accountStatus !== "ACTIVE" ||
    !user.emailVerified ||
    user.tokenVersion !== tokenVersion
  ) {
    throw new AppError("Authentication is required.", 401, "UNAUTHORIZED");
  }

  request.user = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    accountStatus: user.accountStatus,
  };
  next();
};

export const authenticate = asyncHandler(authenticateRequest);
