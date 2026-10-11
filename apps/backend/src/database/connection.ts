import mongoose from "mongoose";

export type DatabaseStatus =
  | "connected"
  | "connecting"
  | "disconnecting"
  | "disconnected";

function sanitizeMongoErrorMessage(message: string): string {
  const mongoUri = process.env.MONGODB_URI?.trim();
  let sanitized = mongoUri
    ? message.split(mongoUri).join("[REDACTED_MONGODB_URI]")
    : message;

  sanitized = sanitized
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "[REDACTED_MONGODB_URI]")
    .replace(/([^\s/@:]+):([^@\s/]+)@/g, "[REDACTED]@")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 500);

  return sanitized;
}

export function formatMongoConnectionError(error: unknown): string {
  const name = error instanceof Error ? error.name : "UnknownError";
  const message =
    error instanceof Error
      ? sanitizeMongoErrorMessage(error.message)
      : "Unknown MongoDB connection failure.";
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (typeof error.code === "string" || typeof error.code === "number")
      ? `, code ${String(error.code).replace(/[\r\n\t]/g, "").slice(0, 80)}`
      : "";

  return `MongoDB connection error (${name}${code}): ${message}`;
}

function logMongoConnectionError(error: Error): void {
  console.error(formatMongoConnectionError(error));
}

export async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to start the backend.");
  }

  await mongoose.connect(mongoUri);

  mongoose.connection.off("error", logMongoConnectionError);
  mongoose.connection.on("error", logMongoConnectionError);

  console.log("MongoDB connected successfully");
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function getDatabaseStatus(): DatabaseStatus {
  switch (mongoose.connection.readyState) {
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "disconnected";
  }
}
