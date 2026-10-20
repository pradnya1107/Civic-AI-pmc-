import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Complaint } from "../src/modules/complaints/complaint.model";
import { Department } from "../src/modules/departments/department.model";
import bcrypt from "bcrypt";

const defaultPassword = "Password#123!";

async function createTestUser(
  email: string,
  role: "CITIZEN" | "ADMIN" | "SUPER_ADMIN" = "CITIZEN",
) {
  return User.create({
    fullName: role === "CITIZEN" ? "Citizen Tester" : "Admin Official",
    email,
    passwordHash: await bcrypt.hash(defaultPassword, 4),
    role,
    emailVerified: true,
    accountStatus: "ACTIVE",
  });
}

async function getAccessToken(email: string) {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: defaultPassword });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}

describe("Smart City Platform Core Features: AI, Heatmap, Duplicates, Verification, and SLA", () => {
  it("1. AI Severity Detection: analyzes issue text/image and suggests category, severity, and department", async () => {
    const citizen = await createTestUser("citizen-ai@example.com");
    const token = await getAccessToken(citizen.email);

    const res = await request(app)
      .post("/api/v1/ai/analyze-complaint")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Deep crater on active FC Road",
        description: "Dangerous pothole creating immediate crash hazard for two-wheelers.",
        address: "FC Road, Shivajinagar, Pune",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category).toBe("Roads & Potholes");
    expect(["CRITICAL", "HIGH"]).toContain(res.body.data.severity);
    expect(res.body.data.suggestedDepartment).toBe("Roads");
    expect(res.body.data.score).toBeGreaterThanOrEqual(70);
  });

  it("2. Complaint Submission with AI fields & SLA: stores coordinates, severity, and SLA deadline", async () => {
    const citizen = await createTestUser("citizen-sub@example.com");
    const token = await getAccessToken(citizen.email);

    const res = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Large open pothole near Goodluck Chowk",
        description: "Vehicles are swerving dangerously into oncoming traffic to avoid the pothole.",
        category: "Roads & Potholes",
        priority: "HIGH",
        location: {
          address: "FC Road, Goodluck Chowk, Pune",
          ward: "Ward 1 - Shivajinagar / Ghole Road",
          latitude: 18.5186,
          longitude: 73.8415,
        },
        imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const c = res.body.data.complaint;
    expect(c.priority).toBe("HIGH");
    expect(c.slaDeadline).toBeDefined();
    expect(c.location.latitude).toBe(18.5186);
    expect(c.location.longitude).toBe(73.8415);
  });

  it("3. Smart Duplicate Detection: identifies nearby similar complaints by coordinates and category", async () => {
    const citizen = await createTestUser("citizen-dup@example.com");
    const token = await getAccessToken(citizen.email);

    // Create an existing complaint on FC Road
    await Complaint.create({
      complaintNumber: "CIV-DUP-01",
      title: "Dangerous pothole on FC Road Goodluck",
      description: "Large cavity on active road lane.",
      category: "Roads & Potholes",
      citizenId: citizen._id,
      priority: "HIGH",
      status: "SUBMITTED",
      location: {
        address: "FC Road, Goodluck, Pune",
        latitude: 18.5186,
        longitude: 73.8415,
      },
    });

    const res = await request(app)
      .post("/api/v1/complaints/check-duplicates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Pothole cavity near Goodluck",
        category: "Roads & Potholes",
        address: "Goodluck Chowk, FC Road, Pune",
        latitude: 18.5187, // ~15 meters away
        longitude: 73.8416,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.duplicates.length).toBeGreaterThanOrEqual(1);
    const topMatch = res.body.data.duplicates[0];
    expect(topMatch.distanceMeters).toBeLessThan(100);
    expect(topMatch.similarityScore).toBeGreaterThanOrEqual(60);
  });

  it("4. Community Support: citizen can upvote an existing complaint", async () => {
    const citizenA = await createTestUser("citizen-a@example.com");
    const citizenB = await createTestUser("citizen-b@example.com");
    const tokenB = await getAccessToken(citizenB.email);

    const complaint = await Complaint.create({
      complaintNumber: "CIV-SUPP-01",
      title: "Broken streetlight near JM Road",
      description: "Non functioning lamp causing dark spots.",
      category: "Street Lighting & Electrical",
      citizenId: citizenA._id,
      priority: "MEDIUM",
      status: "SUBMITTED",
      location: {
        address: "JM Road, Pune",
      },
      supportCount: 0,
      supporters: [],
    });

    const res = await request(app)
      .post(`/api/v1/complaints/${complaint._id}/support`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.complaint.supportCount).toBe(1);

    // Supporting a second time should inform that user already supported
    const repeatRes = await request(app)
      .post(`/api/v1/complaints/${complaint._id}/support`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(repeatRes.status).toBe(200);
    expect(repeatRes.body.data.alreadySupported).toBe(true);
  });

  it("5. AI Civic Heatmap Feed: returns geospatial coordinates and priority markers", async () => {
    const citizen = await createTestUser("citizen-heat@example.com");
    const token = await getAccessToken(citizen.email);

    await Complaint.create({
      complaintNumber: "CIV-HEAT-01",
      title: "Water pipeline leak near Swargate",
      description: "Clean water gushing onto sidewalk.",
      category: "Water Supply",
      citizenId: citizen._id,
      priority: "HIGH",
      status: "SUBMITTED",
      location: {
        address: "Swargate ST Stand, Pune",
        latitude: 18.5018,
        longitude: 73.8587,
      },
    });

    const res = await request(app)
      .get("/api/v1/complaints/heatmap")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.points)).toBe(true);
    const found = res.body.data.points.find((p: any) => p.complaintNumber === "CIV-HEAT-01");
    expect(found).toBeDefined();
    expect(found.location.latitude).toBe(18.5018);
  });

  it("6. SLA Monitoring API: calculates overdue count and compliance rate", async () => {
    const admin = await createTestUser("admin-sla@example.com", "ADMIN");
    const citizen = await createTestUser("citizen-sla@example.com");
    const adminToken = await getAccessToken(admin.email);

    // Create an overdue complaint (deadline in past)
    await Complaint.create({
      complaintNumber: "CIV-OVERDUE-01",
      title: "Open drainage overflow",
      description: "Drainage overflowing into street.",
      category: "Drainage & Sewerage",
      citizenId: citizen._id,
      priority: "CRITICAL",
      status: "IN_PROGRESS",
      slaDeadline: new Date(Date.now() - 3600000 * 24), // 24 hours ago
      location: { address: "Hadapsar, Pune" },
    });

    const res = await request(app)
      .get("/api/v1/complaints/sla-monitoring")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalOpen).toBeGreaterThanOrEqual(1);
    expect(res.body.data.overdueCount).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.complianceRate).toBe("number");
  });

  it("7. Before-and-After Resolution Verification: admin uploads repair image and resolves issue", async () => {
    const admin = await createTestUser("admin-verify@example.com", "ADMIN");
    const citizen = await createTestUser("citizen-verify@example.com");
    const adminToken = await getAccessToken(admin.email);

    const complaint = await Complaint.create({
      complaintNumber: "CIV-VERIFY-01",
      title: "Pothole to be resolved",
      description: "Pothole cavity before repair.",
      category: "Roads & Potholes",
      citizenId: citizen._id,
      priority: "HIGH",
      status: "IN_PROGRESS",
      imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800",
      location: { address: "Kothrud, Pune" },
    });

    const res = await request(app)
      .post(`/api/v1/complaints/${complaint._id}/resolve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        resolutionImageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800",
        resolutionNotes: "Pothole filled with cold asphalt and steamrolled flush.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const updated = res.body.data.complaint;
    expect(updated.status).toBe("RESOLVED");
    expect(updated.resolutionImageUrl).toBeDefined();
    expect(updated.aiAnalysis?.resolutionVerdict).toBe("RESOLVED_VERIFIED");
  });

  it("8. Citizen Confirmation: citizen provides rating & confirmation feedback", async () => {
    const citizen = await createTestUser("citizen-confirm@example.com");
    const token = await getAccessToken(citizen.email);

    const complaint = await Complaint.create({
      complaintNumber: "CIV-CONF-01",
      title: "Resolved pothole",
      description: "Repair finished.",
      category: "Roads & Potholes",
      citizenId: citizen._id,
      priority: "HIGH",
      status: "RESOLVED",
      location: { address: "Shivajinagar, Pune" },
    });

    const res = await request(app)
      .post(`/api/v1/complaints/${complaint._id}/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        rating: 5,
        feedback: "Road is completely fixed. Excellent job PMC!",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.complaint.citizenConfirmation.confirmed).toBe(true);
    expect(res.body.data.complaint.citizenConfirmation.rating).toBe(5);
  });

  it("9. Citizen Dispute: citizen can dispute and reopen an unsatisfactory resolution", async () => {
    const citizen = await createTestUser("citizen-dispute@example.com");
    const token = await getAccessToken(citizen.email);

    const complaint = await Complaint.create({
      complaintNumber: "CIV-DISP-01",
      title: "Incomplete repair",
      description: "Repair claimed but not done properly.",
      category: "Roads & Potholes",
      citizenId: citizen._id,
      priority: "HIGH",
      status: "RESOLVED",
      location: { address: "Baner, Pune" },
    });

    const res = await request(app)
      .post(`/api/v1/complaints/${complaint._id}/dispute`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        reason: "Asphalt washed away during rain; cavity has reappeared.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.complaint.status).toBe("UNDER_REVIEW");
    expect(res.body.data.complaint.citizenConfirmation.disputed).toBe(true);
  });
});
