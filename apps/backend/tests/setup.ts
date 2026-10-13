import { afterAll, afterEach, beforeAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
process.env.NODE_ENV = "test";
process.env.AUTH_DEV_OTP_LOGGING = "false";
process.env.JWT_EXPIRES_IN = "15m";
process.env.OTP_HASH_SECRET = "test-otp-hash-secret-with-at-least-32-chars";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.SMTP_HOST = "localhost";
process.env.SMTP_PORT = "2525";
process.env.SMTP_SECURE = "false";
process.env.SMTP_USER = "test-user";
process.env.SMTP_PASSWORD = "test-password";
process.env.SMTP_FROM = "CivicAI Tests <test@example.invalid>";

let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "civicai_test",
  });
});

afterEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});
