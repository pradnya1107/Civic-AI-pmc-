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
      .send({ message: "How do I report a pothole on the road in Pune?" });

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
      .send({ message: "There is a water pipeline leakage in our street in Pune" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toContain("Water Supply");
    expect(res.body.data.reply).toContain("24");
    expect(res.body.data.suggestedActions.length).toBeGreaterThan(0);
  });

  it("provides official PMC helplines and emergency contact numbers", async () => {
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .send({ message: "What is the official PMC emergency helpline contact?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toContain("1800-1030-222");
  });

  it("Strict Guardrail: Politely declines off-topic questions and strictly restricts to Civic AI & PMC matters", async () => {
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .send({ message: "Can you write python code to scrape a website?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toMatch(/CivicBot.*dedicated to.*Pune Municipal Corporation|cannot answer.*outside Pune civic/i);
    expect(res.body.data.suggestedActions.length).toBeGreaterThan(0);
  });

  it("allows authenticated citizen to track their own registered complaint status", async () => {
    const citizenId = new Types.ObjectId();
    const citizen = await User.create({
      _id: citizenId,
      name: "Pradnya Ghodke",
      fullName: "Pradnya Ghodke",
      email: `citizen.chat.${Date.now()}@example.com`,
      passwordHash: "secureHash123",
      role: "CITIZEN",
    });

    const token = jwt.sign(
      { tokenVersion: citizen.tokenVersion ?? 0, role: "CITIZEN", email: citizen.email },
      getJwtSecret(),
      { subject: citizen._id.toString(), expiresIn: "1h" },
    );

    const complaint = await Complaint.create({
      citizenId: citizen._id,
      title: "Garbage accumulating near Kothrud Depot",
      description: "Overflowing community trash bin has not been cleared for 3 days.",
      category: "Solid Waste & Garbage",
      location: {
        type: "Point",
        coordinates: [73.8123, 18.5074],
        address: "Near Kothrud Bus Stand, Pune",
      },
      complaintNumber: `PMC-CHAT-${Date.now().toString().slice(-4)}`,
      status: "UNDER_REVIEW",
      priority: "MEDIUM",
    });

    const res = await request(app)
      .post("/api/v1/ai/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: `What is the status of my complaint ${complaint.complaintNumber}?` });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toContain(complaint.title);
    expect(res.body.data.reply).toContain("UNDER_REVIEW");
    expect(res.body.data.reply).toContain(complaint.complaintNumber);

    const detailAction = res.body.data.suggestedActions.find(
      (a: any) => a.path === `/complaints/${complaint._id.toString()}`,
    );
    expect(detailAction).toBeDefined();
  });
});
