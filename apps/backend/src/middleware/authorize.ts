import type { RequestHandler } from "express";
import type { UserRole } from "../modules/users/user.model";
import { AppError } from "../utils/app-error";

export function authorize(...allowedRoles: (UserRole | string)[]): RequestHandler {
  const normalizedAllowed = allowedRoles.map((role) => role.toUpperCase());

  return (request, _response, next) => {
    if (!request.user) {
      next(new AppError("Authentication is required.", 401, "UNAUTHORIZED"));
      return;
    }

    const userRole = request.user.role.toUpperCase();
    if (!normalizedAllowed.includes(userRole)) {
      next(
        new AppError(
          "You do not have permission to perform this action.",
          403,
          "FORBIDDEN",
        ),
      );
      return;
    }

    next();
  };
}
