import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Complaint } from "../src/modules/complaints/complaint.model";
import { AuditLog } from "../src/modules/audit/auditLog.model";
import * as geminiAiService from "../src/modules/ai/gemini-ai.service";

const defaultPassword = "SecurePassword#123!";

async function createVerifiedUser(
  email: string,
  role: "CITIZEN" | "ADMIN" | "SUPER_ADMIN" | "DEPARTMENT_ADMIN" = "CITIZEN",
  fullName = "Test User",
) {
  return User.create({
    fullName,
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

describe("Phase 2: Officer Accountability, Resolution Evidence & Super Admin Rejection Controls", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Officer Accountability on Resolution", () => {
    it("records authenticated officer ID, name, email, role, and exact resolution timestamp upon resolution", async () => {
      const officer = await createVerifiedUser(
        "officer-patil@pmc.gov.in",
        "ADMIN",
        "Officer Suresh Patil",
      );
      const citizen = await createVerifiedUser(
        "citizen-kothrud@example.com",
        "CITIZEN",
        "Kothrud Resident",
      );
      const officerToken = await signIn(officer.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-ACCT-01",
        title: "Broken streetlight on Paud Road",
        description: "Streetlight flickering and dark at night near Paud Phata.",
        category: "Electricity",
        citizenId: citizen._id,
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        location: { address: "Paud Phata, Kothrud, Pune" },
        imageUrl: "https://example.com/streetlight-dark.jpg",
      });

      vi.spyOn(geminiAiService, "verifyResolution").mockResolvedValueOnce({
        verdict: "RESOLVED_VERIFIED",
        confidence: 94,
        analysis: "New LED fixture installed and illuminated.",
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

      const resolveRes = await request(app)
        .post(`/api/v1/complaints/${complaint._id}/resolve`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          resolutionImageUrl: "https://example.com/streetlight-fixed.jpg",
          resolutionNotes: "Replaced sodium lamp with 60W LED fixture. Tested luminaire.",
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.success).toBe(true);

      // Verify DB record stores complete authenticated officer accountability
      const resolvedDoc = await Complaint.findById(complaint._id);
      expect(resolvedDoc?.status).toBe("RESOLVED");
      expect(resolvedDoc?.resolutionAudit?.resolvedBy).toBeDefined();
      expect(resolvedDoc?.resolutionAudit?.resolvedBy?.officerId?.toString()).toBe(
        officer._id.toString(),
      );
      expect(resolvedDoc?.resolutionAudit?.resolvedBy?.officerName).toBe("Officer Suresh Patil");
      expect(resolvedDoc?.resolutionAudit?.resolvedBy?.officerEmail).toBe("officer-patil@pmc.gov.in");
      expect(resolvedDoc?.resolutionAudit?.resolvedBy?.officerRole).toBe("ADMIN");
      expect(resolvedDoc?.resolutionAudit?.resolvedBy?.timestamp).toBeInstanceOf(Date);

      // Verify AuditLog record contains officer metadata
      const auditEntry = await AuditLog.findOne({
        targetRef: complaint._id,
        action: "STATUS_UPDATE",
        "metadata.newStatus": "RESOLVED",
      });
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.actorRef.toString()).toBe(officer._id.toString());
      expect(auditEntry?.metadata?.resolvingOfficerId?.toString()).toBe(officer._id.toString());
      expect(auditEntry?.metadata?.resolvingOfficerName).toBe("Officer Suresh Patil");
    });
  });

  describe("Super Admin Resolution Rejection Controls", () => {
    it("allows Super Admin to reject fraudulent resolution evidence, record reason, and reopen complaint", async () => {
      const superAdmin = await createVerifiedUser(
        "superadmin-pmc@pmc.gov.in",
        "SUPER_ADMIN",
        "Chief Municipal Commissioner",
      );
      const officer = await createVerifiedUser(
        "officer-shinde@pmc.gov.in",
        "ADMIN",
        "Field Officer R. Shinde",
      );
      const citizen = await createVerifiedUser(
        "citizen-audited@example.com",
        "CITIZEN",
        "Citizen Rahul",
      );

      const superAdminToken = await signIn(superAdmin.email);

      // Complaint previously resolved by officer
      const complaint = await Complaint.create({
        complaintNumber: "CIV-ACCT-02",
        title: "Deep pothole near Shivaji Nagar bus stand",
        description: "Hazardous pothole causing traffic jams.",
        category: "Roads",
        citizenId: citizen._id,
        priority: "HIGH",
        status: "RESOLVED",
        location: { address: "Shivaji Nagar Bus Stand, Pune" },
        imageUrl: "https://example.com/pothole-shivajinagar.jpg",
        resolutionImageUrl: "https://example.com/fake-repaired-road.jpg",
        resolutionNotes: "Road resurfacing completed.",
        resolutionAudit: {
          resolvedBy: {
            officerId: officer._id,
            officerName: "Field Officer R. Shinde",
            officerEmail: "officer-shinde@pmc.gov.in",
            officerRole: "ADMIN",
            timestamp: new Date(),
          },
        },
      });

      // Super Admin rejects the resolution evidence
      const rejectionPayload = {
        reason: "Inspection revealed repair photo was taken from a different ward; pothole on Shivaji Nagar road remains unrepaired.",
        returnedStatus: "IN_PROGRESS",
      };

      const rejectRes = await request(app)
        .post(`/api/v1/admin/complaints/${complaint._id}/reject-resolution`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send(rejectionPayload);

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.success).toBe(true);
      expect(rejectRes.body.data.complaint.status).toBe("IN_PROGRESS");

      // Verify database state
      const updatedDoc = await Complaint.findById(complaint._id);
      expect(updatedDoc?.status).toBe("IN_PROGRESS");
      expect(updatedDoc?.resolutionAudit?.isRejectionActive).toBe(true);
      expect(updatedDoc?.resolutionAudit?.rejectionReason).toBe(rejectionPayload.reason);
      expect(updatedDoc?.resolutionAudit?.returnedStatus).toBe("IN_PROGRESS");
      expect(updatedDoc?.resolutionAudit?.rejectedBy?.adminName).toBe("Chief Municipal Commissioner");
      expect(updatedDoc?.resolutionAudit?.previousResolutionImageUrl).toBe("https://example.com/fake-repaired-road.jpg");

      // Verify original resolving officer information is preserved for accountability
      expect(updatedDoc?.resolutionAudit?.resolvedBy?.officerName).toBe("Field Officer R. Shinde");

      // Verify immutable audit log was generated
      const auditLog = await AuditLog.findOne({
        targetRef: complaint._id,
        action: "RESOLUTION_EVIDENCE_REJECTED_BY_ADMIN",
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.metadata?.action).toBe("SUPER_ADMIN_REJECTED_RESOLUTION");
      expect(auditLog?.metadata?.previousStatus).toBe("RESOLVED");
      expect(auditLog?.metadata?.newStatus).toBe("IN_PROGRESS");
      expect(auditLog?.metadata?.rejectionReason).toBe(rejectionPayload.reason);
      expect(auditLog?.metadata?.resolvingOfficer).toBe("Field Officer R. Shinde");
    });

    it("rejects rejection request if reason is shorter than 10 characters", async () => {
      const superAdmin = await createVerifiedUser(
        "admin-validation@pmc.gov.in",
        "SUPER_ADMIN",
      );
      const citizen = await createVerifiedUser("citizen-val@example.com");
      const superAdminToken = await signIn(superAdmin.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-ACCT-03",
        title: "Garbage overflow",
        description: "Bins overflowing.",
        category: "Waste Management",
        citizenId: citizen._id,
        priority: "LOW",
        status: "RESOLVED",
        location: { address: "Aundh, Pune" },
        imageUrl: "https://example.com/bin.jpg",
      });

      const response = await request(app)
        .post(`/api/v1/admin/complaints/${complaint._id}/reject-resolution`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          reason: "Too short", // < 10 chars
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("rejects rejection request if complaint is not in RESOLVED status", async () => {
      const superAdmin = await createVerifiedUser(
        "admin-notresolved@pmc.gov.in",
        "SUPER_ADMIN",
      );
      const citizen = await createVerifiedUser("citizen-notres@example.com");
      const superAdminToken = await signIn(superAdmin.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-ACCT-04",
        title: "Water pipeline leak",
        description: "Water leaking near pipeline.",
        category: "Water Supply",
        citizenId: citizen._id,
        priority: "HIGH",
        status: "IN_PROGRESS", // NOT resolved
        location: { address: "Baner, Pune" },
      });

      const response = await request(app)
        .post(`/api/v1/admin/complaints/${complaint._id}/reject-resolution`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          reason: "Cannot reject resolution on an in-progress complaint.",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("forbids regular citizens from rejecting resolution evidence", async () => {
      const citizen = await createVerifiedUser("citizen-unauth@example.com");
      const citizenToken = await signIn(citizen.email);

      const complaint = await Complaint.create({
        complaintNumber: "CIV-ACCT-05",
        title: "Open manhole",
        description: "Dangerous manhole cover missing.",
        category: "Roads",
        citizenId: citizen._id,
        priority: "HIGH",
        status: "RESOLVED",
        location: { address: "FC Road, Pune" },
      });

      const response = await request(app)
        .post(`/api/v1/admin/complaints/${complaint._id}/reject-resolution`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({
          reason: "Citizen trying to call administrative rejection endpoint directly.",
        });

      expect(response.status).toBe(403);
    });
  });
});
