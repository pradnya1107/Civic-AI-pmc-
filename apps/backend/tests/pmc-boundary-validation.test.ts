import { describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { isWithinPmcBoundary, PMC_BOUNDARY } from "../src/modules/complaints/complaint.validation";

const defaultPassword = "SecurePassword#123!";

async function createCitizen(email: string) {
  return User.create({
    fullName: "PMC Resident",
    email,
    passwordHash: await bcrypt.hash(defaultPassword, 4),
    role: "CITIZEN",
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

describe("Phase 4: Map Correction & Pune Municipal Corporation (PMC) Boundary Validation", () => {
  describe("PMC Boundary Helper Function", () => {
    it("correctly identifies coordinates within and outside PMC municipal boundaries", () => {
      // Valid PMC locations
      expect(isWithinPmcBoundary(18.5204, 73.8567)).toBe(true); // Shivajinagar
      expect(isWithinPmcBoundary(18.5074, 73.8077)).toBe(true); // Kothrud
      expect(isWithinPmcBoundary(18.5089, 73.9259)).toBe(true); // Hadapsar

      // Invalid locations outside PMC
      expect(isWithinPmcBoundary(19.0760, 72.8777)).toBe(false); // Mumbai
      expect(isWithinPmcBoundary(28.6139, 77.2090)).toBe(false); // Delhi
      expect(isWithinPmcBoundary(18.2500, 73.8500)).toBe(false); // Too far South of Pune
      expect(isWithinPmcBoundary(18.7500, 73.8500)).toBe(false); // Too far North of Pune
    });
  });

  describe("Complaint Creation Coordinate Enforcement", () => {
    it("accepts complaint with valid coordinates within Pune municipal limits", async () => {
      const citizen = await createCitizen("citizen-pune-valid@example.com");
      const token = await signIn(citizen.email);

      const response = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Pothole on FC Road Pune",
          description: "Multiple potholes near Ferguson College gate causing traffic snarls.",
          category: "Roads & Potholes",
          location: {
            address: "FC Road, Shivajinagar, Pune",
            latitude: 18.5204,
            longitude: 73.8567,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.complaint.location.latitude).toBe(18.5204);
      expect(response.body.data.complaint.location.longitude).toBe(73.8567);
    });

    it("rejects complaint coordinates outside PMC municipal boundary with clear 400 error", async () => {
      const citizen = await createCitizen("citizen-mumbai-coords@example.com");
      const token = await signIn(citizen.email);

      // Coordinates in Mumbai (19.0760, 72.8777)
      const response = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Complaint with Mumbai coordinates",
          description: "Reporting issue with invalid coordinates outside Pune jurisdiction.",
          category: "Roads & Potholes",
          location: {
            address: "Marine Drive, Mumbai",
            latitude: 19.0760,
            longitude: 72.8777,
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      const errMsg = response.body.error?.message || response.body.message || JSON.stringify(response.body);
      expect(errMsg).toContain("Pune Municipal Corporation (PMC) boundary");
    });
  });
});
