import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import {
  createEmailTransport,
  getFrontendUrl,
} from "../../config/email";
import { AppError } from "../../utils/app-error";
import { User } from "../users/user.model";
import { PasswordResetToken } from "./password-reset-token.model";

const RESET_TOKEN_LIFETIME_MS = 30 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { from, transporter } = createEmailTransport();
  const frontendUrl = getFrontendUrl();
  const user = await User.findOne({
    email,
    emailVerified: true,
    accountStatus: "ACTIVE",
  }).select("_id email");

  if (!user) {
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  await PasswordResetToken.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        userId: user._id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_LIFETIME_MS),
      },
    },
    { upsert: true, runValidators: true },
  );

  const resetUrl = new URL("/reset-password", `${frontendUrl}/`);
  resetUrl.searchParams.set("token", token);

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: "Reset your CivicAI PMC password",
      text: `Use this link to reset your password. It expires in 30 minutes: ${resetUrl.toString()}`,
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Password reset email delivery failed (${errorName}).`);
  }
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  const resetRecord = await PasswordResetToken.findOneAndDelete({
    tokenHash: hashResetToken(token),
    expiresAt: { $gt: new Date() },
  });

  if (!resetRecord) {
    throw new AppError(
      "The password reset link is invalid or expired.",
      400,
      "INVALID_OR_EXPIRED_RESET_TOKEN",
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const result = await User.updateOne(
    { _id: resetRecord.userId, accountStatus: "ACTIVE" },
    {
      $set: { passwordHash },
      $inc: { tokenVersion: 1 },
    },
  );

  if (result.modifiedCount !== 1) {
    throw new AppError(
      "The password reset link is invalid or expired.",
      400,
      "INVALID_OR_EXPIRED_RESET_TOKEN",
    );
  }
}
