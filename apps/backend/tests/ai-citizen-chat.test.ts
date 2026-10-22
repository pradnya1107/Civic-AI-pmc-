import { describe, expect, it } from "vitest";
import request from "supertest";
import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { Complaint } from "../src/modules/complaints/complaint.model";
import { User } from "../src/modules/users/user.model";
import { getJwtSecret } from "../src/config/auth";

describe("AI Citizen Support Chatbot API (POST /api/v1/ai/chat)", () => {
  it("rejects request with empty message with 400 Bad Request", async () => {
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .send({ message: "   " });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects message exceeding 1000 characters", async () => {
    const longMessage = "a".repeat(1001);
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .send({ message: longMessage });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns helpful civic guidance and suggested actions for unauthenticated citizen queries", async () => {
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .send({ message: "How do I report a pothole on the road?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.reply).toContain("Roads & Potholes");
    expect(res.body.data.conversationId).toBeDefined();
    expect(Array.isArray(res.body.data.suggestedActions)).toBe(true);

    const reportAction = res.body.data.suggestedActions.find(
      (a: any) => a.path === "/complaints/new",
    );
    expect(reportAction).toBeDefined();
  });

  it("provides specific PMC department guidance for municipal water leaks", async () => {
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .send({ message: "There is a water pipeline leakage in our street" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toContain("Water Supply");
    expect(res.body.data.reply).toContain("24 hours");
    expect(res.body.data.suggestedActions.length).toBeGreaterThan(0);
  });

  it("provides official PMC helplines and emergency contact numbers", async () => {
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .send({ message: "What is the PMC emergency helpline number?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toContain("1800-1030-222");
    expect(res.body.data.reply).toContain("9689900002");
  });

  it("prompts unauthenticated user to log in when querying complaint status generally", async () => {
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .send({ message: "Check status of my complaints" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toContain("sign in");
    const loginAction = res.body.data.suggestedActions.find(
      (a: any) => a.path === "/login",
    );
    expect(loginAction).toBeDefined();
  });

  it("allows authenticated citizen to track their own registered complaint status", async () => {
    const citizen = await User.create({
      fullName: "Rahul Sharma",
      name: "Rahul Sharma",
      email: `rahul.citizen.${Date.now()}@example.com`,
      passwordHash: "hashedpassword123",
      role: "CITIZEN",
      emailVerified: true,
      accountStatus: "ACTIVE",
    });

    const complaint = await Complaint.create({
      complaintNumber: "PMC-TEST-8899",
      title: "Broken streetlight near society entrance",
      description: "Streetlight has been dark for 3 days posing security risk",
      category: "Street Lighting & Electrical",
      location: { address: "Bavdhan, Pune", ward: "Ward 2 - Kothrud / Bavdhan" },
      citizenId: citizen._id,
      priority: "HIGH",
      status: "IN_PROGRESS",
      slaDeadline: new Date(Date.now() + 48 * 3600 * 1000),
      assignedOfficer: {
        name: "Officer Patil",
        phone: "9876543210",
        designation: "Junior Electrical Engineer",
      },
    });

    const token = jwt.sign(
      { tokenVersion: citizen.tokenVersion ?? 0, role: citizen.role, email: citizen.email },
      getJwtSecret(),
      { subject: citizen.id, expiresIn: "7d" },
    );

    const res = await request(app)
      .post("/api/v1/ai/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Track status of complaint PMC-TEST-8899" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toContain("Broken streetlight");
    expect(res.body.data.reply).toContain("IN_PROGRESS");
    expect(res.body.data.reply).toContain("Officer Patil");

    const detailAction = res.body.data.suggestedActions.find(
      (a: any) => a.path === `/complaints/${complaint._id.toString()}`,
    );
    expect(detailAction).toBeDefined();
  });

  it("strictly enforces citizen privacy and prevents unauthorized access to another citizen's complaint", async () => {
    const citizenA = await User.create({
      fullName: "Citizen A",
      name: "Citizen A",
      email: `citizena.${Date.now()}@example.com`,
      passwordHash: "hashedpassword123",
      role: "CITIZEN",
      emailVerified: true,
      accountStatus: "ACTIVE",
    });

    const citizenB = await User.create({
      fullName: "Citizen B",
      name: "Citizen B",
      email: `citizenb.${Date.now()}@example.com`,
      passwordHash: "hashedpassword123",
      role: "CITIZEN",
      emailVerified: true,
      accountStatus: "ACTIVE",
    });

    const privateComplaint = await Complaint.create({
      complaintNumber: "PMC-PRIV-1234",
      title: "Private residential issue",
      description: "Confidential details",
      category: "Drainage & Sewerage",
      location: { address: "Shivajinagar, Pune" },
      citizenId: citizenA._id,
      priority: "LOW",
      status: "UNDER_REVIEW",
      slaDeadline: new Date(),
    });

    // Citizen B attempts to query Citizen A's complaint
    const tokenB = jwt.sign(
      { tokenVersion: citizenB.tokenVersion ?? 0, role: citizenB.role, email: citizenB.email },
      getJwtSecret(),
      { subject: citizenB.id, expiresIn: "7d" },
    );

    const res = await request(app)
      .post("/api/v1/ai/chat")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ message: "What is the status of complaint PMC-PRIV-1234?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Must protect privacy
    expect(res.body.data.reply).toContain("citizen data privacy");
    expect(res.body.data.reply).not.toContain("Confidential details");
  });
});
