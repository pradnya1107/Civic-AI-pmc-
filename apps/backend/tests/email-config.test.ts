import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEmailTransport,
  wasRecipientAccepted,
} from "../src/config/email";
import { isDevOtpLoggingEnabled } from "../src/modules/auth/auth-diagnostics";

const smtpSettings = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "SMTP_SECURE",
] as const;
const previousSmtpSettings = new Map(
  smtpSettings.map((setting) => [setting, process.env[setting]]),
);

afterEach(() => {
  for (const setting of smtpSettings) {
    const previousValue = previousSmtpSettings.get(setting);
    if (previousValue === undefined) {
      delete process.env[setting];
    } else {
      process.env[setting] = previousValue;
    }
  }
  process.env.NODE_ENV = "test";
  process.env.AUTH_DEV_OTP_LOGGING = "false";
});

describe("email transport configuration", () => {
  it("allows no-SMTP OTP inspection only with explicit non-production opt-in", () => {
    for (const setting of smtpSettings) {
      delete process.env[setting];
    }
    process.env.NODE_ENV = "development";
    process.env.AUTH_DEV_OTP_LOGGING = "true";

    const transport = createEmailTransport();

    expect(transport.transporter).toBeNull();
    expect(transport.from).toContain("development-only");
  });

  it("does not provide a no-SMTP fallback when development logging is disabled", () => {
    for (const setting of smtpSettings) {
      delete process.env[setting];
    }
    process.env.NODE_ENV = "development";
    process.env.AUTH_DEV_OTP_LOGGING = "false";

    expect(() => createEmailTransport()).toThrow(
      "SMTP_PORT is required for email delivery.",
    );
  });

  it("requires the mail transport to confirm acceptance of the recipient", () => {
    expect(
      wasRecipientAccepted(
        { accepted: ["citizen@example.com"] },
        "citizen@example.com",
      ),
    ).toBe(true);
    expect(
      wasRecipientAccepted(
        { accepted: [], rejected: ["citizen@example.com"] },
        "citizen@example.com",
      ),
    ).toBe(false);
    expect(wasRecipientAccepted({}, "citizen@example.com")).toBe(false);
  });

  it("ignores and warns about development OTP logging in production", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.NODE_ENV = "production";
    process.env.AUTH_DEV_OTP_LOGGING = "true";

    expect(isDevOtpLoggingEnabled()).toBe(false);
    expect(warning.mock.calls.flat().join("\n")).toContain(
      "ignored outside development and test environments",
    );
  });
});
