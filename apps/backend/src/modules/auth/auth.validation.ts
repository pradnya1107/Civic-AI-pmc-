import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72);

const emailAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    email: emailAddressSchema,
    password: passwordSchema,
    phoneNumber: z.string().trim().min(1).max(32).optional(),
  })
  .strict();

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
