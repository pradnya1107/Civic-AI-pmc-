import { AppError } from "../utils/app-error";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new AppError(
      "JWT_SECRET must be configured with at least 32 characters.",
      500,
      "SERVER_CONFIGURATION_ERROR",
    );
  }
  return secret;
}

export function getJwtExpiresIn(): number {
  const expiresIn = process.env.JWT_EXPIRES_IN?.trim() || "15m";
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new AppError(
      "JWT_EXPIRES_IN must use an integer followed by s, m, h, or d.",
      500,
      "SERVER_CONFIGURATION_ERROR",
    );
  }
  const amount = Number(match[1]);
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  const multiplier = multipliers[match[2]];
  const seconds = amount * multiplier;
  if (!Number.isSafeInteger(seconds) || seconds < 1) {
    throw new AppError(
      "JWT_EXPIRES_IN must be a positive duration.",
      500,
      "SERVER_CONFIGURATION_ERROR",
    );
  }
  return seconds;
}
