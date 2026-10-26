import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Complaint } from "../src/modules/complaints/complaint.model";
import { Department } from "../src/modules/departments/department.model";
import { AuditLog } from "../src/modules/audit/auditLog.model";
import * as geminiAiService from "../src/modules/ai/gemini-ai.service";

const defaultPassword = "SecurePassword#123!";

async function createVerifiedUser(
  email: string,
  role: "CITIZEN" | "ADMIN" = "CITIZEN",
) {
  return User.create({
    fullName: role === "ADMIN" ? "PMC Senior Officer" : "Civic Citizen",
    email,
    passwordHash: await bcrypt.hash(defaultPassword, 4),
    role,
    emailVerified: true,
    accountStatus: "ACTIVE",
  });
}

async function signIn(email: string) {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: defaultPassword });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}

describe("Phase 1: AI Confidence, Human Verification & Resolution Safety", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Task B: AI Confidence & Human Review Routing", () => {
    it("flags low-confidence AI predictions for manual officer review without forcing decisions", async () => {
      const citizen = await createVerifiedUser("citizen-lowconf@example.com");
      const token = await signIn(citizen.email);

      // Low confidence (38%)
      const response = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Unclear street object causing issue",
          description: "Something is blocking the curb near Senapati Bapat Road.",
          category: "Other",
          location: { address: "Senapati Bapat Road, Pune" },
          aiAnalysis: {
            confidenceScore: 38,
            suggestedDepartment: "Unrelated Department",
            detectedCivicIssue: "Unknown Object",
          },
        });

      expect(response.status).toBe(201);
      const createdId = response.body.data.complaint?.id || response.body.data.complaint?._id;
      const created = await Complaint.findById(createdId);
      expect(created).toBeDefined();
      expect(created?.status).toBe("SUBMITTED");
      expect(created?.aiAnalysis?.manualReviewNeeded).toBe(true);
      expect(created?.aiAnalysis?.manualReviewReason).toContain("below operational threshold");
      expect(created?.aiAnalysis?.manualReviewReason).toContain("38%");
    });

    it("rejects complaints with possible AI-synthesized imagery with 422 AI_GENERATED_IMAGE_REJECTED", async () => {
      const citizen = await createVerifiedUser("citizen-synth@example.com");
      const token = await signIn(citizen.email);

      const response = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Deep crater on bridge",
          description: "Photographed crater on bridge.",
          category: "Roads",
          location: { address: "Yerawada Bridge, Pune" },
          aiAnalysis: {
            confidenceScore: 85,
            authenticityAssessment: {
              possibleAiGenerated: true,
              confidence: "HIGH",
              indicators: ["Diffusion artifacts", "Unnatural specular highlights"],
              disclaimer: "Possible AI generation detected",
            },
          },
        });

      expect(response.status).toBe(422);
      expect(response.body.error?.code).toBe("AI_GENERATED_IMAGE_REJECTED");
    });

    it("preserves citizen complaint submissions even when AI analysis fails or is unavailable", async () => {
      const citizen = await createVerifiedUser("citizen-noai@example.com");
      const token = await signIn(citizen.email);

      const response = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Broken streetlight outside municipal school",
          description: "Light pole #42 has been non-functional for 3 days.",
          category: "Electricity",
          location: { address: "Shivajinagar, Pune" },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.complaint.title).toBe("Broken streetlight outside municipal school");
      expect(response.body.data.complaint.status).toBe("SUBMITTED");
    });
  });

  describe("Task C: Resolution Verification Safety", () => {
    it("blocks resolving a complaint when AI verification indicates POTENTIALLY_UNRESOLVED without human confirmation", async () => {
      const admin = await createVerifiedUser("admin-safety@example.com", "ADMIN");
      const citizen = await createVerifiedUser("citizen-unresolved@example.com");
      const adminToken = await signIn(admin.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-SAFE-01",
        title: "Major pothole repair",
        description: "Pothole before repair.",
        category: "Roads",
        citizenId: citizen._id,
        priority: "HIGH",
        status: "IN_PROGRESS",
        location: { address: "Karve Road, Pune" },
        imageUrl: "https://example.com/pothole-before.jpg",
      });

      // Mock verifyResolution to return POTENTIALLY_UNRESOLVED
      vi.spyOn(geminiAiService, "verifyResolution").mockResolvedValueOnce({
        verdict: "POTENTIALLY_UNRESOLVED",
        confidence: 88,
        analysis: "Visual comparison indicates the pothole cavity remains open; no fresh asphalt detected.",
        authenticityAssessment: {
          isAiGenerated: false,
          possibleAiGenerated: false,
          isRelevantRepair: true,
          assessment: "AUTHENTIC_REAL_PHOTO",
          confidence: "HIGH",
          indicators: [],
          explanation: "Authentic on-site photo.",
        },
        aiProvider: "TEST_MOCK_GEMINI",
        apiKeyConfigured: true,
      });

      const response = await request(app)
        .post(`/api/v1/complaints/${complaint._id}/resolve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          resolutionImageUrl: "https://example.com/pothole-bad-repair.jpg",
          resolutionNotes: "Contractor claimed work was done.",
        });

      // Must be rejected with 400
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message || response.body.message).toContain("pothole cavity remains open");

      // Verify DB safety: Complaint MUST NOT be marked RESOLVED
      const unchangedComplaint = await Complaint.findById(complaint._id);
      expect(unchangedComplaint?.status).toBe("IN_PROGRESS");
      // Resolution evidence should be preserved for review
      expect(unchangedComplaint?.resolutionImageUrl).toBe("https://example.com/pothole-bad-repair.jpg");
      expect(unchangedComplaint?.aiAnalysis?.resolutionVerdict).toBe("POTENTIALLY_UNRESOLVED");

      // Verify Audit Log records rejection
      const auditEntry = await AuditLog.findOne({
        targetRef: complaint._id,
        action: "RESOLUTION_VERIFICATION_REJECTED",
      });
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.metadata?.resolutionVerdict).toBe("POTENTIALLY_UNRESOLVED");
    });

    it("allows resolving when an authorized officer explicitly confirms human review for POTENTIALLY_UNRESOLVED", async () => {
      const admin = await createVerifiedUser("admin-override@example.com", "ADMIN");
      const citizen = await createVerifiedUser("citizen-override@example.com");
      const adminToken = await signIn(admin.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-SAFE-02",
        title: "Pothole repair with gravel base",
        description: "Pothole before repair.",
        category: "Roads",
        citizenId: citizen._id,
        priority: "HIGH",
        status: "IN_PROGRESS",
        location: { address: "Sinhagad Road, Pune" },
        imageUrl: "https://example.com/pothole-before-2.jpg",
      });

      vi.spyOn(geminiAiService, "verifyResolution").mockResolvedValueOnce({
        verdict: "POTENTIALLY_UNRESOLVED",
        confidence: 72,
        analysis: "Gravel layer visible; AI unsure if curing is complete.",
        authenticityAssessment: {
          isAiGenerated: false,
          possibleAiGenerated: false,
          isRelevantRepair: true,
          assessment: "AUTHENTIC_REAL_PHOTO",
          confidence: "HIGH",
          indicators: [],
          explanation: "Authentic on-site photo.",
        },
        aiProvider: "TEST_MOCK_GEMINI",
        apiKeyConfigured: true,
      });

      // Officer supplies humanReviewed: true
      const response = await request(app)
        .post(`/api/v1/complaints/${complaint._id}/resolve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          resolutionImageUrl: "https://example.com/pothole-gravel.jpg",
          resolutionNotes: "Junior engineer inspected on site: gravel layer is compaction substrate; asphalt topped and cured.",
          humanReviewed: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const updatedComplaint = await Complaint.findById(complaint._id);
      expect(updatedComplaint?.status).toBe("RESOLVED");
      expect(updatedComplaint?.resolutionNotes).toContain("Junior engineer inspected on site");

      // Verify Audit Log includes humanReviewConfirmed
      const auditEntry = await AuditLog.findOne({
        targetRef: complaint._id,
        action: "STATUS_UPDATE",
        "metadata.humanReviewConfirmed": true,
      });
      expect(auditEntry).toBeDefined();
    });

    it("safely handles unexpected AI verification errors without crashing or making false resolution claims", async () => {
      const admin = await createVerifiedUser("admin-err@example.com", "ADMIN");
      const citizen = await createVerifiedUser("citizen-err@example.com");
      const adminToken = await signIn(admin.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-SAFE-03",
        title: "Water pipe leakage",
        description: "Water pipe leaking on footpath.",
        category: "Water Supply",
        citizenId: citizen._id,
        priority: "HIGH",
        status: "IN_PROGRESS",
        location: { address: "FC Road, Pune" },
        imageUrl: "https://example.com/pipe-leak-before.jpg",
      });

      // Verification fails abruptly
      vi.spyOn(geminiAiService, "verifyResolution").mockRejectedValueOnce(
        new Error("Gemini quota exceeded or network timeout"),
      );

      const response = await request(app)
        .post(`/api/v1/complaints/${complaint._id}/resolve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          resolutionImageUrl: "https://example.com/pipe-leak-fixed.jpg",
          resolutionNotes: "Field team replaced rubber gasket and valve.",
        });

      expect(response.status).toBe(200);
      const updatedComplaint = await Complaint.findById(complaint._id);
      expect(updatedComplaint?.status).toBe("RESOLVED");
      expect(updatedComplaint?.aiAnalysis?.resolutionVerdict).toBe("INCONCLUSIVE");
    });
  });
});
