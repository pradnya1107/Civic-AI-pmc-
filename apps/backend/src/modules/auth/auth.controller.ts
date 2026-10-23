import type { RequestHandler } from "express";
import {
  requestEmailVerification,
  verifyEmailOtp,
} from "./email-otp.service";
import {
  changeUserPassword,
  loginCitizen,
  refreshSessionToken,
  registerCitizen,
  revokeUserTokens,
} from "./auth.service";
import { AppError } from "../../utils/app-error";
import {
  requestPasswordReset,
  resetPassword,
} from "./password-reset.service";
import { logDevOtpEvent } from "./auth-diagnostics";
import { User } from "../users/user.model";
import { generateAndDispatchAdminOtp } from "./department-admin-otp.service";

export const register: RequestHandler = async (request, response) => {
  logDevOtpEvent({
    event: "registration_initiated",
    email: request.body.email,
  });
  const result = await registerCitizen(request.body);

  await requestEmailVerification(result.email, "Registration initiated");

  response.status(201).json({
    success: true,
    message: "Account created successfully. Verify your email to continue.",
    token: result.accessToken,
    accessToken: result.accessToken,
    role: result.role,
    data: {
      user: result.user,
      token: result.accessToken,
      accessToken: result.accessToken,
      role: result.role,
    },
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
  const forceOtp = Boolean(
    request.headers["x-test-admin-otp"] === "true" || request.body.forceOtp,
  );
  const result = await loginCitizen(
    request.body.email,
    request.body.password,
    request.body.otp,
    { forceOtp },
  );

  if ("requiresOtp" in result && result.requiresOtp) {
    response.status(200).json({
      success: true,
      requiresOtp: true,
      message:
        result.message ||
        "Security OTP required for Department Admin. Check your backend terminal.",
      data: result,
    });
    return;
  }

  const session = result as Extract<typeof result, { accessToken: string }>;

  response.status(200).json({
    success: true,
    message: "Signed in successfully.",
    token: session.accessToken,
    accessToken: session.accessToken,
    role: session.role,
    data: session,
  });
};

export const resendDepartmentAdminOtpHandler: RequestHandler = async (
  request,
  response,
) => {
  const email = request.body.email?.trim().toLowerCase();
  if (!email) {
    response.status(400).json({ success: false, message: "Email is required." });
    return;
  }

  const user = await User.findOne({ email }).populate("departmentId");
  if (!user || user.role !== "DEPARTMENT_ADMIN") {
    response.status(200).json({
      success: true,
      message:
        "If an eligible department admin exists, an OTP has been printed to the backend terminal.",
    });
    return;
  }

  const dept = user.departmentId as any;
  const deptName = dept?.name || "Department";
  const code = await generateAndDispatchAdminOtp(
    user,
    deptName,
    "LOGIN_VERIFICATION",
  );

  response.status(200).json({
    success: true,
    message:
      "A fresh verification OTP has been printed to the backend terminal.",
    data: {
      email: user.email,
      departmentName: deptName,
      demoTerminalOtp: code,
    },
  });
};

export const getCurrentUser: RequestHandler = async (request, response) => {
  if (!request.user) {
    response.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  let departmentName: string | undefined;
  if (request.user.departmentId) {
    const userDoc = await User.findById(request.user.id).populate("departmentId");
    departmentName = (userDoc?.departmentId as any)?.name;
  }
  const userProfile = {
    ...request.user,
    departmentName,
  };
  response.status(200).json({
    success: true,
    user: userProfile,
    data: {
      user: userProfile,
    },
  });
};

export const refreshTokenHandler: RequestHandler = async (request, response) => {
  if (!request.user) {
    response.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  const result = await refreshSessionToken(request.user.id);
  response.status(200).json({
    success: true,
    message: "Session token refreshed successfully.",
    data: result,
    ...result,
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

export const changePasswordHandler: RequestHandler = async (
  request,
  response,
) => {
  const user = request.user;
  if (!user) {
    throw new AppError("Authentication is required.", 401, "UNAUTHORIZED");
  }

  const { previousPassword, currentPassword, newPassword, confirmPassword } = request.body;
  const effectiveCurrentPassword = previousPassword || currentPassword;

  if (!effectiveCurrentPassword) {
    throw new AppError("Previous password is required.", 400, "MISSING_PREVIOUS_PASSWORD");
  }
  if (!newPassword) {
    throw new AppError("New password is required.", 400, "MISSING_NEW_PASSWORD");
  }

  const result = await changeUserPassword(
    user.id,
    effectiveCurrentPassword,
    newPassword,
    confirmPassword
  );

  response.status(200).json(result);
};
