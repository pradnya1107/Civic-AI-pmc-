import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must not exceed 128 characters.")
  .refine(
    (password) =>
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password),
    {
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    },
  )
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
    message: "Password exceeds maximum byte length.",
  });

const emailAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    fullName: z.string().trim().min(1).max(120).optional(),
    email: emailAddressSchema,
    password: passwordSchema,
    confirmPassword: z.string().optional(),
    phoneNumber: z.string().trim().min(1).max(32).optional(),
  })
  .strict()
  .refine(
    (data) =>
      Boolean(
        (data.name && data.name.trim().length > 0) ||
          (data.fullName && data.fullName.trim().length > 0),
      ),
    {
      message: "Name is required.",
      path: ["name"],
    },
  )
  .refine(
    (data) => !data.confirmPassword || data.password === data.confirmPassword,
    {
      message: "Confirm password must match password.",
      path: ["confirmPassword"],
    },
  );

export type RegisterInput = z.infer<typeof registerSchema>;

export const emailSchema = z
  .object({ email: emailAddressSchema })
  .strict();

export const verifyOtpSchema = z
  .object({
    email: emailAddressSchema,
    otp: z.string().regex(/^\d{6}$/),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailAddressSchema,
    password: z
      .string()
      .min(1)
      .max(128)
      .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
  })
  .strict();

export const resetPasswordRequestSchema = emailSchema;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(256),
    password: passwordSchema,
  })
  .strict();
