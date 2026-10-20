import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Complaint } from "../src/modules/complaints/complaint.model";
import { AIAnalysis } from "../src/modules/ai/aiAnalysis.model";
import {
  analyzeComplaint,
  getAnalysisByComplaintId,
} from "../src/modules/ai/ai.service";

const defaultPassword = "SecurePassword#123!";

async function createVerifiedUser(
  email: string,
  role: "CITIZEN" | "ADMIN" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN" = "CITIZEN",
) {
  return User.create({
    fullName: role.includes("ADMIN") ? "PMC Admin User" : "Civic Citizen",
    email,
    passwordHash: await bcrypt.hash(defaultPassword, 4),
    role,
    emailVerified: true,
    accountStatus: "ACTIVE",
  });
}

async function signIn(email: string, password = defaultPassword) {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}

describe("ISSUE-09: AI Service Integration (Category, Priority, Summary Suggestions)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.AI_SERVICE_URL = "http://localhost:8000";
    process.env.AI_SERVICE_SECRET = "test-ai-service-secret-key-123";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("1. AI Analysis Service & Background Trigger", () => {
    it("persists an AIAnalysis document when AI service is healthy and available within 10s", async () => {
      let capturedHeaderSecret = "";
      globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedHeaderSecret = options?.headers?.["X-AI-Service-Secret"];
        return {
          ok: true,
          status: 200,
          json: async () => ({
            category: "Water Supply",
            priority: "HIGH",
            summary: "Issue regarding Water Supply (Priority: HIGH): Broken pipeline in FC Road.",
            confidence: 0.94,
            modelVersion: "stub-v1.0.0",
          }),
        };
      });

      const citizen = await createVerifiedUser("citizen-ai-success@example.com");
      const token = await signIn(citizen.email);

      const startTime = Date.now();
      const response = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Major water pipeline leak",
          description: "Water pipeline has burst near FC Road and water is flooding the street.",
          category: "General Administration",
          location: { address: "FC Road, Shivajinagar, Pune" },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      const complaintId = response.body.data.complaint._id;

      // Wait briefly for asynchronous background analysis to persist
      let analysis = null;
      for (let i = 0; i < 20; i++) {
        analysis = await AIAnalysis.findOne({ complaintRef: complaintId });
        if (analysis) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(10000); // 10-second acceptance criterion
      expect(analysis).not.toBeNull();
      expect(analysis?.suggestedCategory).toBe("Water Supply");
      expect(analysis?.suggestedPriority).toBe("HIGH");
      expect(analysis?.summary).toContain("Water Supply");
      expect(analysis?.confidence).toBe(0.94);
      expect(analysis?.modelVersion).toBe("stub-v1.0.0");
      expect(capturedHeaderSecret).toBe("test-ai-service-secret-key-123");
    });

    it("succeeds creating complaint when AI service is down without creating fake analysis record", async () => {
      // Mock fetch rejection simulating connection refused or service downtime
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:8000"));

      const citizen = await createVerifiedUser("citizen-ai-down@example.com");
      const token = await signIn(citizen.email);

      const response = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Pothole problem",
          description: "Dangerous pothole on the main road.",
          category: "Roads",
          location: { address: "JM Road, Pune" },
        });

      // Complaint creation is never blocked or failed because of AI service downtime
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const complaintId = response.body.data.complaint._id;
      // Allow background microtask queue to settle
      await new Promise((r) => setTimeout(r, 100));

      const analysis = await AIAnalysis.findOne({ complaintRef: complaintId });
      expect(analysis).toBeNull();
    });

    it("rejects invalid AI responses safely without creating a record", async () => {
      // Return response with invalid priority and confidence > 1.0
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          category: "Unknown",
          priority: "INVALID_PRIORITY",
          summary: "bad summary",
          confidence: 2.5,
          modelVersion: "test-v1",
        }),
      });

      const citizen = await createVerifiedUser("citizen-ai-invalid@example.com");
      const complaint = await Complaint.create({
        complaintNumber: "CIV-TEST-INVALID-AI",
        title: "Test Complaint",
        description: "Test description for AI validation",
        category: "General",
        location: { address: "Kothrud, Pune" },
        citizenId: citizen._id,
        priority: "MEDIUM",
        status: "SUBMITTED",
      });

      const result = await analyzeComplaint(complaint._id, complaint.description);
      expect(result).toBeNull();

      const saved = await AIAnalysis.findOne({ complaintRef: complaint._id });
      expect(saved).toBeNull();
    });

    it("prevents duplicate AIAnalysis records for the same complaint", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          category: "Electricity",
          priority: "MEDIUM",
          summary: "Street light flickering repeatedly.",
          confidence: 0.88,
          modelVersion: "stub-v1.0.0",
        }),
      });

      const citizen = await createVerifiedUser("citizen-ai-dup@example.com");
      const complaint = await Complaint.create({
        complaintNumber: "CIV-TEST-DUP-AI",
        title: "Flickering Light",
        description: "Street light flickering repeatedly every evening.",
        category: "General",
        location: { address: "Baner, Pune" },
        citizenId: citizen._id,
        priority: "MEDIUM",
        status: "SUBMITTED",
      });

      await analyzeComplaint(complaint._id, complaint.description);
      await analyzeComplaint(complaint._id, complaint.description);

      const count = await AIAnalysis.countDocuments({ complaintRef: complaint._id });
      expect(count).toBe(1);
    });
  });

  describe("2. AI Retrieval API (GET /api/v1/complaints/:id/ai)", () => {
    it("returns 200 and the linked AIAnalysis document when accessed by an authorized admin", async () => {
      const admin = await createVerifiedUser("admin-get-ai@example.com", "ADMIN");
      const citizen = await createVerifiedUser("citizen-comp@example.com", "CITIZEN");
      const adminToken = await signIn(admin.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-AI-RETRIEVE",
        title: "Garbage overflow in Market Yard",
        description: "Severe garbage buildup attracting flies and stray animals.",
        category: "Waste Management",
        location: { address: "Market Yard, Gultekdi, Pune" },
        citizenId: citizen._id,
        priority: "MEDIUM",
        status: "SUBMITTED",
      });

      await AIAnalysis.create({
        complaintRef: complaint._id,
        suggestedCategory: "Waste Management",
        suggestedPriority: "HIGH",
        summary: "Severe waste management issue at Market Yard requiring sanitation response.",
        confidence: 0.92,
        modelVersion: "stub-v1.0.0",
      });

      const response = await request(app)
        .get(`/api/v1/complaints/${complaint._id}/ai`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis).toBeDefined();
      expect(response.body.data.analysis.suggestedCategory).toBe("Waste Management");
      expect(response.body.data.analysis.suggestedPriority).toBe("HIGH");
      expect(response.body.data.analysis.confidence).toBe(0.92);
    });

    it("forbids non-admin (citizen) from accessing AI analysis endpoint with 403 Forbidden", async () => {
      const citizen = await createVerifiedUser("citizen-unauth@example.com", "CITIZEN");
      const citizenToken = await signIn(citizen.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-AI-FORBIDDEN",
        title: "Citizen water leak",
        description: "Water pipe leaking outside my home.",
        category: "Water Supply",
        location: { address: "Aundh, Pune" },
        citizenId: citizen._id,
        priority: "LOW",
        status: "SUBMITTED",
      });

      const response = await request(app)
        .get(`/api/v1/complaints/${complaint._id}/ai`)
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("returns 401 Unauthorized when no authentication token is provided", async () => {
      const response = await request(app).get("/api/v1/complaints/65f1a2b3c4d5e6f7a8b9c0d1/ai");
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 404 with ANALYSIS_NOT_FOUND when complaint exists but has no analysis document", async () => {
      const admin = await createVerifiedUser("admin-no-ai@example.com", "SUPER_ADMIN");
      const citizen = await createVerifiedUser("citizen-no-ai@example.com", "CITIZEN");
      const adminToken = await signIn(admin.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-NO-AI-DOC",
        title: "Complaint with no analysis",
        description: "Complaint where AI analysis was never run.",
        category: "Roads",
        location: { address: "Koregaon Park, Pune" },
        citizenId: citizen._id,
        priority: "MEDIUM",
        status: "SUBMITTED",
      });

      const response = await request(app)
        .get(`/api/v1/complaints/${complaint._id}/ai`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("ANALYSIS_NOT_FOUND");
      expect(response.body.message).toContain("AI analysis not found");
    });

    it("returns 400 for invalid complaint ObjectId format", async () => {
      const admin = await createVerifiedUser("admin-bad-id@example.com", "ADMIN");
      const adminToken = await signIn(admin.email);

      const response = await request(app)
        .get("/api/v1/complaints/not-a-valid-object-id/ai")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for non-existent complaint ObjectId", async () => {
      const admin = await createVerifiedUser("admin-nonexist@example.com", "ADMIN");
      const adminToken = await signIn(admin.email);

      const nonExistentId = "507f1f77bcf86cd799439011";
      const response = await request(app)
        .get(`/api/v1/complaints/${nonExistentId}/ai`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("COMPLAINT_NOT_FOUND");
    });
  });

  describe("3. Admin Acceptance & Override Behaviors", () => {
    it("updates complaint category when admin accepts AI suggested category", async () => {
      const admin = await createVerifiedUser("admin-accept-cat@example.com", "ADMIN");
      const citizen = await createVerifiedUser("citizen-accept-cat@example.com", "CITIZEN");
      const adminToken = await signIn(admin.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-ACCEPT-CAT",
        title: "Water pipeline contamination",
        description: "Tap water is brown and smelling bad.",
        category: "General Administration", // Initial unspecific category
        location: { address: "Kothrud, Pune" },
        citizenId: citizen._id,
        priority: "MEDIUM",
        status: "SUBMITTED",
      });

      const patchResponse = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ category: "Water Supply" });

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.success).toBe(true);
      expect(patchResponse.body.data.complaint.category).toBe("Water Supply");

      const refreshed = await Complaint.findById(complaint._id);
      expect(refreshed?.category).toBe("Water Supply");
    });

    it("updates complaint priority when admin accepts AI suggested priority", async () => {
      const admin = await createVerifiedUser("admin-accept-prio@example.com", "ADMIN");
      const citizen = await createVerifiedUser("citizen-accept-prio@example.com", "CITIZEN");
      const adminToken = await signIn(admin.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-ACCEPT-PRIO",
        title: "Live electrical cable hanging low",
        description: "Live wire hanging over pedestrian pavement, risk of electrocution.",
        category: "Electricity",
        location: { address: "Shivajinagar, Pune" },
        citizenId: citizen._id,
        priority: "LOW", // Citizen filed as LOW, AI suggests CRITICAL
        status: "SUBMITTED",
      });

      const patchResponse = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ priority: "CRITICAL" });

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.success).toBe(true);
      expect(patchResponse.body.data.complaint.priority).toBe("CRITICAL");

      const refreshed = await Complaint.findById(complaint._id);
      expect(refreshed?.priority).toBe("CRITICAL");
    });

    it("allows admin to manually override both category and priority with valid values", async () => {
      const admin = await createVerifiedUser("admin-override@example.com", "SUPER_ADMIN");
      const citizen = await createVerifiedUser("citizen-override@example.com", "CITIZEN");
      const adminToken = await signIn(admin.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-OVERRIDE",
        title: "Broken park fence and fallen branch",
        description: "Branch fell onto the boundary fence of the municipal park.",
        category: "Roads & Infrastructure",
        location: { address: "Saras Baug, Pune" },
        citizenId: citizen._id,
        priority: "LOW",
        status: "SUBMITTED",
      });

      const patchResponse = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          category: "Parks & Gardens",
          priority: "MEDIUM",
        });

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.data.complaint.category).toBe("Parks & Gardens");
      expect(patchResponse.body.data.complaint.priority).toBe("MEDIUM");
    });

    it("rejects override with invalid priority value", async () => {
      const admin = await createVerifiedUser("admin-bad-prio@example.com", "ADMIN");
      const citizen = await createVerifiedUser("citizen-bad-prio@example.com", "CITIZEN");
      const adminToken = await signIn(admin.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-BAD-PRIO",
        title: "Test Complaint",
        description: "Test description for validation",
        category: "General",
        location: { address: "Hadapsar, Pune" },
        citizenId: citizen._id,
        priority: "MEDIUM",
        status: "SUBMITTED",
      });

      const patchResponse = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ priority: "SUPER_URGENT" }); // Not a valid priority

      expect(patchResponse.status).toBe(400);
      expect(patchResponse.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
