import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Complaint } from "../src/modules/complaints/complaint.model";
import { Department } from "../src/modules/departments/department.model";
import { VerificationCode } from "../src/modules/auth/verification-code.model";
import { PasswordResetToken } from "../src/modules/auth/password-reset-token.model";
import { connectToDatabase } from "../src/database/connection";

const mailer = vi.hoisted(() => ({
  sendMail: vi.fn().mockResolvedValue({ accepted: ["test@example.invalid"] }),
}));

vi.mock("../src/config/email", () => ({
  createEmailTransport: () => ({
    from: "CivicAI Tests <test@example.invalid>",
    transporter: { sendMail: mailer.sendMail },
  }),
  getOtpHashSecret: () => "test-otp-hash-secret-with-at-least-32-chars",
  getFrontendUrl: () => "http://localhost:5173",
}));

const citizenPassword = "correct-horse-battery-staple";

async function createVerifiedUser(
  email: string,
  role: "CITIZEN" | "ADMIN" = "CITIZEN",
) {
  return User.create({
    fullName: role === "ADMIN" ? "PMC Administrator" : "Test Citizen",
    email,
    passwordHash: await bcrypt.hash(citizenPassword, 4),
    role,
    emailVerified: true,
    accountStatus: "ACTIVE",
  });
}

async function signIn(email: string, password = citizenPassword) {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}

describe("authentication API", () => {
  beforeEach(() => {
    mailer.sendMail.mockReset();
    mailer.sendMail.mockResolvedValue({ accepted: ["test@example.invalid"] });
  });

  it("registers citizens with a password hash and does not expose it", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      fullName: "New Citizen",
      email: "  Citizen@Example.COM ",
      password: citizenPassword,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
    expect(response.body.data.user.role).toBe("CITIZEN");
    expect(response.body.data.user.emailVerified).toBe(false);

    const stored = await User.findOne({ email: "citizen@example.com" })
      .select("+passwordHash")
      .exec();
    expect(stored?.passwordHash).not.toBe(citizenPassword);
    await expect(bcrypt.compare(citizenPassword, stored!.passwordHash)).resolves
      .toBe(true);
  });

  it("rejects invalid registration and public admin assignment", async () => {
    const invalid = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "bad", password: "short" });
    const admin = await request(app)
      .post("/api/v1/auth/register")
      .send({
        fullName: "Public Admin",
        email: "public-admin@example.com",
        password: citizenPassword,
        role: "ADMIN",
      });

    expect(invalid.status).toBe(400);
    expect(admin.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });

  it("handles duplicate emails through the unique index", async () => {
    const body = {
      fullName: "Test Citizen",
      email: "duplicate@example.com",
      password: citizenPassword,
    };
    expect((await request(app).post("/api/v1/auth/register").send(body)).status)
      .toBe(201);
    const duplicate = await request(app)
      .post("/api/v1/auth/register")
      .send(body);

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("verifies OTP once, rejects invalid and replayed codes", async () => {
    await request(app).post("/api/v1/auth/register").send({
      fullName: "OTP Citizen",
      email: "otp@example.com",
      password: citizenPassword,
    });

    const sent = await request(app)
      .post("/api/v1/auth/send-otp")
      .send({ email: "otp@example.com" });
    const resend = await request(app)
      .post("/api/v1/auth/resend-otp")
      .send({ email: "otp@example.com" });
    expect(sent.status).toBe(202);
    expect(resend.status).toBe(202);
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    expect(sent.body.message).not.toContain("otp@example.com");
    const code = mailer.sendMail.mock.calls[0][0].text.match(/\b\d{6}\b/)?.[0];
    expect(code).toBeDefined();
    const storedCode = await VerificationCode.findOne({
      email: "otp@example.com",
    }).select("+codeHash");
    expect(storedCode?.codeHash).not.toBe(code);

    const invalid = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ email: "otp@example.com", otp: "000000" });
    expect(invalid.status).toBe(400);

    const verified = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ email: "otp@example.com", otp: code });
    const replay = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ email: "otp@example.com", otp: code });

    expect(verified.status).toBe(200);
    expect(replay.status).toBe(400);
    expect(await User.findOne({ email: "otp@example.com" }).then((user) =>
      user?.emailVerified,
    )).toBe(true);
  });

  it("rejects expired OTP codes", async () => {
    await User.create({
      fullName: "Expired Citizen",
      email: "expired@example.com",
      passwordHash: await bcrypt.hash(citizenPassword, 4),
      emailVerified: false,
    });
    await request(app)
      .post("/api/v1/auth/send-otp")
      .send({ email: "expired@example.com" });
    const code = mailer.sendMail.mock.calls[0][0].text.match(/\b\d{6}\b/)?.[0];
    await mongooseUpdateOtpExpiry("expired@example.com");

    const response = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ email: "expired@example.com", otp: code });
    expect(response.status).toBe(400);
  });

  it("invalidates OTP after the maximum number of failed attempts", async () => {
    await User.create({
      fullName: "Attempt Limit Citizen",
      email: "attempts@example.com",
      passwordHash: await bcrypt.hash(citizenPassword, 4),
      emailVerified: false,
    });
    await request(app)
      .post("/api/v1/auth/send-otp")
      .send({ email: "attempts@example.com" });
    const code = mailer.sendMail.mock.calls[0][0].text.match(/\b\d{6}\b/)?.[0];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app)
        .post("/api/v1/auth/verify-otp")
        .send({ email: "attempts@example.com", otp: "000000" });
      expect(response.status).toBe(400);
    }

    const correctAfterLimit = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ email: "attempts@example.com", otp: code });
    expect(correctAfterLimit.status).toBe(400);
  });

  it("logs in verified users, validates JWTs, and revokes tokens on logout", async () => {
    await createVerifiedUser("login@example.com");
    const wrongPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "login@example.com", password: "wrong-password" });
    expect(wrongPassword.status).toBe(401);

    const token = await signIn("login@example.com");
    const current = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(current.status).toBe(200);
    expect(current.body.data.user.email).toBe("login@example.com");
    expect(current.body.data.user).not.toHaveProperty("passwordHash");

    const logout = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    const afterLogout = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(logout.status).toBe(200);
    expect(afterLogout.status).toBe(401);
  });

  it("rejects malformed and expired JWTs", async () => {
    const malformed = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer not-a-jwt");
    const expiredToken = jwt.sign(
      { tokenVersion: 0 },
      process.env.JWT_SECRET!,
      { subject: "507f1f77bcf86cd799439011", expiresIn: -1 },
    );
    const expired = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(malformed.status).toBe(401);
    expect(expired.status).toBe(401);
  });

  it("rejects login before email verification", async () => {
    await User.create({
      fullName: "Unverified Citizen",
      email: "unverified@example.com",
      passwordHash: await bcrypt.hash(citizenPassword, 4),
      emailVerified: false,
    });
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "unverified@example.com",
        password: citizenPassword,
      });

    expect(response.status).toBe(401);
  });

  it("does not reveal whether an account exists in password reset responses", async () => {
    await createVerifiedUser("reset@example.com");
    const known = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "reset@example.com" });
    const unknown = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "unknown@example.com" });

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body).toEqual(unknown.body);
  });

  it("resets passwords with single-use tokens and revokes previous access tokens", async () => {
    await createVerifiedUser("reset-token@example.com");
    const oldAccessToken = await signIn("reset-token@example.com");
    await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "reset-token@example.com" });
    const resetMessage = mailer.sendMail.mock.calls[0][0].text as string;
    const resetToken = resetMessage.match(/token=([A-Za-z0-9_-]+)/)?.[1];
    expect(resetToken).toBeDefined();

    const reset = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: resetToken, password: "new-correct-password" });
    const replay = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: resetToken, password: "another-correct-password" });
    const revoked = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${oldAccessToken}`);
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "reset-token@example.com",
        password: "new-correct-password",
      });

    expect(reset.status).toBe(200);
    expect(replay.status).toBe(400);
    expect(revoked.status).toBe(401);
    expect(login.status).toBe(200);
  });

  it("rejects expired password reset tokens", async () => {
    await createVerifiedUser("expired-reset@example.com");
    await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "expired-reset@example.com" });
    const resetMessage = mailer.sendMail.mock.calls[0][0].text as string;
    const resetToken = resetMessage.match(/token=([A-Za-z0-9_-]+)/)?.[1];
    const expiredUser = await User.findOne({
      email: "expired-reset@example.com",
    });
    if (!expiredUser) {
      throw new Error("Test setup failed to create the reset account.");
    }
    await PasswordResetToken.updateOne(
      { userId: expiredUser._id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    const response = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: resetToken, password: "new-correct-password" });
    expect(response.status).toBe(400);
  });

  it("fails startup cleanly when the MongoDB URI is missing", async () => {
    const configuredUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;
    try {
      await expect(connectToDatabase()).rejects.toThrow(
        "MONGODB_URI is required to start the backend.",
      );
    } finally {
      if (configuredUri !== undefined) {
        process.env.MONGODB_URI = configuredUri;
      }
    }
  });
});

describe("complaint, department, and dashboard APIs", () => {
  it("enforces ownership, citizen edit limits, and admin access", async () => {
    const firstCitizen = await createVerifiedUser("first@example.com");
    const secondCitizen = await createVerifiedUser("second@example.com");
    const admin = await createVerifiedUser("admin@example.com", "ADMIN");
    const firstToken = await signIn(firstCitizen.email);
    const secondToken = await signIn(secondCitizen.email);
    const adminToken = await signIn(admin.email);

    const created = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        title: "Blocked road drain",
        description: "The roadside drain is blocked and water is overflowing.",
        category: "Drainage",
        location: { address: "Main Road, Pune" },
        citizenId: secondCitizen.id,
        status: "RESOLVED",
      });
    expect(created.status).toBe(400);
    const complaintResponse = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        title: "Blocked road drain",
        description: "The roadside drain is blocked and water is overflowing.",
        category: "Drainage",
        location: { address: "Main Road, Pune" },
      });

    expect(complaintResponse.status).toBe(201);
    const complaint = complaintResponse.body.data.complaint;
    expect(complaint.citizenId).toBe(firstCitizen.id);
    expect(complaint.status).toBe("SUBMITTED");

    const hiddenFromOtherCitizen = await request(app)
      .get(`/api/v1/complaints/${complaint._id}`)
      .set("Authorization", `Bearer ${secondToken}`);
    const ownerView = await request(app)
      .get(`/api/v1/complaints/${complaint._id}`)
      .set("Authorization", `Bearer ${firstToken}`);
    const forbiddenStatus = await request(app)
      .patch(`/api/v1/complaints/${complaint._id}`)
      .set("Authorization", `Bearer ${firstToken}`)
      .send({ status: "RESOLVED" });
    const citizenList = await request(app)
      .get("/api/v1/complaints?page=1&limit=5")
      .set("Authorization", `Bearer ${firstToken}`);
    const adminList = await request(app)
      .get("/api/v1/complaints")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(hiddenFromOtherCitizen.status).toBe(404);
    expect(ownerView.status).toBe(200);
    expect(forbiddenStatus.status).toBe(403);
    expect(citizenList.body.data.complaints).toHaveLength(1);
    expect(adminList.body.data.complaints).toHaveLength(1);
  });

  it("assigns departments, returns actual dashboard data, and restricts it to admins", async () => {
    const admin = await createVerifiedUser("dashboard-admin@example.com", "ADMIN");
    const citizen = await createVerifiedUser("dashboard-citizen@example.com");
    const adminToken = await signIn(admin.email);
    const citizenToken = await signIn(citizen.email);
    const department = await Department.create({
      name: "Roads",
      slug: "roads",
      isActive: true,
    });
    const complaint = await Complaint.create({
      title: "Pothole on street",
      description: "A large pothole is damaging vehicles.",
      category: "Roads",
      location: { address: "Sample Street" },
      citizenId: citizen._id,
    });

    const citizenDashboard = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${citizenToken}`);
    const assigned = await request(app)
      .patch(`/api/v1/complaints/${complaint.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ departmentId: department.id, status: "ASSIGNED" });
    const dashboard = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);
    const departments = await request(app).get("/api/v1/departments");

    expect(citizenDashboard.status).toBe(403);
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.complaint.status).toBe("ASSIGNED");
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.totalComplaints).toBe(1);
    expect(dashboard.body.data.complaintsByStatus).toContainEqual({
      _id: "ASSIGNED",
      count: 1,
    });
    expect(departments.status).toBe(200);
    expect(departments.body.data.departments).toHaveLength(1);
  });

  it("scopes notifications to the authenticated user and supports read state", async () => {
    const admin = await createVerifiedUser("notify-admin@example.com", "ADMIN");
    const citizen = await createVerifiedUser("notify-citizen@example.com");
    const adminToken = await signIn(admin.email);
    const citizenToken = await signIn(citizen.email);
    await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        title: "Damaged street sign",
        description: "The sign is damaged and cannot be read.",
        category: "Roads",
        location: { address: "Pune" },
      });

    const adminNotifications = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    const citizenNotifications = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${citizenToken}`);
    const notificationId =
      adminNotifications.body.data.notifications[0]._id as string;
    const read = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set("Authorization", `Bearer ${adminToken}`);
    const unreadCitizenNotification = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(adminNotifications.body.data.unreadCount).toBe(1);
    expect(citizenNotifications.body.data.notifications).toHaveLength(0);
    expect(read.status).toBe(200);
    expect(unreadCitizenNotification.status).toBe(404);
  });
});

async function mongooseUpdateOtpExpiry(email: string): Promise<void> {
  await VerificationCode.updateOne(
    { email },
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  );
}
