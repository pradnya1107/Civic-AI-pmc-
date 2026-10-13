import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { getJwtExpiresIn, getJwtSecret } from "../../config/auth";
import { AppError } from "../../utils/app-error";
import { User } from "../users/user.model";
import type { RegisterInput } from "./auth.validation";

const BCRYPT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH = bcrypt.hash(
  randomBytes(32).toString("hex"),
  BCRYPT_ROUNDS,
);

export async function registerCitizen(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const fullName = input.name?.trim() || input.fullName?.trim() || "";

  try {
    const user = await User.create({
      fullName,
      email: input.email,
      passwordHash,
      phoneNumber: input.phoneNumber,
      role: "CITIZEN",
      emailVerified: false,
      accountStatus: "ACTIVE",
    });

    return {
      id: user.id,
      name: user.fullName,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      emailVerified: user.emailVerified,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError(
        "An account with this email already exists. If your account is not verified, please verify your email using OTP or request a new OTP via the send-otp endpoint.",
        409,
        "EMAIL_ALREADY_EXISTS",
      );
    }
    throw error;
  }
}

export async function loginCitizen(email: string, password: string) {
  const user = await User.findOne({ email })
    .select("+passwordHash +tokenVersion")
    .exec();

  const passwordHash = user?.passwordHash ?? (await DUMMY_PASSWORD_HASH);
  const passwordMatches = await bcrypt.compare(password, passwordHash);

  if (
    !user ||
    !passwordMatches ||
    user.accountStatus !== "ACTIVE" ||
    !user.emailVerified
  ) {
    throw new AppError(
      "Email or password is incorrect, or the account is not eligible to sign in.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const expiresIn = getJwtExpiresIn();
  const accessToken = jwt.sign(
    { tokenVersion: user.tokenVersion },
    getJwtSecret(),
    {
      algorithm: "HS256",
      subject: user.id,
      expiresIn,
    },
  );

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn,
    user: {
      id: user.id,
      name: user.fullName,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      emailVerified: user.emailVerified,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

export async function revokeUserTokens(userId: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}
