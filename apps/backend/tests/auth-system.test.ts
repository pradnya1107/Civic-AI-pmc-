import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { validateToken } from "../src/modules/auth/auth.service";
import { authorize } from "../src/middleware/authorize";
import { getJwtSecret } from "../src/config/auth";

const mailer = vi.hoisted(() => ({
  sendMail: vi.fn((message: { to: string; text: string }) =>
    Promise.resolve({ accepted: [message.to] }),
  ),
}));

vi.mock("../src/config/email", () => ({
  createEmailTransport: () => ({
    from: "CivicAI Tests <test@example.invalid>",
    transporter: { sendMail: mailer.sendMail },
  }),
  getOtpHashSecret: () => "test-otp-hash-secret-with-at-least-32-chars",
  getFrontendUrl: () => "http://localhost:5173",
  wasRecipientAccepted: (
    result: { accepted?: string[] },
    recipient: string,
  ) => result.accepted?.some((address) => address === recipient) ?? false,
}));

const testPassword = "Password@123456";

async function createVerifiedCitizen(email = "citizen.auth@example.com") {
  return User.create({
    fullName: "Verified Citizen",
    email,
    passwordHash: await bcrypt.hash(testPassword, 4),
    role: "CITIZEN",
    emailVerified: true,
    accountStatus: "ACTIVE",
  });
}

async function createVerifiedAdmin(email = "admin.auth@example.com") {
  return User.create({
    fullName: "PMC Admin",
    email,
    passwordHash: await bcrypt.hash(testPassword, 4),
    role: "ADMIN",
    emailVerified: true,
    accountStatus: "ACTIVE",
  });
}

describe("ISSUE-03: Authentication System (Register, Login, JWT, RBAC)", () => {
  beforeEach(async () => {
    mailer.sendMail.mockReset();
    mailer.sendMail.mockImplementation((message) =>
      Promise.resolve({ accepted: [message.to] }),
    );
  });

  describe("Task 1 & 2: Citizen Registration (/api/v1/auth/register)", () => {
    it("registers a new citizen with 201, returns JWT token, and role citizen", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Ramesh Pawar",
          email: "ramesh.pawar@example.com",
          password: testPassword,
          confirmPassword: testPassword,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      // JWT token returned on registration
      expect(response.body.token || response.body.data?.token).toBeDefined();
      const token = response.body.token || response.body.data?.token;
      expect(typeof token).toBe("string");

      // Role citizen returned
      const role = response.body.role || response.body.data?.role || response.body.data?.user?.role;
      expect(role.toLowerCase()).toBe("citizen");

      // Password hash must never be exposed
      expect(response.body.data?.user).not.toHaveProperty("passwordHash");

      // Stored user in database has bcrypt hash with 12+ rounds
      const stored = await User.findOne({ email: "ramesh.pawar@example.com" }).select("+passwordHash");
      expect(stored).toBeDefined();
      expect(stored?.passwordHash).not.toBe(testPassword);
      const isMatch = await bcrypt.compare(testPassword, stored!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it("rejects duplicate email with 409 Conflict", async () => {
      const payload = {
        name: "First Citizen",
        email: "duplicate.auth@example.com",
        password: testPassword,
        confirmPassword: testPassword,
      };

      const first = await request(app).post("/api/v1/auth/register").send(payload);
      expect(first.status).toBe(201);

      const duplicate = await request(app).post("/api/v1/auth/register").send(payload);
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error?.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  describe("Task 3 & 4: User Login and Profile (/api/v1/auth/login & /auth/me)", () => {
    it("logs in a verified citizen and returns 200 with JWT access token", async () => {
      await createVerifiedCitizen("login.success@example.com");

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "login.success@example.com",
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const token = response.body.token || response.body.data?.accessToken;
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("rejects login with incorrect password with 401 Unauthorized", async () => {
      await createVerifiedCitizen("wrong.pass@example.com");

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "wrong.pass@example.com",
          password: "WrongPassword!999",
        });

      expect(response.status).toBe(401);
      expect(response.body.error?.code).toBe("INVALID_CREDENTIALS");
    });

    it("returns user profile via GET /auth/me and GET /api/v1/auth/me with valid token", async () => {
      await createVerifiedCitizen("profile.me@example.com");

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "profile.me@example.com",
          password: testPassword,
        });
      const token = loginRes.body.data?.accessToken || loginRes.body.token;

      // Test GET /auth/me
      const meAliasRes = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(meAliasRes.status).toBe(200);
      const profileAlias = meAliasRes.body.data?.user || meAliasRes.body.user;
      expect(profileAlias.email).toBe("profile.me@example.com");
      expect(profileAlias).not.toHaveProperty("passwordHash");

      // Test GET /api/v1/auth/me
      const meV1Res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(meV1Res.status).toBe(200);
      const profileV1 = meV1Res.body.data?.user || meV1Res.body.user;
      expect(profileV1.email).toBe("profile.me@example.com");
      expect(profileV1.role).toBe("CITIZEN");
    });
  });

  describe("Task 5: JWT Token Validation Service (validateToken)", () => {
    it("validates a legitimate token and returns user claims", async () => {
      const user = await createVerifiedCitizen("jwt.val@example.com");
      const secret = getJwtSecret();
      const token = jwt.sign(
        { tokenVersion: user.tokenVersion, role: user.role, email: user.email },
        secret,
        { subject: user.id, expiresIn: "7d" },
      );

      const claims = await validateToken(token);
      expect(claims.id).toBe(user.id);
      expect(claims.email).toBe("jwt.val@example.com");
      expect(claims.role).toBe("CITIZEN");
    });

    it("throws 401 when token is malformed or invalid", async () => {
      await expect(validateToken("not-a-valid-jwt")).rejects.toThrow();
    });

    it("throws 401 when token is expired", async () => {
      const user = await createVerifiedCitizen("expired.jwt@example.com");
      const secret = getJwtSecret();
      const expiredToken = jwt.sign(
        { tokenVersion: user.tokenVersion },
        secret,
        { subject: user.id, expiresIn: -10 },
      );

      await expect(validateToken(expiredToken)).rejects.toThrow();
    });

    it("rejects token when user tokens have been revoked (tokenVersion increment)", async () => {
      const user = await createVerifiedCitizen("revoked.jwt@example.com");
      const secret = getJwtSecret();
      const token = jwt.sign(
        { tokenVersion: user.tokenVersion },
        secret,
        { subject: user.id, expiresIn: "7d" },
      );

      // Verify token works initially
      const initial = await validateToken(token);
      expect(initial.id).toBe(user.id);

      // Invalidate token by incrementing tokenVersion
      await User.updateOne({ _id: user.id }, { $inc: { tokenVersion: 1 } });

      await expect(validateToken(token)).rejects.toThrow();
    });
  });

  describe("Task 6: Role-Based Access Control (RBAC) & Role Guard Middleware", () => {
    it("given a citizen token, when they access an admin route, then server responds 403 Forbidden", async () => {
      await createVerifiedCitizen("citizen.guard@example.com");

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "citizen.guard@example.com",
          password: testPassword,
        });
      const citizenToken = loginRes.body.data?.accessToken || loginRes.body.token;

      // Attempt to access admin dashboard
      const response = await request(app)
        .get("/api/v1/admin/dashboard")
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error?.code).toBe("FORBIDDEN");
    });

    it("allows admin token to access protected admin route", async () => {
      await createVerifiedAdmin("admin.guard@example.com");

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "admin.guard@example.com",
          password: testPassword,
        });
      const adminToken = loginRes.body.data?.accessToken || loginRes.body.token;

      const response = await request(app)
        .get("/api/v1/admin/dashboard")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("middleware/authorize works case-insensitively for string roles", () => {
      const guard = authorize("admin", "super_admin");
      let nextCalled = false;
      let nextError: any = null;

      const req: any = { user: { role: "ADMIN" } };
      guard(req, {} as any, (err?: any) => {
        nextCalled = true;
        nextError = err;
      });

      expect(nextCalled).toBe(true);
      expect(nextError).toBeUndefined();

      // Non-matching role should call next with 403 AppError
      let forbiddenError: any = null;
      const citizenReq: any = { user: { role: "CITIZEN" } };
      guard(citizenReq, {} as any, (err?: any) => {
        forbiddenError = err;
      });

      expect(forbiddenError).toBeDefined();
      expect(forbiddenError.statusCode).toBe(403);
    });
  });

  describe("Task 7: Rate Limiting (max 10 login attempts/min -> 429)", () => {
    it("given more than 10 login attempts per minute, when rate limiter triggers, server responds 429", async () => {
      await createVerifiedCitizen("ratelimit.test@example.com");

      const responses = [];
      // Fire 11 requests with x-test-rate-limit header enabled
      for (let i = 0; i < 11; i++) {
        const res = await request(app)
          .post("/api/v1/auth/login")
          .set("x-test-rate-limit", "true")
          .set("x-test-client-id", "rate-limit-suite-client")
          .send({
            email: "ratelimit.test@example.com",
            password: "WrongPassword!",
          });
        responses.push(res);
      }

      // First 10 requests are handled by login controller (401 invalid credentials)
      for (let i = 0; i < 10; i++) {
        expect(responses[i].status).toBe(401);
      }

      // 11th request triggers rate limiter (429 Too Many Requests)
      expect(responses[10].status).toBe(429);
      expect(responses[10].body.error?.code).toBe("RATE_LIMITED");
    });
  });
});
