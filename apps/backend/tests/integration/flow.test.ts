import { describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app";
import { User } from "../../src/modules/users/user.model";
import { Department } from "../../src/modules/departments/department.model";

describe("GitHub Issue #10: End-to-End Integration Test (Citizen -> Admin -> Citizen Flow)", () => {
  const citizenPassword = "Citizen@SecurePass123!";
  const adminPassword = "Admin@SecurePass123!";

  it("1. Health-check endpoint: GET /api/v1/health returns 200 and healthy status", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("ok");
    expect(res.body.server).toBe("running");
  });

  it("2. Complete Day-10 Flow: Register -> Login -> Create Complaint -> Admin Login -> Update Status -> Citizen Tracks Status", async () => {
    // -------------------------------------------------------------
    // PREPARATION: Create Roads Department in the database
    // -------------------------------------------------------------
    const roadsDept = await Department.create({
      name: "Roads Department",
      code: "ROADS",
      slug: "roads-department",
      category: "Roads",
      officialEmail: "roads.admin@pmc.gov.in",
      contactNumber: "+91-20-25501000",
      isActive: true,
    });

    // Create a verified Admin account
    const adminUser = await User.create({
      fullName: "PMC Central Administrator",
      email: "admin.integration@pmc.gov.in",
      passwordHash: await bcrypt.hash(adminPassword, 4),
      role: "ADMIN",
      emailVerified: true,
      accountStatus: "ACTIVE",
    });

    // -------------------------------------------------------------
    // STEP 1: Citizen Registration (POST /api/v1/auth/register)
    // -------------------------------------------------------------
    const citizenEmail = "citizen.integration@pune.test";
    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Pooja Patil",
        email: citizenEmail,
        password: citizenPassword,
        confirmPassword: citizenPassword,
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.user.email).toBe(citizenEmail);
    expect(registerResponse.body.data.user.role).toBe("CITIZEN");

    // In testing environment, mark citizen verified so they can log in via POST /login
    await User.updateOne({ email: citizenEmail }, { emailVerified: true });

    // -------------------------------------------------------------
    // STEP 2: Citizen Login (POST /api/v1/auth/login)
    // -------------------------------------------------------------
    const citizenLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: citizenEmail,
        password: citizenPassword,
      });

    expect(citizenLoginRes.status).toBe(200);
    expect(citizenLoginRes.body.success).toBe(true);
    const citizenToken = citizenLoginRes.body.data?.accessToken || citizenLoginRes.body.token;
    expect(citizenToken).toBeDefined();

    // -------------------------------------------------------------
    // STEP 3: Citizen Creates Complaint (POST /api/v1/complaints)
    // -------------------------------------------------------------
    const complaintPayload = {
      title: "Dangerous Deep Pothole on FC Road near Goodluck Chowk",
      description:
        "Large pothole in the left lane causing hazards for motorists and cyclists during evening peak hours.",
      category: "Roads",
      priority: "HIGH",
      location: {
        address: "FC Road, Deccan Gymkhana, Pune 411004",
        ward: "Shivajinagar Ward",
        latitude: 18.5173,
        longitude: 73.8415,
      },
    };

    const createComplaintRes = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send(complaintPayload);

    expect(createComplaintRes.status).toBe(201);
    expect(createComplaintRes.body.success).toBe(true);
    const complaintData = createComplaintRes.body.data.complaint || createComplaintRes.body.data;
    const complaintId = String(complaintData._id || complaintData.id);

    expect(complaintId).toBeDefined();
    expect(complaintData.status).toBe("SUBMITTED");
    expect(complaintData.priority).toBe("HIGH");
    expect(complaintData.slaDeadline).toBeDefined();

    // -------------------------------------------------------------
    // STEP 4: Admin Login (POST /api/v1/auth/login)
    // -------------------------------------------------------------
    const adminLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: adminUser.email,
        password: adminPassword,
      });

    expect(adminLoginRes.status).toBe(200);
    expect(adminLoginRes.body.success).toBe(true);
    const adminToken = adminLoginRes.body.data?.accessToken || adminLoginRes.body.token;
    expect(adminToken).toBeDefined();

    // -------------------------------------------------------------
    // STEP 5: Admin Inspects & Updates Status (PATCH /api/v1/admin/complaints/:id/status)
    // -------------------------------------------------------------
    // 5a. Admin lists complaints
    const adminListRes = await request(app)
      .get("/api/v1/admin/complaints")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(adminListRes.status).toBe(200);
    expect(adminListRes.body.success).toBe(true);
    const foundComplaint = adminListRes.body.data.complaints.find(
      (c: { _id?: string; id?: string }) => String(c._id || c.id) === complaintId,
    );
    expect(foundComplaint).toBeDefined();

    // 5b. Admin assigns department
    const assignRes = await request(app)
      .patch(`/api/v1/admin/complaints/${complaintId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        departmentId: roadsDept._id.toString(),
        internalNotes: "Assigned to Roads Division for immediate patching.",
      });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.success).toBe(true);

    // 5c. Admin transitions status to IN_PROGRESS
    const updateStatusRes = await request(app)
      .patch(`/api/v1/admin/complaints/${complaintId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "IN_PROGRESS",
        remarks: "Road maintenance crew dispatched to FC Road site.",
      });

    expect(updateStatusRes.status).toBe(200);
    expect(updateStatusRes.body.success).toBe(true);
    const updatedData = updateStatusRes.body.data?.complaint || updateStatusRes.body.data;
    expect(updatedData.status).toBe("IN_PROGRESS");

    // -------------------------------------------------------------
    // STEP 6: Citizen Tracks Complaint Status (GET /api/v1/complaints/:id)
    // -------------------------------------------------------------
    const citizenTrackRes = await request(app)
      .get(`/api/v1/complaints/${complaintId}`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(citizenTrackRes.status).toBe(200);
    expect(citizenTrackRes.body.success).toBe(true);
    const trackedComplaint = citizenTrackRes.body.data?.complaint || citizenTrackRes.body.data;

    expect(String(trackedComplaint._id || trackedComplaint.id)).toBe(complaintId);
    expect(trackedComplaint.status).toBe("IN_PROGRESS");
    expect(trackedComplaint.title).toBe(complaintPayload.title);

    // -------------------------------------------------------------
    // STEP 7: Admin Resolves Complaint -> Citizen Sees RESOLVED Status
    // -------------------------------------------------------------
    const resolveRes = await request(app)
      .patch(`/api/v1/admin/complaints/${complaintId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "RESOLVED",
        remarks: "Pothole filled with cold mix asphalt and steam rolled. Surface leveled.",
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.success).toBe(true);
    const resolvedData = resolveRes.body.data?.complaint || resolveRes.body.data;
    expect(resolvedData.status).toBe("RESOLVED");

    // Final citizen check
    const citizenFinalRes = await request(app)
      .get(`/api/v1/complaints/${complaintId}`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(citizenFinalRes.status).toBe(200);
    expect(citizenFinalRes.body.success).toBe(true);
    const finalComplaint = citizenFinalRes.body.data?.complaint || citizenFinalRes.body.data;
    expect(finalComplaint.status).toBe("RESOLVED");
  });
});
