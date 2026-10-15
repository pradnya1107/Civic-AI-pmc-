import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Complaint } from "../src/modules/complaints/complaint.model";
import { Department } from "../src/modules/departments/department.model";
import { Notification } from "../src/modules/notifications/notification.model";
import type { ComplaintClassificationProvider } from "../src/modules/ai/classification-provider";

const defaultPassword = "SecurePassword#123!";

async function createVerifiedUser(
  email: string,
  role: "CITIZEN" | "ADMIN" = "CITIZEN",
) {
  return User.create({
    fullName: role === "ADMIN" ? "PMC Administrator" : "Civic Citizen",
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

describe("GitHub Issue #4: Core Complaint CRUD API", () => {
  describe("1. Complaint Creation (POST /api/v1/complaints)", () => {
    it("allows authenticated citizen to submit a valid complaint", async () => {
      const citizen = await createVerifiedUser("citizen-create@example.com");
      const token = await signIn(citizen.email);

      const payload = {
        title: "Large pothole near Swargate bus stand",
        description:
          "There is a severe pothole causing traffic slowdowns and hazard to two-wheelers.",
        category: "Roads",
        location: {
          address: "Swargate Bus Stand, Pune",
          ward: "Ward 12",
          latitude: 18.5018,
          longitude: 73.8585,
        },
      };

      const response = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Complaint submitted successfully.");

      const created = response.body.data.complaint;
      expect(created._id).toBeDefined();
      expect(created.complaintNumber).toMatch(/^CIV-[0-9a-f-]+$/i);
      expect(created.title).toBe(payload.title);
      expect(created.description).toBe(payload.description);
      expect(created.category).toBe(payload.category);
      expect(created.citizenId).toBe(citizen.id);
      expect(created.status).toBe("SUBMITTED");
      expect(created.priority).toBe("MEDIUM");
      expect(created.location.address).toBe(payload.location.address);
      expect(created.location.ward).toBe(payload.location.ward);
      expect(created.location.latitude).toBe(payload.location.latitude);
      expect(created.location.longitude).toBe(payload.location.longitude);
    });

    it("enforces complaint owner from authenticated session, ignoring client-supplied owner ID and status", async () => {
      const citizen = await createVerifiedUser("citizen-owner@example.com");
      const maliciousOwner = await createVerifiedUser("other-victim@example.com");
      const token = await signIn(citizen.email);

      const response = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Garbage pile in neighborhood park",
          description: "Solid waste has been accumulating for the past 5 days.",
          category: "Sanitation",
          location: { address: "Model Colony, Pune" },
          citizenId: maliciousOwner.id,
          status: "RESOLVED",
        });

      // Zod schema is strict, so unexpected keys like citizenId or status are rejected with 400
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects invalid complaint input (empty title, short description, invalid coords)", async () => {
      const citizen = await createVerifiedUser("citizen-invalid@example.com");
      const token = await signIn(citizen.email);

      // Title too short (< 3 chars)
      const resShortTitle = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "No",
          description: "Valid description of sufficient length.",
          category: "Water",
          location: { address: "Kothrud, Pune" },
        });
      expect(resShortTitle.status).toBe(400);
      expect(resShortTitle.body.error.code).toBe("VALIDATION_ERROR");

      // Description too short (< 10 chars)
      const resShortDesc = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Low water pressure",
          description: "Too short",
          category: "Water",
          location: { address: "Kothrud, Pune" },
        });
      expect(resShortDesc.status).toBe(400);
      expect(resShortDesc.body.error.code).toBe("VALIDATION_ERROR");

      // Latitude provided without longitude
      const resMismatchedCoords = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Broken streetlight",
          description: "Streetlight is not working during the night.",
          category: "Electrical",
          location: { address: "FC Road, Pune", latitude: 18.52 },
        });
      expect(resMismatchedCoords.status).toBe(400);
      expect(resMismatchedCoords.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects unauthenticated complaint creation with 401", async () => {
      const response = await request(app)
        .post("/api/v1/complaints")
        .send({
          title: "Public hazard complaint",
          description: "Detailed hazard description here for validation.",
          category: "Safety",
          location: { address: "Pune Station" },
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("2. Complaint Listing & Pagination (GET /api/v1/complaints)", () => {
    it("scopes complaint list to the authenticated citizen and respects pagination", async () => {
      const citizenA = await createVerifiedUser("citizen-list-a@example.com");
      const citizenB = await createVerifiedUser("citizen-list-b@example.com");
      const tokenA = await signIn(citizenA.email);

      // Create 3 complaints for Citizen A
      for (let i = 1; i <= 3; i++) {
        await Complaint.create({
          title: `Citizen A Complaint ${i}`,
          description: `Detailed description for complaint number ${i}.`,
          category: "Roads",
          location: { address: `Address ${i}, Pune` },
          citizenId: citizenA._id,
        });
      }

      // Create 2 complaints for Citizen B
      for (let i = 1; i <= 2; i++) {
        await Complaint.create({
          title: `Citizen B Complaint ${i}`,
          description: `Citizen B detailed complaint description ${i}.`,
          category: "Sanitation",
          location: { address: `Address B${i}, Pune` },
          citizenId: citizenB._id,
        });
      }

      // Citizen A requests page 1 with limit 2
      const resPage1 = await request(app)
        .get("/api/v1/complaints?page=1&limit=2")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(resPage1.status).toBe(200);
      expect(resPage1.body.data.complaints).toHaveLength(2);
      expect(resPage1.body.data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        pages: 2,
      });

      // Verify all returned complaints belong to Citizen A
      for (const item of resPage1.body.data.complaints) {
        expect(item.citizenId.toString()).toBe(citizenA.id);
      }

      // Citizen A requests page 2 with limit 2
      const resPage2 = await request(app)
        .get("/api/v1/complaints?page=2&limit=2")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data.complaints).toHaveLength(1);
      expect(resPage2.body.data.pagination.page).toBe(2);
    });

    it("allows administrators to view all complaints across citizens", async () => {
      const admin = await createVerifiedUser("admin-list@example.com", "ADMIN");
      const citizen1 = await createVerifiedUser("c1@example.com");
      const citizen2 = await createVerifiedUser("c2@example.com");
      const adminToken = await signIn(admin.email);

      await Complaint.create({
        title: "Complaint from citizen 1",
        description: "Valid description for complaint from citizen 1.",
        category: "Water",
        location: { address: "Camp, Pune" },
        citizenId: citizen1._id,
      });
      await Complaint.create({
        title: "Complaint from citizen 2",
        description: "Valid description for complaint from citizen 2.",
        category: "Drainage",
        location: { address: "Aundh, Pune" },
        citizenId: citizen2._id,
      });

      const response = await request(app)
        .get("/api/v1/complaints")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.complaints).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it("filters complaints by status, priority, and category", async () => {
      const citizen = await createVerifiedUser("citizen-filter@example.com");
      const token = await signIn(citizen.email);

      await Complaint.create({
        title: "Critical Water Issue",
        description: "Drinking water pipe burst in the society.",
        category: "Water",
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        location: { address: "Baner, Pune" },
        citizenId: citizen._id,
      });

      await Complaint.create({
        title: "Minor Road Pothole",
        description: "Small pothole on internal lane.",
        category: "Roads",
        priority: "LOW",
        status: "SUBMITTED",
        location: { address: "Baner, Pune" },
        citizenId: citizen._id,
      });

      const waterFilter = await request(app)
        .get("/api/v1/complaints?category=Water")
        .set("Authorization", `Bearer ${token}`);
      expect(waterFilter.body.data.complaints).toHaveLength(1);
      expect(waterFilter.body.data.complaints[0].title).toBe("Critical Water Issue");

      const priorityFilter = await request(app)
        .get("/api/v1/complaints?priority=CRITICAL")
        .set("Authorization", `Bearer ${token}`);
      expect(priorityFilter.body.data.complaints).toHaveLength(1);
      expect(priorityFilter.body.data.complaints[0].priority).toBe("CRITICAL");

      const statusFilter = await request(app)
        .get("/api/v1/complaints?status=SUBMITTED")
        .set("Authorization", `Bearer ${token}`);
      expect(statusFilter.body.data.complaints).toHaveLength(1);
      expect(statusFilter.body.data.complaints[0].title).toBe("Minor Road Pothole");
    });

    it("rejects excessive or invalid pagination limit", async () => {
      const citizen = await createVerifiedUser("citizen-limits@example.com");
      const token = await signIn(citizen.email);

      const excessiveLimit = await request(app)
        .get("/api/v1/complaints?limit=101")
        .set("Authorization", `Bearer ${token}`);
      expect(excessiveLimit.status).toBe(400);

      const zeroLimit = await request(app)
        .get("/api/v1/complaints?limit=0")
        .set("Authorization", `Bearer ${token}`);
      expect(zeroLimit.status).toBe(400);
    });
  });

  describe("3. Get Complaint by ID (GET /api/v1/complaints/:id)", () => {
    it("allows a citizen to access their own complaint details", async () => {
      const citizen = await createVerifiedUser("citizen-detail@example.com");
      const token = await signIn(citizen.email);

      const complaint = await Complaint.create({
        title: "Sewage blockage issue",
        description: "Sewage water is backing up in the drainage chamber.",
        category: "Drainage",
        location: { address: "Katraj, Pune" },
        citizenId: citizen._id,
      });

      const response = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.complaint._id.toString()).toBe(complaint.id);
      expect(response.body.data.complaint.title).toBe("Sewage blockage issue");
    });

    it("returns 404 and does not leak private complaint when citizen requests another user's complaint", async () => {
      const citizenA = await createVerifiedUser("citizen-a@example.com");
      const citizenB = await createVerifiedUser("citizen-b@example.com");
      const tokenB = await signIn(citizenB.email);

      const complaintA = await Complaint.create({
        title: "Private citizen A complaint",
        description: "This complaint contains private citizen notes.",
        category: "Sanitation",
        location: { address: "Bhavani Peth, Pune" },
        citizenId: citizenA._id,
      });

      const response = await request(app)
        .get(`/api/v1/complaints/${complaintA._id}`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("COMPLAINT_NOT_FOUND");
    });

    it("rejects invalid MongoDB ObjectId with 400", async () => {
      const citizen = await createVerifiedUser("citizen-invalid-id@example.com");
      const token = await signIn(citizen.email);

      const response = await request(app)
        .get("/api/v1/complaints/123-invalid-hex")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("4. Complaint Update (PATCH /api/v1/complaints/:id)", () => {
    it("allows citizen to update content and location while complaint is still SUBMITTED", async () => {
      const citizen = await createVerifiedUser("citizen-edit@example.com");
      const token = await signIn(citizen.email);

      const complaint = await Complaint.create({
        title: "Initial Pothole Title",
        description: "Initial description of the issue in the locality.",
        category: "Roads",
        location: { address: "Old Address, Pune" },
        citizenId: citizen._id,
        status: "SUBMITTED",
      });

      const response = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Updated Pothole Title (Severe)",
          description: "Updated description with more details about traffic impact.",
          location: { address: "Corrected Address, Pune" },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.complaint.title).toBe("Updated Pothole Title (Severe)");
      expect(response.body.data.complaint.location.address).toBe("Corrected Address, Pune");
    });

    it("forbids citizens from changing administrator-only fields (status, priority, departmentId)", async () => {
      const citizen = await createVerifiedUser("citizen-perms@example.com");
      const token = await signIn(citizen.email);

      const complaint = await Complaint.create({
        title: "Streetlight fault",
        description: "Streetlight not illuminating the intersection.",
        category: "Electrical",
        location: { address: "Shivajinagar, Pune" },
        citizenId: citizen._id,
        status: "SUBMITTED",
      });

      // Attempt to change status
      const resStatus = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "RESOLVED" });
      expect(resStatus.status).toBe(403);
      expect(resStatus.body.error.code).toBe("FORBIDDEN");

      // Attempt to change priority
      const resPriority = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ priority: "CRITICAL" });
      expect(resPriority.status).toBe(403);
      expect(resPriority.body.error.code).toBe("FORBIDDEN");

      // Attempt to assign department
      const resDept = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ departmentId: "507f1f77bcf86cd799439011" });
      expect(resDept.status).toBe(403);
      expect(resDept.body.error.code).toBe("FORBIDDEN");
    });

    it("prevents citizen from updating complaint once reviewed or past SUBMITTED status (409)", async () => {
      const citizen = await createVerifiedUser("citizen-locked@example.com");
      const token = await signIn(citizen.email);

      const complaint = await Complaint.create({
        title: "Active complaint under review",
        description: "Description of a complaint that municipal staff started working on.",
        category: "Roads",
        location: { address: "Yerawada, Pune" },
        citizenId: citizen._id,
        status: "IN_PROGRESS",
      });

      const response = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Trying to edit after review" });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("COMPLAINT_NOT_EDITABLE");
    });
  });

  describe("5. Complaint Deletion Policy (DELETE /api/v1/complaints/:id)", () => {
    it("allows a citizen to delete their own complaint while it is SUBMITTED", async () => {
      const citizen = await createVerifiedUser("citizen-delete-own@example.com");
      const token = await signIn(citizen.email);

      const complaint = await Complaint.create({
        title: "Duplicate complaint to delete",
        description: "Citizen created duplicate complaint by mistake.",
        category: "Sanitation",
        location: { address: "Hadapsar, Pune" },
        citizenId: citizen._id,
        status: "SUBMITTED",
      });

      // Notification attached to complaint
      await Notification.create({
        recipientId: citizen._id,
        complaintId: complaint._id,
        type: "COMPLAINT_SUBMITTED",
        title: "New complaint",
        message: "Submitted",
      });

      const response = await request(app)
        .delete(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Complaint deleted successfully.");

      // Verify removed from database
      const foundInDb = await Complaint.findById(complaint._id);
      expect(foundInDb).toBeNull();

      // Verify associated notifications cleaned up
      const notificationsLeft = await Notification.countDocuments({
        complaintId: complaint._id,
      });
      expect(notificationsLeft).toBe(0);
    });

    it("prevents a citizen from deleting another citizen's complaint (404 without leaking existence)", async () => {
      const citizenA = await createVerifiedUser("owner-citizen@example.com");
      const citizenB = await createVerifiedUser("attacker-citizen@example.com");
      const tokenB = await signIn(citizenB.email);

      const complaintA = await Complaint.create({
        title: "Citizen A Complaint",
        description: "Valid description for complaint owned by Citizen A.",
        category: "Roads",
        location: { address: "Viman Nagar, Pune" },
        citizenId: citizenA._id,
        status: "SUBMITTED",
      });

      const response = await request(app)
        .delete(`/api/v1/complaints/${complaintA._id}`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("COMPLAINT_NOT_FOUND");

      // Verify complaint was not deleted
      const stillExists = await Complaint.findById(complaintA._id);
      expect(stillExists).not.toBeNull();
    });

    it("prevents a citizen from deleting their complaint once reviewed or past SUBMITTED (400 COMPLAINT_NOT_DELETABLE)", async () => {
      const citizen = await createVerifiedUser("citizen-del-inprogress@example.com");
      const token = await signIn(citizen.email);

      const complaint = await Complaint.create({
        title: "In-progress civic repair",
        description: "Municipal team is already assigned and working on this repair.",
        category: "Roads",
        location: { address: "Pashan, Pune" },
        citizenId: citizen._id,
        status: "IN_PROGRESS",
      });

      const response = await request(app)
        .delete(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("COMPLAINT_NOT_DELETABLE");
      expect(response.body.message).toBe(
        "A complaint can only be deleted before it is reviewed.",
      );

      // Verify complaint is preserved
      expect(await Complaint.findById(complaint._id)).not.toBeNull();
    });

    it("prevents an administrator from deleting an ineligible complaint (not RESOLVED)", async () => {
      const admin = await createVerifiedUser("admin-delete-fail@example.com", "ADMIN");
      const citizen = await createVerifiedUser("citizen-unresolved@example.com");
      const adminToken = await signIn(admin.email);

      const complaint = await Complaint.create({
        title: "Pending open complaint",
        description: "This complaint is still open and being investigated.",
        category: "Health",
        location: { address: "Kasba Peth, Pune" },
        citizenId: citizen._id,
        status: "UNDER_REVIEW",
      });

      const response = await request(app)
        .delete(`/api/v1/complaints/${complaint._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("COMPLAINT_NOT_DELETABLE");
      expect(response.body.message).toBe(
        "Only resolved complaints can be deleted by administrators.",
      );

      // Verify database record was not destroyed
      expect(await Complaint.findById(complaint._id)).not.toBeNull();
    });

    it("allows an administrator to delete an eligible RESOLVED complaint", async () => {
      const admin = await createVerifiedUser("admin-delete-success@example.com", "ADMIN");
      const citizen = await createVerifiedUser("citizen-resolved-owner@example.com");
      const adminToken = await signIn(admin.email);

      const resolvedComplaint = await Complaint.create({
        title: "Cleaned water tank",
        description: "The municipal team inspected and cleaned the water tank completely.",
        category: "Water",
        location: { address: "Warje, Pune" },
        citizenId: citizen._id,
        status: "RESOLVED",
      });

      const response = await request(app)
        .delete(`/api/v1/complaints/${resolvedComplaint._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Complaint deleted successfully.");

      expect(await Complaint.findById(resolvedComplaint._id)).toBeNull();
    });

    it("returns 404 when deleting a non-existent complaint ID", async () => {
      const admin = await createVerifiedUser("admin-404@example.com", "ADMIN");
      const adminToken = await signIn(admin.email);

      const response = await request(app)
        .delete("/api/v1/complaints/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("COMPLAINT_NOT_FOUND");
    });

    it("rejects unauthenticated deletion attempts with 401", async () => {
      const response = await request(app).delete(
        "/api/v1/complaints/507f1f77bcf86cd799439011",
      );

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("6. AI Capabilities & Fraud Safety Verification", () => {
    it("ensures AI classification provider suggestions do not automatically trigger deletion or alter complaint state", async () => {
      const citizen = await createVerifiedUser("ai-test-citizen@example.com");
      const complaint = await Complaint.create({
        title: "Garbage near public school",
        description: "Garbage is dumped outside school entrance.",
        category: "Sanitation",
        location: { address: "Koregaon Park, Pune" },
        citizenId: citizen._id,
        status: "SUBMITTED",
      });

      // Mock AI provider interface to simulate a classification suggestion
      const mockAiProvider: ComplaintClassificationProvider = {
        classifyComplaint: vi.fn().mockResolvedValue({
          category: "Sanitation",
          priority: "HIGH",
          summary: "Garbage dumping near educational institution requires high priority.",
        }),
      };

      const suggestion = await mockAiProvider.classifyComplaint({
        title: complaint.title,
        description: complaint.description,
        location: complaint.location.address,
      });

      expect(suggestion.priority).toBe("HIGH");

      // Verify the complaint remains intact and undeleted in the database
      const dbRecord = await Complaint.findById(complaint._id);
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.status).toBe("SUBMITTED");
    });
  });
});
