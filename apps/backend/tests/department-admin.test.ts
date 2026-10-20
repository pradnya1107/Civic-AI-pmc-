import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Department } from "../src/modules/departments/department.model";
import { Complaint } from "../src/modules/complaints/complaint.model";

const superAdminPassword = "SuperAdmin@123456";
const citizenPassword = "Citizen@123456";

async function createSuperAdmin() {
  return User.create({
    fullName: "Chief Super Admin",
    email: "superadmin.test@civicai.local",
    passwordHash: await bcrypt.hash(superAdminPassword, 4),
    role: "SUPER_ADMIN",
    emailVerified: true,
    accountStatus: "ACTIVE",
  });
}

async function createCitizen(email = "citizen.test@civicai.local") {
  return User.create({
    fullName: "Citizen User",
    email,
    passwordHash: await bcrypt.hash(citizenPassword, 4),
    role: "CITIZEN",
    emailVerified: true,
    accountStatus: "ACTIVE",
  });
}

async function loginUser(email: string, password: string): Promise<string> {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}

describe("Department Admin Management (Demo Mode)", () => {
  let superAdminToken: string;
  let citizenToken: string;
  let roadsDept: any;
  let wasteDept: any;

  beforeEach(async () => {
    // Seed test departments
    roadsDept = await Department.create({
      name: "Roads Department",
      slug: "roads-test-dept",
      description: "Roads and bridges",
      isActive: true,
    });

    wasteDept = await Department.create({
      name: "Waste Management",
      slug: "waste-test-dept",
      description: "Waste and sanitation",
      isActive: true,
    });

    await createSuperAdmin();
    superAdminToken = await loginUser("superadmin.test@civicai.local", superAdminPassword);

    await createCitizen();
    citizenToken = await loginUser("citizen.test@civicai.local", citizenPassword);
  });

  describe("Super Admin - Create Department Admin", () => {
    it("allows Super Admin to create a Department Admin account and returns credentials in demo mode", async () => {
      const response = await request(app)
        .post("/api/v1/admin/department-admins")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          departmentId: roadsDept.id,
          fullName: "Roads Admin Demo",
          email: "roads.demo@civicai.local",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.admin.fullName).toBe("Roads Admin Demo");
      expect(response.body.data.admin.email).toBe("roads.demo@civicai.local");
      expect(response.body.data.admin.department.id).toBe(roadsDept.id);
      expect(response.body.data.temporaryPassword).toBeDefined();
      expect(response.body.data.confirmationOtp).toBeDefined();
      expect(response.body.data.confirmationOtp).toMatch(/^\d{6}$/);

      // Check DB password is encrypted
      const userInDb = await User.findOne({ email: "roads.demo@civicai.local" }).select("+passwordHash");
      expect(userInDb).not.toBeNull();
      expect(userInDb?.passwordHash).not.toBe(response.body.data.temporaryPassword);
      const matches = await bcrypt.compare(response.body.data.temporaryPassword, userInDb!.passwordHash);
      expect(matches).toBe(true);

      // Verify the generated credentials can log in
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "roads.demo@civicai.local",
        password: response.body.data.temporaryPassword,
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.role).toBe("DEPARTMENT_ADMIN");
      expect(loginRes.body.data.user.departmentId).toBe(roadsDept.id);
      expect(loginRes.body.data.user.departmentName).toBe("Roads Department");
    });

    it("handles 2-step terminal OTP authentication for Department Admin login", async () => {
      const response = await request(app)
        .post("/api/v1/admin/department-admins")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          departmentId: roadsDept.id,
          fullName: "OTP Admin Demo",
          email: "otp.demo@civicai.local",
        });

      expect(response.status).toBe(201);
      const tempPassword = response.body.data.temporaryPassword;
      expect(response.body.data.confirmationOtp).toMatch(/^\d{6}$/);

      // 1. Initial login challenge with forceOtp / header
      const challengeRes = await request(app)
        .post("/api/v1/auth/login")
        .set("x-test-admin-otp", "true")
        .send({
          email: "otp.demo@civicai.local",
          password: tempPassword,
        });

      expect(challengeRes.status).toBe(200);
      expect(challengeRes.body.requiresOtp).toBe(true);
      expect(challengeRes.body.data.demoTerminalOtp).toMatch(/^\d{6}$/);

      // 2. Reject incorrect OTP
      const wrongOtpRes = await request(app)
        .post("/api/v1/auth/login")
        .set("x-test-admin-otp", "true")
        .send({
          email: "otp.demo@civicai.local",
          password: tempPassword,
          otp: "000000",
        });

      expect(wrongOtpRes.status).toBe(400);
      expect(wrongOtpRes.body.error.code).toBe("INVALID_OTP");

      // 3. Resend OTP endpoint
      const resendRes = await request(app)
        .post("/api/v1/auth/department-admin/resend-otp")
        .send({
          email: "otp.demo@civicai.local",
        });
      expect(resendRes.status).toBe(200);
      expect(resendRes.body.success).toBe(true);
      expect(resendRes.body.data.demoTerminalOtp).toMatch(/^\d{6}$/);
      const freshOtp = resendRes.body.data.demoTerminalOtp;

      // 4. Confirm authentication with valid terminal OTP
      const verifyRes = await request(app)
        .post("/api/v1/auth/login")
        .set("x-test-admin-otp", "true")
        .send({
          email: "otp.demo@civicai.local",
          password: tempPassword,
          otp: freshOtp,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.user.role).toBe("DEPARTMENT_ADMIN");
      expect(verifyRes.body.data.accessToken).toBeDefined();
    });

    it("rejects creation if requester is a Citizen", async () => {
      const response = await request(app)
        .post("/api/v1/admin/department-admins")
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({
          departmentId: roadsDept.id,
          fullName: "Attempted Admin",
          email: "attempt.demo@civicai.local",
        });

      expect(response.status).toBe(403);
    });

    it("rejects creation if departmentId is invalid or inactive", async () => {
      const response = await request(app)
        .post("/api/v1/admin/department-admins")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          departmentId: "507f1f77bcf86cd799439011",
          fullName: "Roads Admin",
          email: "roads2.demo@civicai.local",
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("DEPARTMENT_NOT_FOUND");
    });

    it("rejects duplicate email during department admin creation", async () => {
      await request(app)
        .post("/api/v1/admin/department-admins")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          departmentId: roadsDept.id,
          fullName: "Roads Admin",
          email: "roads.duplicate@civicai.local",
        });

      const duplicate = await request(app)
        .post("/api/v1/admin/department-admins")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          departmentId: wasteDept.id,
          fullName: "Waste Admin",
          email: "roads.duplicate@civicai.local",
        });

      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });

    it("lists all department admins for Super Admin", async () => {
      await request(app)
        .post("/api/v1/admin/department-admins")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          departmentId: roadsDept.id,
          fullName: "Roads Admin Listed",
          email: "roads.list@civicai.local",
        });

      const listRes = await request(app)
        .get("/api/v1/admin/department-admins")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.admins.length).toBeGreaterThanOrEqual(1);
      const found = listRes.body.data.admins.find((a: any) => a.email === "roads.list@civicai.local");
      expect(found).toBeDefined();
      expect(found.department.name).toBe("Roads Department");
    });
  });

  describe("Department Isolation and Dashboard", () => {
    let roadsAdminToken: string;
    let wasteAdminToken: string;
    let roadsComplaint: any;
    let wasteComplaint: any;

    beforeEach(async () => {
      // Create Roads Admin
      const roadsRes = await request(app)
        .post("/api/v1/admin/department-admins")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          departmentId: roadsDept.id,
          fullName: "Roads Admin",
          email: "roads.portal@civicai.local",
        });
      roadsAdminToken = await loginUser("roads.portal@civicai.local", roadsRes.body.data.temporaryPassword);

      // Create Waste Admin
      const wasteRes = await request(app)
        .post("/api/v1/admin/department-admins")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          departmentId: wasteDept.id,
          fullName: "Waste Admin",
          email: "waste.portal@civicai.local",
        });
      wasteAdminToken = await loginUser("waste.portal@civicai.local", wasteRes.body.data.temporaryPassword);

      // Seed complaints for each department
      const citizen = await User.findOne({ email: "citizen.test@civicai.local" });
      roadsComplaint = await Complaint.create({
        title: "Pothole on FC Road",
        description: "Large pothole near main traffic light",
        category: "Roads",
        location: { address: "FC Road, Pune" },
        citizenId: citizen!._id,
        departmentId: roadsDept._id,
        priority: "HIGH",
        status: "SUBMITTED",
      });

      wasteComplaint = await Complaint.create({
        title: "Garbage Dump in Kothrud",
        description: "Overflowing garbage bin",
        category: "Waste Management",
        location: { address: "Kothrud, Pune" },
        citizenId: citizen!._id,
        departmentId: wasteDept._id,
        priority: "MEDIUM",
        status: "ASSIGNED",
      });
    });

    it("returns department-scoped dashboard counts", async () => {
      const response = await request(app)
        .get("/api/v1/department-admin/dashboard")
        .set("Authorization", `Bearer ${roadsAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.department.name).toBe("Roads Department");
      expect(response.body.data.counts.total).toBe(1);
      expect(response.body.data.counts.pending).toBe(1);
      expect(response.body.data.counts.inProgress).toBe(0);
    });

    it("allows Roads Admin to view complaints belonging only to Roads department", async () => {
      const response = await request(app)
        .get("/api/v1/department-admin/complaints")
        .set("Authorization", `Bearer ${roadsAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.complaints.length).toBe(1);
      expect(response.body.data.complaints[0]._id).toBe(roadsComplaint.id);

      // Fetch specific complaint by ID
      const singleRes = await request(app)
        .get(`/api/v1/complaints/${roadsComplaint.id}`)
        .set("Authorization", `Bearer ${roadsAdminToken}`);
      expect(singleRes.status).toBe(200);
      expect(singleRes.body.data.complaint.title).toBe("Pothole on FC Road");
    });

    it("blocks Roads Admin from accessing Waste department complaint (data isolation)", async () => {
      const response = await request(app)
        .get(`/api/v1/complaints/${wasteComplaint.id}`)
        .set("Authorization", `Bearer ${roadsAdminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("returns authenticated admin profile at /api/v1/department-admin/me", async () => {
      const response = await request(app)
        .get("/api/v1/department-admin/me")
        .set("Authorization", `Bearer ${roadsAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.admin.fullName).toBe("Roads Admin");
      expect(response.body.data.admin.department.name).toBe("Roads Department");
      expect(response.body.data.admin.role).toBe("DEPARTMENT_ADMIN");
    });
  });
});
