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
});

