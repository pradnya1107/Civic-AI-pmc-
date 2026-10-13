type DevOtpEvent = {
  event: string;
  email: string;
  expiresAt?: Date;
  status?: string;
  otp?: string;
};

let productionWarningLogged = false;

export function isDevOtpLoggingEnabled(): boolean {
  if (process.env.AUTH_DEV_OTP_LOGGING?.trim().toLowerCase() !== "true") {
    return false;
  }

  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  ) {
    return true;
  }

  if (!productionWarningLogged) {
    console.warn(
      "[AUTH] AUTH_DEV_OTP_LOGGING is ignored outside development and test environments.",
    );
    productionWarningLogged = true;
  }
  return false;
}

export function maskAuthEmail(email: string): string {
  const separator = email.lastIndexOf("@");
  if (separator <= 0 || separator === email.length - 1) {
    return "***";
  }
  return `${email[0]}***${email.slice(separator)}`;
}

export function logDevOtpEvent(event: DevOtpEvent): void {
  if (!isDevOtpLoggingEnabled()) {
    return;
  }

  console.info(
    `[AUTH][DEV ONLY] ${JSON.stringify({
      event: event.event,
      email: maskAuthEmail(event.email),
      ...(event.expiresAt
        ? { expiresAt: event.expiresAt.toISOString() }
        : {}),
      ...(event.status ? { status: event.status } : {}),
      ...(event.otp ? { otp: event.otp } : {}),
    })}`,
  );
}

export function logEmailDeliveryFailure(
  event: "otp" | "password_reset",
  email: string,
  error: unknown,
): void {
  const rawName = error instanceof Error ? error.name : "";
  const errorName = /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(rawName)
    ? rawName
    : "UnknownError";

  console.error(
    `[AUTH] ${JSON.stringify({
      event: `${event}_email_delivery`,
      email: maskAuthEmail(email),
      status: "failed",
      errorName,
    })}`,
  );
}

export function displayTerminalDevOtp(options: {
  event: string;
  email: string;
  otp: string;
  expiresInMinutes?: number;
}): void {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.NODE_ENV === "test"
  ) {
    return;
  }

  const minutes = options.expiresInMinutes ?? 10;
  console.log(`\n[CivicAI Auth] ${options.event}`);
  console.log(`[CivicAI Auth] Email: ${options.email}`);
  console.log(`[CivicAI Auth] Development OTP: ${options.otp}`);
  console.log(`[CivicAI Auth] OTP expires in ${minutes} minutes\n`);
}
