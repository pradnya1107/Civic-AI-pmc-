import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getOtpHashSecret } from "../../config/email";
import { AppError } from "../../utils/app-error";
import { User } from "../users/user.model";
import { VerificationCode } from "./verification-code.model";

const OTP_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes
const SEND_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_VERIFICATION_ATTEMPTS = 5;

function hashOtp(email: string, code: string): string {
  return createHmac("sha256", getOtpHashSecret())
    .update(`${email}:${code}`)
    .digest("hex");
}

function otpMatches(expectedHash: string, email: string, code: string): boolean {
  try {
    const suppliedHash = Buffer.from(hashOtp(email, code), "hex");
    const storedHash = Buffer.from(expectedHash, "hex");
    return (
      suppliedHash.length === storedHash.length &&
      timingSafeEqual(suppliedHash, storedHash)
    );
  } catch {
    return false;
  }
}

/**
 * Formats and prints a high-visibility terminal banner with the generated OTP.
 */
export function printAdminOtpTerminalBanner(
  user: { fullName?: string; email: string },
  departmentName: string,
  code: string,
  context: "LOGIN_VERIFICATION" | "ACCOUNT_CREATION" = "LOGIN_VERIFICATION",
): void {
  const isCreation = context === "ACCOUNT_CREATION";
  const title = isCreation
    ? "CIVICAI PMC — NEW DEPARTMENT ADMIN CONFIRMATION OTP"
    : "CIVICAI PMC — DEPARTMENT ADMIN OTP SECURITY VERIFICATION";
  const actionLabel = isCreation
    ? "Enter this OTP on initial login to confirm and verify the account."
    : "Enter this OTP in the login screen to authenticate.";

  const line = "=".repeat(70);
  console.log(`\n${line}`);
  console.log(`🏛️  ${title}`);
  console.log(`Admin Name:        ${user.fullName || "Department Admin"}`);
  console.log(`Email Address:     ${user.email}`);
  console.log(`Department:        ${departmentName}`);
  console.log(`ONE-TIME PASSWORD: [ ${code} ]  (Valid for 10 minutes)`);
  console.log(`Instruction:       ${actionLabel}`);
  console.log(`Status:            Awaiting Terminal OTP Entry in Web Console`);
  console.log(`${line}\n`);
}

/**
 * Generates a 6-digit OTP, stores its HMAC hash in the database,
 * and prints the OTP to the backend terminal for demo presentation.
 */
export async function generateAndDispatchAdminOtp(
  user: { _id?: any; id?: string; fullName?: string; email: string },
  departmentName: string,
  context: "LOGIN_VERIFICATION" | "ACCOUNT_CREATION" = "LOGIN_VERIFICATION",
): Promise<string> {
  const email = user.email.trim().toLowerCase();
  const code = randomInt(100_000, 1_000_000).toString();
  const now = new Date();

  const codeHash = hashOtp(email, code);
  const expiresAt = new Date(now.getTime() + OTP_LIFETIME_MS);
  const recordExpiresAt = new Date(now.getTime() + SEND_WINDOW_MS);

  await VerificationCode.findOneAndUpdate(
    { email },
    {
      $set: {
        codeHash,
        expiresAt,
        recordExpiresAt,
        attempts: 0,
        windowStartedAt: now,
        resendAllowedAt: now,
      },
      $inc: { sendsInWindow: 1 },
    },
    { upsert: true, returnDocument: "after" },
  );

  // Print to terminal for the presentation demonstration
  printAdminOtpTerminalBanner(user, departmentName, code, context);

  return code;
}

/**
 * Validates the terminal OTP entered by the department admin.
 * Marks the account as verified and active upon success.
 */
export async function verifyAdminLoginOtp(
  email: string,
  code: string,
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanedCode = code.trim();
  const now = new Date();

  const verification = await VerificationCode.findOne({
    email: normalizedEmail,
    expiresAt: { $gt: now },
  }).select("+codeHash");

  if (!verification) {
    throw new AppError(
      "The one-time password (OTP) is invalid or has expired. Please check your backend terminal.",
      400,
      "INVALID_OR_EXPIRED_OTP",
    );
  }

  if (!otpMatches(verification.codeHash, normalizedEmail, cleanedCode)) {
    const updated = await VerificationCode.findOneAndUpdate(
      {
        _id: verification._id,
        expiresAt: { $gt: now },
        attempts: { $lt: MAX_VERIFICATION_ATTEMPTS },
      },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    );

    if (updated && updated.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await updated.deleteOne();
    }

    throw new AppError(
      "The one-time password (OTP) is incorrect. Please verify the code printed in your backend terminal.",
      400,
      "INVALID_OTP",
    );
  }

  // Consume verification code
  await verification.deleteOne();

  // Confirm account
  await User.updateOne(
    { email: normalizedEmail },
    { $set: { emailVerified: true, accountStatus: "ACTIVE" } },
  );

  const line = "=".repeat(70);
  console.log(`\n${line}`);
  console.log(`✅ CIVICAI PMC — DEPARTMENT ADMIN OTP VERIFIED & CONFIRMED`);
  console.log(`Admin Email:        ${normalizedEmail}`);
  console.log(`Account Status:     ACTIVE (Confirmed via Terminal OTP)`);
  console.log(`Access Granted:     Department Dashboard Unlocked`);
  console.log(`${line}\n`);

  return true;
}
