import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Department } from "../src/modules/departments/department.model";
import { AuditLog } from "../src/modules/audit/auditLog.model";

const superAdminPassword = "SuperAdmin@123456";
const deptAdminPassword = "DeptAdmin@123456";
const citizenPassword = "Citizen@123456";

describe("Active Status Management & Token Invalidation", () => {
  let superAdminToken: string;
  let superAdminUser: any;
  let testDept: any;

  beforeEach(async () => {
    testDept = await Department.create({
      name: "Water Supply Department",
      slug: "water-supply-dept",
      description: "Water testing and supply",
      isActive: true,
    });

    superAdminUser = await User.create({
      fullName: "Super Administrator",
      email: "superadmin.status@pmc.gov.in",
      passwordHash: await bcrypt.hash(superAdminPassword, 4),
      role: "SUPER_ADMIN",
      emailVerified: true,
      accountStatus: "ACTIVE",
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: superAdminUser.email, password: superAdminPassword });

    expect(loginRes.status).toBe(200);
    superAdminToken = loginRes.body.data.accessToken;
  });

  it("invalidates department admin active token immediately when status is changed to DISABLED", async () => {
    // 1. Create a department admin
    const deptAdmin = await User.create({
      fullName: "Officer Santosh",
      email: "santosh.water@pmc.gov.in",
      passwordHash: await bcrypt.hash(deptAdminPassword, 4),
      role: "DEPARTMENT_ADMIN",
      departmentId: testDept._id,
      emailVerified: true,
      accountStatus: "ACTIVE",
      tokenVersion: 0,
    });

    // 2. Department admin logs in and obtains token
    const adminLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: deptAdmin.email, password: deptAdminPassword });
    expect(adminLoginRes.status).toBe(200);
    const deptAdminToken = adminLoginRes.body.data.accessToken;

    // 3. Verify token works
    const profileResBefore = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${deptAdminToken}`);
    expect(profileResBefore.status).toBe(200);
    expect(profileResBefore.body.data.user.email).toBe(deptAdmin.email);

    // 4. Super Admin disables the department admin account
    const disableRes = await request(app)
      .patch(`/api/v1/admin/department-admins/${deptAdmin._id}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ accountStatus: "DISABLED" });

    expect(disableRes.status).toBe(200);
    expect(disableRes.body.data.accountStatus).toBe("DISABLED");

    // Check DB state: tokenVersion incremented
    const updatedInDb = await User.findById(deptAdmin._id).select("+tokenVersion");
    expect(updatedInDb?.accountStatus).toBe("DISABLED");
    expect(updatedInDb?.tokenVersion).toBe(1);

    // Check AuditLog created
    const auditRecord = await AuditLog.findOne({
      targetRef: deptAdmin._id,
      action: "ADMIN_ACCOUNT_STATUS_UPDATED",
    });
    expect(auditRecord).toBeTruthy();
    expect(auditRecord?.metadata?.tokensRevoked).toBe(true);

    // 5. Existing JWT token must now immediately fail (Token Invalidation)
    const profileResAfter = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${deptAdminToken}`);
    expect(profileResAfter.status).toBe(401);

    // 6. Department admin cannot log in while DISABLED
    const loginAttempt = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: deptAdmin.email, password: deptAdminPassword });
    expect(loginAttempt.status).toBe(401);

    // 7. Super Admin re-activates the account
    const reactivateRes = await request(app)
      .patch(`/api/v1/admin/department-admins/${deptAdmin._id}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ accountStatus: "ACTIVE" });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.accountStatus).toBe("ACTIVE");

    // 8. Department admin can now log in again
    const newLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: deptAdmin.email, password: deptAdminPassword });
    expect(newLoginRes.status).toBe(200);
  });

  it("allows Super Admin to toggle citizen account status and invalidates citizen session", async () => {
    // 1. Create active citizen
    const citizen = await User.create({
      fullName: "Rohan Deshmukh",
      email: "rohan.deshmukh@example.com",
      phoneNumber: "9876543210",
      passwordHash: await bcrypt.hash(citizenPassword, 4),
      role: "CITIZEN",
      emailVerified: true,
      accountStatus: "ACTIVE",
      tokenVersion: 0,
    });

    // 2. Citizen logs in and gets token
    const citizenLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: citizen.email, password: citizenPassword });
    expect(citizenLoginRes.status).toBe(200);
    const citizenToken = citizenLoginRes.body.data.accessToken;

    // 3. Citizen token works
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${citizenToken}`);
    expect(meRes.status).toBe(200);

    // 4. Super Admin deactivates citizen
    const statusChangeRes = await request(app)
      .patch(`/api/v1/admin/citizens/${citizen._id}/status`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ accountStatus: "DISABLED" });

    expect(statusChangeRes.status).toBe(200);
    expect(statusChangeRes.body.data.accountStatus).toBe("DISABLED");

    // Check DB and AuditLog
    const dbCitizen = await User.findById(citizen._id).select("+tokenVersion");
    expect(dbCitizen?.accountStatus).toBe("DISABLED");
    expect(dbCitizen?.tokenVersion).toBe(1);

    const auditRecord = await AuditLog.findOne({
      targetRef: citizen._id,
      action: "CITIZEN_ACCOUNT_STATUS_UPDATED",
    });
    expect(auditRecord).toBeTruthy();
    expect(auditRecord?.metadata?.tokensRevoked).toBe(true);

    // 5. Active token fails immediately
    const meResDisabled = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${citizenToken}`);
    expect(meResDisabled.status).toBe(401);

    // 6. Citizen login fails
    const reLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: citizen.email, password: citizenPassword });
    expect(reLoginRes.status).toBe(401);

    // 7. Super Admin reactivates citizen
    const reactivateRes = await request(app)
      .patch(`/api/v1/admin/citizens/${citizen._id}/status`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ accountStatus: "ACTIVE" });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.accountStatus).toBe("ACTIVE");

    // 8. Citizen can now log in again
    const loginOkRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: citizen.email, password: citizenPassword });
    expect(loginOkRes.status).toBe(200);
  });
});
