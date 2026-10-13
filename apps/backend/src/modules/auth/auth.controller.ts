import type { RequestHandler } from "express";
import {
  requestEmailVerification,
  verifyEmailOtp,
} from "./email-otp.service";
import {
  loginCitizen,
  registerCitizen,
  revokeUserTokens,
} from "./auth.service";
import {
  requestPasswordReset,
  resetPassword,
} from "./password-reset.service";
import { logDevOtpEvent } from "./auth-diagnostics";

export const register: RequestHandler = async (request, response) => {
  logDevOtpEvent({
    event: "registration_initiated",
    email: request.body.email,
  });
  const user = await registerCitizen(request.body);

  await requestEmailVerification(user.email, "Registration initiated");

  response.status(201).json({
    success: true,
    message: "Account created successfully. Verify your email to continue.",
    data: { user },
  });
};

export const sendOtp: RequestHandler = async (request, response) => {
  await requestEmailVerification(request.body.email, "OTP requested");
  response.status(202).json({
    success: true,
    message:
      "If an eligible account exists and email delivery succeeds, verification instructions will arrive shortly.",
  });
};

export const resendOtp: RequestHandler = async (request, response) => {
  await requestEmailVerification(request.body.email, "OTP requested");
  response.status(202).json({
    success: true,
    message:
      "If an eligible account exists and email delivery succeeds, verification instructions will arrive shortly.",
  });
};

export const verifyOtp: RequestHandler = async (request, response) => {
  await verifyEmailOtp(request.body.email, request.body.otp);
  response.status(200).json({
    success: true,
    message: "Email verified successfully.",
  });
};

export const login: RequestHandler = async (request, response) => {
  const result = await loginCitizen(request.body.email, request.body.password);
  response.status(200).json({
    success: true,
    message: "Signed in successfully.",
    data: result,
  });
};

export const getCurrentUser: RequestHandler = (request, response) => {
  response.status(200).json({
    success: true,
    data: { user: request.user },
  });
};

export const logout: RequestHandler = async (request, response) => {
  const user = request.user;
  if (!user) {
    throw new Error("Authenticated user is missing from the request.");
  }
  await revokeUserTokens(user.id);
  response.status(200).json({
    success: true,
    message: "Signed out successfully. Existing access tokens are revoked.",
  });
};

export const forgotPassword: RequestHandler = async (request, response) => {
  await requestPasswordReset(request.body.email);
  response.status(202).json({
    success: true,
    message:
      "If an eligible account exists and email delivery succeeds, password reset instructions will arrive shortly.",
  });
};

export const resetPasswordHandler: RequestHandler = async (
  request,
  response,
) => {
  await resetPassword(request.body.token, request.body.password);
  response.status(200).json({
    success: true,
    message: "Password reset successfully. Sign in with your new password.",
  });
};
