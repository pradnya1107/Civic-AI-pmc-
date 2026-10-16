import { describe, expect, it } from "vitest";
import mongoose, { Types } from "mongoose";
import { User } from "../src/modules/users/user.model";
import { Department } from "../src/modules/departments/department.model";
import { Complaint } from "../src/modules/complaints/complaint.model";
import { Notification } from "../src/modules/notifications/notification.model";
import { AuditLog } from "../src/modules/audit/auditLog.model";

describe("Database Models & MongoDB Connection (Issue #2)", () => {
  it("verifies the active MongoDB connection", () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  describe("User Model", () => {
    it("creates and retrieves a user successfully", async () => {
      const user = await User.create({
        fullName: "Pradnya Ghodke",
        email: "test.model@civicai.com",
        passwordHash: "$2b$10$hashedpasswordvalueforunitest",
        role: "CITIZEN",
        emailVerified: true,
        accountStatus: "ACTIVE",
      });

      expect(user._id).toBeDefined();
      expect(user.email).toBe("test.model@civicai.com");
      expect(user.fullName).toBe("Pradnya Ghodke");
      expect(user.name).toBe("Pradnya Ghodke"); // virtual
      expect(user.role).toBe("CITIZEN");

      const retrieved = await User.findById(user._id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.email).toBe("test.model@civicai.com");
    });

    it("throws a duplicate-key error (E11000) when inserting duplicate email", async () => {
      await User.init(); // ensure indexes are created in memory repl set
      await User.create({
        fullName: "First User",
        email: "duplicate.model@civicai.com",
        passwordHash: "$2b$10$hashedpasswordvalueforunitest",
        role: "CITIZEN",
      });

      await expect(
        User.create({
          fullName: "Second User",
          email: "duplicate.model@civicai.com",
          passwordHash: "$2b$10$hashedpasswordvalueforunitest2",
          role: "CITIZEN",
        }),
      ).rejects.toThrow(/E11000.*duplicate key error.*email/i);
    });
  });

  describe("Department Model", () => {
    it("creates and retrieves department correctly", async () => {
      const dept = await Department.create({
        name: "Roads Department",
        slug: "roads-dept-test",
        description: "Handles city road maintenance",
        isActive: true,
      });

      expect(dept._id).toBeDefined();
      expect(dept.name).toBe("Roads Department");
      expect(dept.isActive).toBe(true);

      const found = await Department.findOne({ slug: "roads-dept-test" });
      expect(found).not.toBeNull();
      expect(found?.name).toBe("Roads Department");
    });
  });

  describe("Complaint Model", () => {
    it("creates and retrieves complaint with compound index", async () => {
      await Complaint.init();
      const citizenId = new Types.ObjectId();
      const deptId = new Types.ObjectId();

      const complaint = await Complaint.create({
        title: "Pothole on Main Road",
        description: "Deep pothole causing traffic slowdown near civic center",
        category: "Roads & Infrastructure",
        location: {
          address: "FC Road, Shivajinagar, Pune",
          ward: "Shivajinagar",
        },
        citizenId,
        departmentId: deptId,
        priority: "HIGH",
        status: "SUBMITTED",
      });

      expect(complaint._id).toBeDefined();
      expect(complaint.complaintNumber).toMatch(/^CIV-/);
      expect(complaint.priority).toBe("HIGH");
      expect(complaint.status).toBe("SUBMITTED");

      // Verify compound index query executes efficiently
      const queried = await Complaint.find({ status: "SUBMITTED", citizenId });
      expect(queried.length).toBe(1);
      expect(queried[0].title).toBe("Pothole on Main Road");
    });
  });

  describe("Notification Model", () => {
    it("creates and retrieves notifications correctly", async () => {
      const recipientId = new Types.ObjectId();
      const complaintId = new Types.ObjectId();

      const notification = await Notification.create({
        recipientId,
        complaintId,
        type: "COMPLAINT_SUBMITTED",
        title: "Complaint Registered",
        message: "Your complaint has been submitted successfully.",
      });

      expect(notification._id).toBeDefined();
      expect(notification.type).toBe("COMPLAINT_SUBMITTED");

      const found = await Notification.findById(notification._id);
      expect(found?.title).toBe("Complaint Registered");
    });
  });

  describe("AuditLog Model", () => {
    it("creates and retrieves audit log records correctly", async () => {
      const actorRef = new Types.ObjectId();
      const targetRef = new Types.ObjectId();

      const log = await AuditLog.create({
        actorRef,
        action: "STATUS_UPDATE",
        targetRef,
        targetModel: "Complaint",
        metadata: { fromStatus: "SUBMITTED", toStatus: "IN_PROGRESS" },
      });

      expect(log._id).toBeDefined();
      expect(log.action).toBe("STATUS_UPDATE");
      expect(log.targetModel).toBe("Complaint");

      const found = await AuditLog.findById(log._id);
      expect(found?.metadata).toEqual({
        fromStatus: "SUBMITTED",
        toStatus: "IN_PROGRESS",
      });
    });
  });
});
