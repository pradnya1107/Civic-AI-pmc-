import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Health Check API", () => {
  it("GET /api/v1/health returns 200 with success and running message", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: "CivicAI API is running",
      server: "running",
    });
  });

  it("GET / returns 200 welcome message", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
