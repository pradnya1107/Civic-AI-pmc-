import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { z } from "zod";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "../database/connection";
import { User } from "../modules/users/user.model";

dotenv.config();

const bootstrapSchema = z.object({
  ADMIN_FULL_NAME: z.string().trim().min(1).max(120),
  ADMIN_EMAIL: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email().max(254)),
  ADMIN_PASSWORD: z
    .string()
    .min(12)
    .max(128)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
});

async function createFirstAdmin(): Promise<void> {
  const values = bootstrapSchema.safeParse(process.env);
  if (!values.success) {
    throw new Error(
      "Set valid ADMIN_FULL_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD values before running this command.",
    );
  }

  await connectToDatabase();
  if (await User.exists({ role: "ADMIN" })) {
    throw new Error("An administrator already exists; bootstrap is disabled.");
  }

  const passwordHash = await bcrypt.hash(
    values.data.ADMIN_PASSWORD,
    12,
  );

  await User.create({
    fullName: values.data.ADMIN_FULL_NAME,
    email: values.data.ADMIN_EMAIL,
    passwordHash,
    role: "ADMIN",
    emailVerified: true,
    accountStatus: "ACTIVE",
  });
  console.info("Initial administrator account created.");
}

void createFirstAdmin()
  .catch((error: unknown) => {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const isSafeBootstrapError =
      error instanceof Error &&
      (error.message.startsWith("Set valid") ||
        error.message.startsWith("An administrator"));
    const message = isSafeBootstrapError
      ? error.message
      : `Administrator bootstrap failed (${errorName}).`;
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await disconnectFromDatabase();
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "UnknownError";
      console.error(`Database shutdown failed (${errorName}).`);
      process.exitCode = 1;
    }
  });
