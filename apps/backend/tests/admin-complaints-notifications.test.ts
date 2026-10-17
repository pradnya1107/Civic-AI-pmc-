import { describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Complaint } from "../src/modules/complaints/complaint.model";
import { Department } from "../src/modules/departments/department.model";
import { Notification } from "../src/modules/notifications/notification.model";
import { AuditLog } from "../src/modules/audit/auditLog.model";

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

describe("ISSUE-08: Admin Complaint Management & Notifications API", () => {
  describe("1. Admin Complaints Directory (GET /api/v1/admin/complaints)", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const response = await request(app).get("/api/v1/admin/complaints");
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects citizen accounts with 403 Forbidden", async () => {
      const citizen = await createTestUser("citizen-denied@example.com", "CITIZEN");
      const token = await getAccessToken(citizen.email);

      const response = await request(app)
        .get("/api/v1/admin/complaints")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("allows administrators to fetch paginated complaints with KPI metrics and filters", async () => {
      const admin = await createTestUser("admin-list-tester@example.com", "ADMIN");
      const citizen = await createTestUser("citizen-sub-1@example.com", "CITIZEN");
      const adminToken = await getAccessToken(admin.email);

      const dept = await Department.create({
        name: "Solid Waste Management",
        slug: "solid-waste",
        description: "Manages solid municipal waste",
      });

      await Complaint.create({
        title: "Garbage accumulating outside society",
        description: "Solid waste has not been collected for three days.",
        category: "Sanitation",
        priority: "HIGH",
        status: "SUBMITTED",
        location: { address: "Kothrud, Pune", ward: "Ward 10" },
        citizenId: citizen._id,
        departmentId: dept._id,
      });

      await Complaint.create({
        title: "Broken streetlight pole",
        description: "Streetlight knocked over by heavy winds.",
        category: "Electrical",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        location: { address: "Aundh, Pune", ward: "Ward 4" },
        citizenId: citizen._id,
      });

      const response = await request(app)
        .get("/api/v1/admin/complaints?category=Sanitation")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.complaints).toHaveLength(1);
      expect(response.body.data.complaints[0].title).toBe("Garbage accumulating outside society");
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.metrics.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe("2. Admin Status Update with AuditLog & Notification (PATCH /api/v1/admin/complaints/:id/status)", () => {
    it("updates complaint status, records an AuditLog, and creates a Notification for the citizen", async () => {
      const admin = await createTestUser("admin-status-updater@example.com", "ADMIN");
      const citizen = await createTestUser("citizen-notif-target@example.com", "CITIZEN");
      const adminToken = await getAccessToken(admin.email);

      const complaint = await Complaint.create({
        title: "Deep pothole on bridge",
        description: "Hazardous road condition on Shivaji Bridge.",
        category: "Roads",
        status: "SUBMITTED",
        location: { address: "Shivaji Bridge, Pune" },
        citizenId: citizen._id,
      });

      const response = await request(app)
        .patch(`/api/v1/admin/complaints/${complaint._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          status: "IN_PROGRESS",
          notes: "Road crew deployed on-site.",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.complaint.status).toBe("IN_PROGRESS");

      // Verify AuditLog written
      const auditLog = await AuditLog.findOne({
        targetRef: complaint._id,
        action: "STATUS_UPDATE",
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorRef.toString()).toBe(admin.id);
      expect(auditLog?.metadata?.oldStatus).toBe("SUBMITTED");
      expect(auditLog?.metadata?.newStatus).toBe("IN_PROGRESS");
      expect(auditLog?.metadata?.notes).toBe("Road crew deployed on-site.");

      // Verify Notification created for citizen
      const notif = await Notification.findOne({
        recipientId: citizen._id,
        complaintId: complaint._id,
      });
      expect(notif).not.toBeNull();
      expect(notif?.title).toBe("Complaint Status Updated");
      expect(notif?.message).toContain("status changed from SUBMITTED to IN_PROGRESS");
    });
  });

  describe("3. Admin Department Assignment (PATCH /api/v1/admin/complaints/:id/assign)", () => {
    it("assigns department, writes AuditLog, auto-updates status, and triggers notification", async () => {
      const admin = await createTestUser("admin-assigner@example.com", "ADMIN");
      const citizen = await createTestUser("citizen-assigned-owner@example.com", "CITIZEN");
      const adminToken = await getAccessToken(admin.email);

      const dept = await Department.create({
        name: "Roads & Traffic Dept",
        slug: "roads-traffic",
      });

      const complaint = await Complaint.create({
        title: "Missing manhole cover",
        description: "Dangerous open chamber on pedestrian walkway.",
        category: "Drainage",
        status: "SUBMITTED",
        location: { address: "Camp, Pune" },
        citizenId: citizen._id,
      });

      const response = await request(app)
        .patch(`/api/v1/admin/complaints/${complaint._id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          departmentId: dept.id,
          notes: "Assigned for immediate cover replacement.",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.complaint.status).toBe("ASSIGNED");

      // Verify AuditLog
      const auditLog = await AuditLog.findOne({
        targetRef: complaint._id,
        action: "ASSIGN_DEPARTMENT",
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.metadata?.departmentName).toBe("Roads & Traffic Dept");

      // Verify Notification
      const notif = await Notification.findOne({
        recipientId: citizen._id,
        complaintId: complaint._id,
        type: "COMPLAINT_UPDATED",
      });
      expect(notif).not.toBeNull();
      expect(notif?.message).toContain("has been assigned to Roads & Traffic Dept");
    });
  });

  describe("4. Notifications API (GET & PATCH /api/v1/notifications)", () => {
    it("returns unread notifications and decrements count when marked read", async () => {
      const citizen = await createTestUser("citizen-bell-user@example.com", "CITIZEN");
      const citizenToken = await getAccessToken(citizen.email);

      const complaint = await Complaint.create({
        title: "Fallen tree branch",
        description: "Blocking roadway near garden.",
        category: "Other",
        status: "SUBMITTED",
        location: { address: "Model Colony, Pune" },
        citizenId: citizen._id,
      });

      const notif = await Notification.create({
        recipientId: citizen._id,
        complaintId: complaint._id,
        type: "COMPLAINT_UPDATED",
        title: "Complaint Under Review",
        message: "Municipal staff verified your report.",
      });

      // GET /api/v1/notifications
      const resList = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(resList.status).toBe(200);
      expect(resList.body.data.notifications).toHaveLength(1);
      expect(resList.body.data.unreadCount).toBe(1);
      expect(resList.body.data.notifications[0].isRead).toBe(false);

      // PATCH /api/v1/notifications/:id/read
      const resRead = await request(app)
        .patch(`/api/v1/notifications/${notif._id}/read`)
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(resRead.status).toBe(200);
      expect(resRead.body.data.notification.isRead).toBe(true);

      // Verify unread count is now 0
      const resListAfter = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(resListAfter.body.data.unreadCount).toBe(0);
    });
  });
});
