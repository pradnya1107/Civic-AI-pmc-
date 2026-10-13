import nodemailer from "nodemailer";
import { AppError } from "../utils/app-error";
import { isDevOtpLoggingEnabled } from "../modules/auth/auth-diagnostics";

const REQUIRED_SMTP_SETTINGS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
] as const;

function required(name: string, fallbackName?: string): string {
  const value =
    process.env[name]?.trim() ||
    (fallbackName ? process.env[fallbackName]?.trim() : undefined);
  if (!value) {
    throw new AppError(
      `${name} is required for email delivery.`,
      503,
      "EMAIL_CONFIGURATION_ERROR",
    );
  }
  return value;
}

export function createEmailTransport() {
  const hasSmtpConfiguration = [
    ...REQUIRED_SMTP_SETTINGS,
    "SMTP_PASS",
    "EMAIL_FROM",
  ].some((name) => process.env[name]?.trim());
  if (!hasSmtpConfiguration && isDevOtpLoggingEnabled()) {
    return {
      from: "CivicAI PMC development-only",
      transporter: null,
    };
  }

  const port = Number(required("SMTP_PORT"));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AppError(
      "SMTP_PORT must be a valid TCP port.",
      503,
      "EMAIL_CONFIGURATION_ERROR",
    );
  }

  const secureValue = (process.env.SMTP_SECURE ?? "false").toLowerCase();
  if (secureValue !== "true" && secureValue !== "false") {
    throw new AppError(
      "SMTP_SECURE must be true or false.",
      503,
      "EMAIL_CONFIGURATION_ERROR",
    );
  }

  const from = required("SMTP_FROM", "EMAIL_FROM");

  return {
    from,
    transporter: nodemailer.createTransport({
      host: required("SMTP_HOST"),
      port,
      secure: secureValue === "true",
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: {
        user: required("SMTP_USER"),
        pass: required("SMTP_PASSWORD", "SMTP_PASS"),
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    }),
  };
}

export function wasRecipientAccepted(
  result: unknown,
  recipient: string,
): boolean {
  if (
    typeof result !== "object" ||
    result === null ||
    !("accepted" in result) ||
    !Array.isArray(result.accepted)
  ) {
    return false;
  }

  return result.accepted.some((accepted) => {
    if (typeof accepted === "string") {
      return accepted.toLowerCase() === recipient.toLowerCase();
    }
    return (
      typeof accepted === "object" &&
      accepted !== null &&
      "address" in accepted &&
      typeof accepted.address === "string" &&
      accepted.address.toLowerCase() === recipient.toLowerCase()
    );
  });
}

export function getOtpHashSecret(): string {
  const secret = required("OTP_HASH_SECRET");
  if (secret.length < 32) {
    throw new AppError(
      "OTP_HASH_SECRET must be at least 32 characters.",
      503,
      "EMAIL_CONFIGURATION_ERROR",
    );
  }
  return secret;
}

export function getFrontendUrl(): string {
  const frontendUrl = required("FRONTEND_URL");
  try {
    const parsedUrl = new URL(frontendUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid URL protocol");
    }
    return parsedUrl.toString().replace(/\/$/, "");
  } catch {
    throw new AppError(
      "FRONTEND_URL must be an HTTP or HTTPS URL.",
      503,
      "EMAIL_CONFIGURATION_ERROR",
    );
  }
}
