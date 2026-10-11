import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { validateRequest } from "../../middleware/validate-request";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../../middleware/authenticate";
import {
  getCurrentUser,
  forgotPassword,
  register,
  login,
  logout,
  resetPasswordHandler,
  resendOtp,
  sendOtp,
  verifyOtp,
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

const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication requests. Try again later.",
    error: { code: "RATE_LIMITED" },
  },
});

authRouter.post(
  "/register",
  otpRateLimit,
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
  otpRateLimit,
  validateRequest(loginSchema),
  asyncHandler(login),
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
authRouter.post("/logout", authenticate, asyncHandler(logout));

export default authRouter;
