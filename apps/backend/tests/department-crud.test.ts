import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Department } from "../src/modules/departments/department.model";

const superAdminPassword = "SuperAdmin@123456";
const citizenPassword = "Citizen@123456";

async function createSuperAdmin() {
  return User.create({
    fullName: "Chief Super Admin",
    email: "superadmin.deptcrud@civicai.local",
    passwordHash: await bcrypt.hash(superAdminPassword, 4),
    role: "SUPER_ADMIN",
    emailVerified: true,
    accountStatus: "ACTIVE",
  });
}

async function createCitizen(email = "citizen.deptcrud@civicai.local") {
  return User.create({
    fullName: "Staff Citizen",
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

describe("Department Management with Compulsory Fields & Admin Assignment", () => {
  let superAdminToken: string;
  let candidateUser: any;

  beforeEach(async () => {
    await User.deleteMany({ email: /@civicai\.local$/ });
    await Department.deleteMany({ slug: /test-dept/ });

    const admin = await createSuperAdmin();
    superAdminToken = await loginUser(admin.email, superAdminPassword);

    candidateUser = await createCitizen("candidate.dept@civicai.local");
  });

  it("1. Creates a department with all 5 compulsory fields and assigns an existing user as admin", async () => {
    const res = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Water Supply & Distribution",
        code: "WATER",
        category: "Water Supply",
        officialEmail: "water.official@pmc.gov.in",
        contactNumber: "+91 20 2550 4001",
        adminId: candidateUser._id.toString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.department.name).toBe("Water Supply & Distribution");
    expect(res.body.data.department.code).toBe("WATER");
    expect(res.body.data.department.category).toBe("Water Supply");
    expect(res.body.data.department.officialEmail).toBe("water.official@pmc.gov.in");
    expect(res.body.data.department.contactNumber).toBe("+91 20 2550 4001");

    // Verify assigned user is promoted to DEPARTMENT_ADMIN and bound to department
    const updatedUser = await User.findById(candidateUser._id);
    expect(updatedUser?.role).toBe("DEPARTMENT_ADMIN");
    expect(updatedUser?.departmentId?.toString()).toBe(res.body.data.department.id);
  });

  it("2. Creates a department and provisions a brand new Department Admin with temporary credentials in demo mode", async () => {
    const res = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Solid Waste & Sanitation",
        code: "SAN",
        category: "Solid Waste & Garbage",
        officialEmail: "sanitation@pmc.gov.in",
        contactNumber: "+91 20 2550 4002",
        newAdmin: {
          fullName: "Sunita Deshmukh",
          email: "sunita.sanitation@civicai.local",
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.department.code).toBe("SAN");
    expect(res.body.data.department.admin).toBeDefined();
    expect(res.body.data.department.admin.fullName).toBe("Sunita Deshmukh");

    // In demo mode, createdAdminNotice is returned with temporaryPassword
    expect(res.body.data.department.createdAdminNotice).toBeDefined();
    expect(res.body.data.department.createdAdminNotice.temporaryPassword).toBeDefined();

    // Verify user created in DB
    const createdAdmin = await User.findOne({ email: "sunita.sanitation@civicai.local" });
    expect(createdAdmin).toBeDefined();
    expect(createdAdmin?.role).toBe("DEPARTMENT_ADMIN");
    expect(createdAdmin?.departmentId?.toString()).toBe(res.body.data.department.id);
  });

  it("3. Enforces unique Department Codes on backend validation (rejects duplicate code with 409)", async () => {
    // First creation
    await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Electrical & Streetlights",
        code: "ELEC",
        category: "Street Lighting & Electrical",
        officialEmail: "elec@pmc.gov.in",
        contactNumber: "+91 20 2550 4003",
        adminId: candidateUser._id.toString(),
      });

    // Attempt second creation with same code
    const res = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Alternative Electrical Wing",
        code: "ELEC", // duplicate!
        category: "Street Lighting & Electrical",
        officialEmail: "alt.elec@pmc.gov.in",
        contactNumber: "+91 20 2550 4004",
        adminId: candidateUser._id.toString(),
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DEPARTMENT_CODE_EXISTS");
  });

  it("4. Validates required fields (rejects invalid email or missing name)", async () => {
    const res = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "",
        code: "BAD",
        category: "Roads & Potholes",
        officialEmail: "invalid-email-format",
        contactNumber: "123",
      });

    expect(res.status).toBe(400);
  });

  it("5. Updates department details including code, category, contacts, and admin assignment", async () => {
    // Create department
    const createRes = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Bridges & Flyovers",
        code: "BRIDGES",
        category: "Roads & Potholes",
        officialEmail: "bridges@pmc.gov.in",
        contactNumber: "+91 20 2550 4005",
        adminId: candidateUser._id.toString(),
      });

    const deptId = createRes.body.data.department.id;

    // Update department code and contact
    const updateRes = await request(app)
      .patch(`/api/v1/departments/${deptId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        code: "FLYOVER",
        officialEmail: "flyovers@pmc.gov.in",
        contactNumber: "+91 20 2550 9999",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.department.code).toBe("FLYOVER");
    expect(updateRes.body.data.department.officialEmail).toBe("flyovers@pmc.gov.in");
    expect(updateRes.body.data.department.contactNumber).toBe("+91 20 2550 9999");
  });

  it("6. Lists eligible administrator candidates at /api/v1/departments/admin-candidates", async () => {
    const res = await request(app)
      .get("/api/v1/departments/admin-candidates")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.candidates)).toBe(true);
    const found = res.body.data.candidates.find((c: any) => c.email === candidateUser.email);
    expect(found).toBeDefined();
    expect(found.fullName).toBe("Staff Citizen");
  });

  it("7. Renews user session and issues a fresh token at /api/v1/auth/refresh", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(typeof res.body.data.accessToken).toBe("string");
    expect(res.body.data.user.email).toBe("superadmin.deptcrud@civicai.local");
  });

  it("8. Rejects department creation when new admin password violates complexity or mismatches confirmPassword", async () => {
    // Length < 8
    const shortRes = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Test Dept Short Pwd",
        code: "SHORTP",
        category: "Test",
        officialEmail: "short@pmc.gov.in",
        contactNumber: "+91 20 2550 1111",
        newAdmin: {
          fullName: "Admin Short",
          email: "admin.short@civicai.local",
          password: "Short@1",
          confirmPassword: "Short@1",
        },
      });
    expect(shortRes.status).toBe(400);

    // Missing uppercase
    const noUpperRes = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Test Dept No Upper",
        code: "NOUPPER",
        category: "Test",
        officialEmail: "noupper@pmc.gov.in",
        contactNumber: "+91 20 2550 1112",
        newAdmin: {
          fullName: "Admin NoUpper",
          email: "admin.noupper@civicai.local",
          password: "password@123",
          confirmPassword: "password@123",
        },
      });
    expect(noUpperRes.status).toBe(400);

    // Missing symbol
    const noSymbolRes = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Test Dept No Symbol",
        code: "NOSYMBOL",
        category: "Test",
        officialEmail: "nosymbol@pmc.gov.in",
        contactNumber: "+91 20 2550 1113",
        newAdmin: {
          fullName: "Admin NoSymbol",
          email: "admin.nosymbol@civicai.local",
          password: "Password123",
          confirmPassword: "Password123",
        },
      });
    expect(noSymbolRes.status).toBe(400);

    // Mismatched confirmPassword
    const mismatchRes = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Test Dept Mismatch",
        code: "MISMATCH",
        category: "Test",
        officialEmail: "mismatch@pmc.gov.in",
        contactNumber: "+91 20 2550 1114",
        newAdmin: {
          fullName: "Admin Mismatch",
          email: "admin.mismatch@civicai.local",
          password: "Password@123",
          confirmPassword: "Password@999",
        },
      });
    expect(mismatchRes.status).toBe(400);
  });

  it("9. Creates department with admin using password & confirmPassword, allowing direct sign-in", async () => {
    const customPassword = "SecureDept@2026";
    const res = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Electrical & Street Lighting",
        code: "ELEC",
        category: "Street Lighting",
        officialEmail: "electrical@pmc.gov.in",
        contactNumber: "+91 20 2550 4003",
        newAdmin: {
          fullName: "Sanjay Jadhav",
          email: "sanjay.jadhav@civicai.local",
          password: customPassword,
          confirmPassword: customPassword,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Department admin can sign in with the configured password
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "sanjay.jadhav@civicai.local",
        password: customPassword,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.role).toBe("DEPARTMENT_ADMIN");
  });

  it("10. Changes department admin password requiring previous password, 2x new password, and rules", async () => {
    const initialPassword = "InitialDept@2026";
    await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Gardens & Tree Authority",
        code: "GARDEN",
        category: "Tree Trimming",
        officialEmail: "gardens@pmc.gov.in",
        contactNumber: "+91 20 2550 4004",
        newAdmin: {
          fullName: "Pooja Patil",
          email: "pooja.patil@civicai.local",
          password: initialPassword,
          confirmPassword: initialPassword,
        },
      });

    const deptAdminToken = await loginUser("pooja.patil@civicai.local", initialPassword);

    // Wrong previous password
    const wrongPrevRes = await request(app)
      .post("/api/v1/department-admin/change-password")
      .set("Authorization", `Bearer ${deptAdminToken}`)
      .send({
        previousPassword: "WrongPassword@123",
        newPassword: "NewSecret@2026",
        confirmPassword: "NewSecret@2026",
      });
    expect(wrongPrevRes.status).toBe(400);

    // New password missing symbol
    const noSymbolRes = await request(app)
      .post("/api/v1/department-admin/change-password")
      .set("Authorization", `Bearer ${deptAdminToken}`)
      .send({
        previousPassword: initialPassword,
        newPassword: "NewSecret2026",
        confirmPassword: "NewSecret2026",
      });
    expect(noSymbolRes.status).toBe(400);

    // Confirm password mismatch
    const mismatchRes = await request(app)
      .post("/api/v1/department-admin/change-password")
      .set("Authorization", `Bearer ${deptAdminToken}`)
      .send({
        previousPassword: initialPassword,
        newPassword: "NewSecret@2026",
        confirmPassword: "DifferentSecret@2026",
      });
    expect(mismatchRes.status).toBe(400);

    // Successful password change
    const newPassword = "UpdatedSecure#2026";
    const successRes = await request(app)
      .post("/api/v1/department-admin/change-password")
      .set("Authorization", `Bearer ${deptAdminToken}`)
      .send({
        previousPassword: initialPassword,
        newPassword: newPassword,
        confirmPassword: newPassword,
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);

    // Login with initial password now fails
    const failedOldLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "pooja.patil@civicai.local",
        password: initialPassword,
      });
    expect(failedOldLogin.status).toBe(401);

    // Login with new password succeeds
    const successfulNewLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "pooja.patil@civicai.local",
        password: newPassword,
      });
    expect(successfulNewLogin.status).toBe(200);
    expect(successfulNewLogin.body.role).toBe("DEPARTMENT_ADMIN");
  });
});


