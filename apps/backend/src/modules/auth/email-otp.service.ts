import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import {
  createEmailTransport,
  getOtpHashSecret,
  wasRecipientAccepted,
} from "../../config/email";
import { AppError } from "../../utils/app-error";
import { User } from "../users/user.model";
import { VerificationCode } from "./verification-code.model";
import {
  displayTerminalDevOtp,
  logDevOtpEvent,
  logEmailDeliveryFailure,
} from "./auth-diagnostics";

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_VERIFICATION_ATTEMPTS = 5;

function hashOtp(email: string, code: string): string {
  return createHmac("sha256", getOtpHashSecret())
    .update(`${email}:${code}`)
    .digest("hex");
}

function otpMatches(expectedHash: string, email: string, code: string): boolean {
  const suppliedHash = Buffer.from(hashOtp(email, code), "hex");
  const storedHash = Buffer.from(expectedHash, "hex");
  return (
    suppliedHash.length === storedHash.length &&
    timingSafeEqual(suppliedHash, storedHash)
  );
}

export async function requestEmailVerification(
  email: string,
  eventLabel: "Registration initiated" | "OTP requested" = "OTP requested",
): Promise<void> {
  getOtpHashSecret();
  const { from, transporter } = createEmailTransport();
  const user = await User.findOne({ email }).select(
    "_id emailVerified accountStatus",
  );

  if (
    !user ||
    user.emailVerified ||
    user.accountStatus !== "ACTIVE"
  ) {
    return;
  }

  const now = new Date();
  const existing = await VerificationCode.findOne({ email });
  const withinSendWindow =
    existing &&
    now.getTime() - existing.windowStartedAt.getTime() < SEND_WINDOW_MS;

  if (existing && existing.resendAllowedAt > now) {
    return;
  }

  if (withinSendWindow && existing.sendsInWindow >= MAX_SENDS_PER_WINDOW) {
    return;
  }

  const code = randomInt(100_000, 1_000_000).toString();
  const startedNewWindow = !withinSendWindow;
  const windowStartedAt = startedNewWindow
    ? now
    : (existing?.windowStartedAt ?? now);
  const record = {
    email,
    codeHash: hashOtp(email, code),
    expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
    recordExpiresAt: new Date(
      windowStartedAt.getTime() + SEND_WINDOW_MS,
    ),
    attempts: 0,
    sendsInWindow: startedNewWindow ? 1 : (existing?.sendsInWindow ?? 0) + 1,
    windowStartedAt,
    resendAllowedAt: new Date(now.getTime() + RESEND_COOLDOWN_MS),
  };

  if (!existing) {
    try {
      await VerificationCode.create(record);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        return;
      }
      throw error;
    }
  } else {
    const cutoff = new Date(now.getTime() - SEND_WINDOW_MS);
    const result = await VerificationCode.updateOne(
      {
        _id: existing._id,
        resendAllowedAt: { $lte: now },
        ...(withinSendWindow
          ? {
              sendsInWindow: { $lt: MAX_SENDS_PER_WINDOW },
              windowStartedAt: { $gt: cutoff },
            }
          : { windowStartedAt: { $lte: cutoff } }),
      },
      {
        $set: {
          codeHash: record.codeHash,
          expiresAt: record.expiresAt,
          recordExpiresAt: record.recordExpiresAt,
          attempts: 0,
          resendAllowedAt: record.resendAllowedAt,
          ...(startedNewWindow
            ? {
                sendsInWindow: 1,
                windowStartedAt: record.windowStartedAt,
              }
            : {}),
        },
        ...(!startedNewWindow ? { $inc: { sendsInWindow: 1 } } : {}),
      },
    );
    if (result.modifiedCount !== 1) {
      return;
    }
  }

  const expiresAt = record.expiresAt;

  // Output terminal OTP during local development demo
  displayTerminalDevOtp({
    event: eventLabel,
    email,
    otp: code,
    expiresInMinutes: 10,
  });

  if (!transporter) {
    logDevOtpEvent({
      event: "otp_generated",
      email,
      expiresAt,
      status: "development_console_only_not_emailed",
      otp: code,
    });
    return;
  }

  const htmlContent = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
    <h2 style="color: #1e3a8a; margin-top: 0;">CivicAI PMC</h2>
    <p style="font-size: 16px; color: #334155;">Hello,</p>
    <p style="font-size: 16px; color: #334155;">Use the following verification code to verify your CivicAI PMC account:</p>
    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">${code}</span>
    </div>
    <p style="font-size: 14px; color: #64748b;">This verification code expires in <strong>10 minutes</strong>. If you did not request this code, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 12px; color: #94a3b8;">Pune Municipal Corporation — AI-powered Civic Issue Intelligence Platform</p>
  </div>
  `;

  let delivery: unknown;
  try {
    delivery = await transporter.sendMail({
      from,
      to: email,
      subject: "Verify your CivicAI PMC email",
      text: `Your CivicAI PMC verification code is ${code}. It expires in 10 minutes.`,
      html: htmlContent,
    });
  } catch (error) {
    logEmailDeliveryFailure("otp", email, error);
    if (process.env.NODE_ENV !== "development") {
      await invalidateFailedOtp(email, record.codeHash, now);
    } else {
      console.warn(
        `[CivicAI Auth] Email delivery failed (${error instanceof Error ? error.name : "Error"}). Verification can proceed with the development terminal OTP.`,
      );
    }
    return;
  }

  if (!wasRecipientAccepted(delivery, email)) {
    logEmailDeliveryFailure(
      "otp",
      email,
      new Error("RecipientNotAccepted"),
    );
    if (process.env.NODE_ENV !== "development") {
      await invalidateFailedOtp(email, record.codeHash, now);
    }
    return;
  }
  logDevOtpEvent({
    event: "otp_email_delivery",
    email,
    expiresAt,
    status: "accepted_by_mail_transport",
    otp: code,
  });
}

async function invalidateFailedOtp(
  email: string,
  codeHash: string,
  now: Date,
): Promise<void> {
  await VerificationCode.updateOne(
    { email, codeHash },
    {
      $set: {
        expiresAt: now,
        resendAllowedAt: now,
      },
    },
  );
}

export async function verifyEmailOtp(
  email: string,
  code: string,
): Promise<void> {
  const now = new Date();
  const verification = await VerificationCode.findOne({
    email,
    expiresAt: { $gt: now },
  }).select("+codeHash");

  if (!verification) {
    throw new AppError(
      "The verification code is invalid or expired.",
      400,
      "INVALID_OR_EXPIRED_OTP",
    );
  }

  if (!otpMatches(verification.codeHash, email, code)) {
    const attempt = await VerificationCode.findOneAndUpdate(
      {
        _id: verification._id,
        expiresAt: { $gt: now },
        attempts: { $lt: MAX_VERIFICATION_ATTEMPTS },
      },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    );
    if (attempt?.attempts === MAX_VERIFICATION_ATTEMPTS) {
      await attempt.deleteOne();
    }
    throw new AppError(
      "The verification code is invalid or expired.",
      400,
      "INVALID_OR_EXPIRED_OTP",
    );
  }

  const result = await User.updateOne(
    { email, emailVerified: false, accountStatus: "ACTIVE" },
    { $set: { emailVerified: true } },
  );

  await verification.deleteOne();
  if (result.modifiedCount !== 1) {
    throw new AppError(
      "The verification code is invalid or expired.",
      400,
      "INVALID_OR_EXPIRED_OTP",
    );
  }
}
