import dotenv from "dotenv";
import app from "./app";
import {
  connectToDatabase,
  disconnectFromDatabase,
  formatMongoConnectionError,
} from "./database/connection";
import { getJwtExpiresIn, getJwtSecret } from "./config/auth";
import { AppError } from "./utils/app-error";
import {
  createEmailTransport,
  getFrontendUrl,
  getOtpHashSecret,
} from "./config/email";
import { isDevOtpLoggingEnabled } from "./modules/auth/auth-diagnostics";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

async function startServer(): Promise<void> {
  try {
    getJwtSecret();
    getJwtExpiresIn();
    getOtpHashSecret();
    isDevOtpLoggingEnabled();
    createEmailTransport();
    getFrontendUrl();
  } catch (error) {
    console.error(
      error instanceof AppError
        ? `Unable to start CivicAI Backend: ${error.message}`
        : "Unable to start CivicAI Backend. Check required configuration.",
    );
    process.exitCode = 1;
    return;
  }

  try {
    await connectToDatabase();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "MONGODB_URI is required to start the backend."
    ) {
      console.error(`Unable to start CivicAI Backend: ${error.message}`);
    } else {
      console.error(
        "Unable to start CivicAI Backend because MongoDB connection failed.",
      );
      console.error(formatMongoConnectionError(error));
    }
    process.exitCode = 1;
    return;
  }

  const server = app.listen(PORT, () => {
    console.log(`CivicAI Backend running on port ${PORT}`);
  });

  let isShuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`${signal} received. Shutting down CivicAI Backend.`);

    server.close(async (error) => {
      if (error) {
        console.error("Failed to close the HTTP server cleanly.");
        process.exitCode = 1;
      }

      try {
        await disconnectFromDatabase();
      } catch (disconnectError) {
        const reason =
          disconnectError instanceof Error
            ? ` (${disconnectError.name})`
            : "";
        console.error(`Failed to disconnect from MongoDB${reason}.`);
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void startServer();