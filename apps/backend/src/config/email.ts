import nodemailer from "nodemailer";
import { AppError } from "../utils/app-error";

function required(name: string): string {
  const value = process.env[name]?.trim();
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

  const from = required("SMTP_FROM");

  return {
    from,
    transporter: nodemailer.createTransport({
      host: required("SMTP_HOST"),
      port,
      secure: secureValue === "true",
      auth: {
        user: required("SMTP_USER"),
        pass: required("SMTP_PASSWORD"),
      },
    }),
  };
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
