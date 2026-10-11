import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { createEmailTransport, getOtpHashSecret } from "../../config/email";
import { AppError } from "../../utils/app-error";
import { User } from "../users/user.model";
import { VerificationCode } from "./verification-code.model";

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

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: "Verify your CivicAI PMC email",
      text: `Your CivicAI PMC verification code is ${code}. It expires in 10 minutes.`,
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Verification email delivery failed (${errorName}).`);
  }
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
