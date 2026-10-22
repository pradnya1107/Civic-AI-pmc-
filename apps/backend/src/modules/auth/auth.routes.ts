import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { validateRequest } from "../../middleware/validate-request";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { authenticate } from "../../middleware/authenticate";
import {
  getCurrentUser,
  refreshTokenHandler,
  forgotPassword,
  register,
  login,
  logout,
  resetPasswordHandler,
  resendOtp,
  sendOtp,
  verifyOtp,
  resendDepartmentAdminOtpHandler,
} from "./auth.controller";
import {
  emailSchema,
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from "./auth.validation";

const authRouter = Router();

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: (request) => {
    if (process.env.NODE_ENV === "test" && !request.headers["x-test-rate-limit"]) {
      return 1000;
    }
    return 10;
  },
  keyGenerator: (request) => {
    return (
      (request.headers["x-test-client-id"] as string) ||
      (request.headers["x-forwarded-for"] as string) ||
      ipKeyGenerator(request.ip || "127.0.0.1")
    );
  },
  validate: false,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    message: "Too many authentication requests. Try again later.",
    error: { code: "RATE_LIMITED" },
  },
});

const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 10,
  keyGenerator: (request) => {
    return (
      (request.headers["x-test-client-id"] as string) ||
      (request.headers["x-forwarded-for"] as string) ||
      ipKeyGenerator(request.ip || "127.0.0.1")
    );
  },
  validate: false,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    message: "Too many authentication requests. Try again later.",
    error: { code: "RATE_LIMITED" },
  },
});

authRouter.post(
  "/register",
  authRateLimit,
  validateRequest(registerSchema),
  asyncHandler(register),
);

authRouter.post(
  "/send-otp",
  otpRateLimit,
  validateRequest(emailSchema),
  asyncHandler(sendOtp),
);
authRouter.post(
  "/resend-otp",
  otpRateLimit,
  validateRequest(emailSchema),
  asyncHandler(resendOtp),
);
authRouter.post(
  "/verify-otp",
  otpRateLimit,
  validateRequest(verifyOtpSchema),
  asyncHandler(verifyOtp),
);
authRouter.post(
  "/login",
  authRateLimit,
  validateRequest(loginSchema),
  asyncHandler(login),
);
authRouter.post(
  "/department-admin/resend-otp",
  authRateLimit,
  asyncHandler(resendDepartmentAdminOtpHandler),
);
authRouter.post(
  "/forgot-password",
  otpRateLimit,
  validateRequest(resetPasswordRequestSchema),
  asyncHandler(forgotPassword),
);
authRouter.post(
  "/reset-password",
  otpRateLimit,
  validateRequest(resetPasswordSchema),
  asyncHandler(resetPasswordHandler),
);
authRouter.get("/me", authenticate, asyncHandler(getCurrentUser));
authRouter.post("/refresh", authenticate, asyncHandler(refreshTokenHandler));
authRouter.post("/logout", authenticate, asyncHandler(logout));

export default authRouter;
