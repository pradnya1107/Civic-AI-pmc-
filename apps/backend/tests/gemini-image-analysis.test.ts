import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Complaint } from "../src/modules/complaints/complaint.model";
import { analyzeComplaint, verifyResolution } from "../src/modules/ai/gemini-ai.service";

const defaultPassword = "SecurePassword#123!";

async function createVerifiedCitizen(email: string) {
  return User.create({
    fullName: "Civic Pune Citizen",
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

// Sample 1x1 test image fixtures for JPG, PNG, and WebP
const PNG_IMAGE_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const JPEG_IMAGE_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
const WEBP_IMAGE_DATA_URL = "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2QAA";
const RAW_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("CivicAI Multimodal Gemini Image Analysis Feature", () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-mock-gemini-api-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    vi.restoreAllMocks();
  });

  describe("1. Real Photograph Analysis", () => {
    it("identifies civic defects in real camera photos and returns separate authenticity assessment with disclaimer", async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    civicIssue: {
                      detectedCivicIssue: "Deep Road Surface Pothole",
                      category: "Roads & Potholes",
                      suggestedTitle: "Severe Asphalt Pothole on Carriageway",
                      visibleEvidence: "Visible asphalt cavity with loose aggregate, approx 10cm depth, creating direct hazard for two-wheelers.",
                      severity: "HIGH",
                      confidenceScore: 92,
                      suggestedDepartment: "Roads",
                      detectedIssues: ["Pothole", "Road Damage", "Traffic Hazard"],
                    },
                    authenticityAssessment: {
                      possibleAiGenerated: false,
                      confidence: "HIGH",
                      indicators: ["Realistic sensor noise", "Natural optical camera depth of field", "Consistent directional sunlight shadows"],
                      disclaimer: "Visual appearance alone cannot definitively prove an image's origin; this assessment is an automated heuristic and should be verified independently if questioned.",
                    },
                    manualReviewNeeded: false,
                    manualReviewReason: "Clear photographic evidence of road defect with high confidence.",
                  }),
                },
              ],
            },
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGeminiResponse,
      });

      const citizen = await createVerifiedCitizen("real-photo-test@example.com");
      const token = await signIn(citizen.email);

      const response = await request(app)
        .post("/api/v1/ai/analyze-complaint")
        .set("Authorization", `Bearer ${token}`)
        .send({
          imageBase64: PNG_IMAGE_DATA_URL,
          title: "Road issue",
          description: "Big pothole on the road",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      // Structured results verification
      expect(data.detectedCivicIssue).toBe("Deep Road Surface Pothole");
      expect(data.category).toBe("Roads & Potholes");
      expect(data.suggestedTitle).toBe("Severe Asphalt Pothole on Carriageway");
      expect(data.visibleEvidence).toContain("Visible asphalt cavity");
      expect(data.severity).toBe("HIGH");
      expect(data.confidenceScore).toBe(92);
      expect(data.manualReviewNeeded).toBe(false);

      // Separate Authenticity Assessment
      expect(data.authenticityAssessment).toBeDefined();
      expect(data.authenticityAssessment.possibleAiGenerated).toBe(false);
      expect(data.authenticityAssessment.confidence).toBe("HIGH");
      expect(data.authenticityAssessment.indicators).toEqual(
        expect.arrayContaining(["Realistic sensor noise"]),
      );
      expect(data.authenticityAssessment.disclaimer).toContain(
        "Visual appearance alone cannot definitively prove an image's origin",
      );
    });
  });

  describe("2. AI-Generated Civic Issue Image Analysis & Non-Rejection Policy", () => {
    it("recognizes civic defects in AI-generated images without rejecting complaints, flagging for manual review", async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    civicIssue: {
                      detectedCivicIssue: "Overflowing Solid Waste Dump",
                      category: "Solid Waste & Garbage",
                      suggestedTitle: "Overflowing Garbage Pile Near Pedestrian Walkway",
                      visibleEvidence: "Uncollected municipal refuse pile spilling onto pavement, including plastic packaging and organic waste.",
                      severity: "HIGH",
                      confidenceScore: 88,
                      suggestedDepartment: "Waste",
                      detectedIssues: ["Garbage Accumulation", "Sanitation Hazard"],
                    },
                    authenticityAssessment: {
                      possibleAiGenerated: true,
                      confidence: "MEDIUM",
                      indicators: [
                        "Unnaturally smooth texture gradients in garbage debris",
                        "Inconsistent ambient occlusion lighting",
                        "Generative diffusion synthesis artifacts",
                      ],
                      disclaimer: "Visual appearance alone cannot definitively prove an image's origin; this assessment is an automated heuristic and should be verified independently if questioned.",
                    },
                    manualReviewNeeded: true,
                    manualReviewReason: "Image exhibits cues of possible AI synthesis; marked for on-site municipal field verification.",
                  }),
                },
              ],
            },
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGeminiResponse,
      });

      const citizen = await createVerifiedCitizen("ai-generated-test@example.com");
      const token = await signIn(citizen.email);

      // 1. Analyze the AI-generated image
      const analyzeRes = await request(app)
        .post("/api/v1/ai/analyze-complaint")
        .set("Authorization", `Bearer ${token}`)
        .send({
          imageBase64: WEBP_IMAGE_DATA_URL,
        });

      expect(analyzeRes.status).toBe(200);
      const aiData = analyzeRes.body.data;

      // Both assessments are cleanly separated
      expect(aiData.detectedCivicIssue).toBe("Overflowing Solid Waste Dump");
      expect(aiData.category).toBe("Solid Waste & Garbage");
      expect(aiData.authenticityAssessment.possibleAiGenerated).toBe(true);
      expect(aiData.manualReviewNeeded).toBe(true);
      expect(aiData.authenticityAssessment.disclaimer).toContain(
        "Visual appearance alone cannot definitively prove an image's origin",
      );

      // 2. Submit complaint with the AI-generated image & analysis (Requirement 8: NEVER reject!)
      const complaintRes = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: aiData.suggestedTitle,
          description: `Citizen report: ${aiData.visibleEvidence}`,
          category: aiData.category,
          priority: aiData.severity,
          imageUrl: WEBP_IMAGE_DATA_URL,
          location: { address: "Kothrud Ward 12, Pune" },
          aiAnalysis: aiData,
        });

      // Must succeed with 201 Created and status SUBMITTED (NOT rejected!)
      expect(complaintRes.status).toBe(201);
      expect(complaintRes.body.success).toBe(true);

      const createdComplaint = complaintRes.body.data.complaint;
      expect(createdComplaint).toBeDefined();

      const savedComplaint = await Complaint.findById(createdComplaint._id);
      expect(savedComplaint).not.toBeNull();
      expect(savedComplaint?.status).toBe("SUBMITTED");
      expect(savedComplaint?.aiAnalysis?.manualReviewNeeded).toBe(true);
      expect(savedComplaint?.aiAnalysis?.authenticityAssessment?.possibleAiGenerated).toBe(true);
      expect(savedComplaint?.aiAnalysis?.authenticityAssessment?.disclaimer).toBeDefined();
    });
  });

  describe("3. Unrelated Image Analysis (No Civic Issue)", () => {
    it("flags unrelated non-civic images for manual review with low confidence", async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    civicIssue: {
                      detectedCivicIssue: "No Visible Civic Issue",
                      category: "Other Civic Grievance",
                      suggestedTitle: "Unverified Image Submission",
                      visibleEvidence: "Image depicts an indoor domestic pet on furniture; no municipal defect or civic hazard observed.",
                      severity: "LOW",
                      confidenceScore: 15,
                      suggestedDepartment: "General Administration",
                      detectedIssues: [],
                    },
                    authenticityAssessment: {
                      possibleAiGenerated: false,
                      confidence: "HIGH",
                      indicators: ["Natural camera sensor characteristics"],
                      disclaimer: "Visual appearance alone cannot definitively prove an image's origin; this assessment is an automated heuristic and should be verified independently if questioned.",
                    },
                    manualReviewNeeded: true,
                    manualReviewReason: "No evident civic issue identified in image; officer review needed to verify grievance authenticity.",
                  }),
                },
              ],
            },
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGeminiResponse,
      });

      const result = await analyzeComplaint({
        imageBase64: JPEG_IMAGE_DATA_URL,
      });

      expect(result.detectedCivicIssue).toBe("No Visible Civic Issue");
      expect(result.category).toBe("Other Civic Grievance");
      expect(result.manualReviewNeeded).toBe(true);
      expect(result.confidenceScore).toBeLessThan(40);
      expect(result.authenticityAssessment.disclaimer).toContain(
        "Visual appearance alone cannot definitively prove an image's origin",
      );
    });
  });

  describe("4. Ambiguous and Digitally Edited Images", () => {
    it("treats AI detection as uncertain assessment and separates defect detection from authenticity", async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    civicIssue: {
                      detectedCivicIssue: "Damaged Streetlight Fixture",
                      category: "Street Lighting & Electrical",
                      suggestedTitle: "Broken Public Lamp Fixture",
                      visibleEvidence: "Streetlight fixture with fractured casing and exposed internal wiring.",
                      severity: "MEDIUM",
                      confidenceScore: 74,
                      suggestedDepartment: "Street Lighting",
                      detectedIssues: ["Broken Luminaire", "Exposed Wire"],
                    },
                    authenticityAssessment: {
                      possibleAiGenerated: true,
                      confidence: "LOW",
                      indicators: ["Heavy compression blur and localized filtering; inconclusive origin."],
                      disclaimer: "Visual appearance alone cannot definitively prove an image's origin; this assessment is an automated heuristic and should be verified independently if questioned.",
                    },
                    manualReviewNeeded: true,
                    manualReviewReason: "Ambiguous compression artifacts; field inspection recommended.",
                  }),
                },
              ],
            },
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGeminiResponse,
      });

      const result = await analyzeComplaint({
        imageBase64: RAW_PNG_BASE64,
      });

      // Defect is recognized
      expect(result.detectedCivicIssue).toBe("Damaged Streetlight Fixture");
      expect(result.category).toBe("Street Lighting & Electrical");

      // Authenticity is marked uncertain (LOW confidence) with disclaimer
      expect(result.authenticityAssessment.possibleAiGenerated).toBe(true);
      expect(result.authenticityAssessment.confidence).toBe("LOW");
      expect(result.authenticityAssessment.disclaimer).toContain(
        "Visual appearance alone cannot definitively prove an image's origin",
      );
      expect(result.manualReviewNeeded).toBe(true);
    });
  });

  describe("5. Location & Timestamp Guardrails", () => {
    it("never invents or hallucinates location details when address is omitted", async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    civicIssue: {
                      detectedCivicIssue: "Waterlogging & Drainage Choke",
                      category: "Drainage & Sewerage",
                      suggestedTitle: "Waterlogging Due to Blocked Storm Drain",
                      visibleEvidence: "Standing rainwater accumulating over roadway due to silt-covered curb drain.",
                      severity: "HIGH",
                      confidenceScore: 86,
                      suggestedDepartment: "Drainage",
                      detectedIssues: ["Storm Drain Choke", "Street Waterlogging"],
                    },
                    authenticityAssessment: {
                      possibleAiGenerated: false,
                      confidence: "HIGH",
                      indicators: ["Real camera capture textures"],
                      disclaimer: "Visual appearance alone cannot definitively prove an image's origin; this assessment is an automated heuristic and should be verified independently if questioned.",
                    },
                    manualReviewNeeded: false,
                    manualReviewReason: "Clear defect photo.",
                  }),
                },
              ],
            },
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGeminiResponse,
      });

      // Call without any user address
      const result = await analyzeComplaint({
        imageBase64: PNG_IMAGE_DATA_URL,
      });

      expect(result.suggestedTitle).not.toContain("FC Road");
      expect(result.suggestedTitle).not.toContain("Shivajinagar");
      expect(result.visibleEvidence).not.toMatch(/\b(Monday|Tuesday|202[0-9]|Ward\s*\d+)\b/);
    });
  });

  describe("6. Format Handling: JPG, JPEG, PNG, WebP & Raw Base64", () => {
    it("accepts and processes data URLs and raw base64 across supported formats", async () => {
      let sentMimeType = "";

      globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
        const body = JSON.parse(options?.body as string);
        sentMimeType = body?.contents?.[0]?.parts?.[0]?.inlineData?.mimeType;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        civicIssue: {
                          detectedCivicIssue: "Pothole Defect",
                          category: "Roads & Potholes",
                          suggestedTitle: "Road Pothole",
                          visibleEvidence: "Road defect.",
                          severity: "HIGH",
                          confidenceScore: 85,
                          suggestedDepartment: "Roads",
                          detectedIssues: ["Pothole"],
                        },
                        authenticityAssessment: {
                          possibleAiGenerated: false,
                          confidence: "MEDIUM",
                          indicators: ["Natural noise"],
                          disclaimer: "Visual appearance alone cannot definitively prove an image's origin; this assessment is an automated heuristic and should be verified independently if questioned.",
                        },
                        manualReviewNeeded: false,
                        manualReviewReason: "Verified.",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        };
      });

      // Test WebP
      await analyzeComplaint({ imageBase64: WEBP_IMAGE_DATA_URL });
      expect(sentMimeType).toBe("image/webp");

      // Test JPEG
      await analyzeComplaint({ imageBase64: JPEG_IMAGE_DATA_URL });
      expect(sentMimeType).toBe("image/jpeg");

      // Test PNG
      await analyzeComplaint({ imageBase64: PNG_IMAGE_DATA_URL });
      expect(sentMimeType).toBe("image/png");

      // Test Raw base64 PNG (starts with iVBORw0KGgo)
      await analyzeComplaint({ imageBase64: RAW_PNG_BASE64 });
      expect(sentMimeType).toBe("image/png");
    });
  });

  describe("7. Citizen Review and Edit Before Submission", () => {
    it("allows citizen to modify AI-generated details before submission while preserving authenticity assessment", async () => {
      const citizen = await createVerifiedCitizen("citizen-edit-flow@example.com");
      const token = await signIn(citizen.email);

      // Citizen reviews AI analysis and modifies Title and Priority
      const submissionPayload = {
        title: "Major Cavity Near School Gate (Citizen Modified Title)",
        description: "Citizen customized description: Deep crater right where school buses turn.",
        category: "Roads & Potholes",
        priority: "CRITICAL", // Citizen escalated from HIGH to CRITICAL
        location: { address: "Prabhat Road Lane 4, Pune" },
        imageUrl: PNG_IMAGE_DATA_URL,
        aiAnalysis: {
          detectedCivicIssue: "Deep Road Surface Pothole",
          category: "Roads & Potholes",
          severity: "HIGH",
          confidenceScore: 90,
          visibleEvidence: "Cavity visible on road surface.",
          manualReviewNeeded: false,
          authenticityAssessment: {
            possibleAiGenerated: false,
            confidence: "HIGH",
            indicators: ["Consistent camera optics"],
            disclaimer: "Visual appearance alone cannot definitively prove an image's origin; this assessment is an automated heuristic and should be verified independently if questioned.",
          },
        },
      };

      const response = await request(app)
        .post("/api/v1/complaints")
        .set("Authorization", `Bearer ${token}`)
        .send(submissionPayload);

      expect(response.status).toBe(201);
      expect(response.body.data.complaint.title).toBe("Major Cavity Near School Gate (Citizen Modified Title)");
      expect(response.body.data.complaint.priority).toBe("CRITICAL");
      expect(response.body.data.complaint.aiAnalysis.detectedCivicIssue).toBe("Deep Road Surface Pothole");
    });
  });

  describe("8. Field Officer Resolution Photo AI Authenticity Inspection", () => {
    it("recognizes an authentic real camera repair photo as AUTHENTIC_REAL_PHOTO", async () => {
      const result = await verifyResolution({
        originalImageUrl: "https://images.unsplash.com/original-pothole.jpg",
        resolutionImageUrl: "https://images.unsplash.com/camera-repair-asphalt.jpg",
        title: "Pothole on FC Road",
        category: "Roads & Potholes",
      });

      expect(result.authenticityAssessment).toBeDefined();
      expect(result.authenticityAssessment.isAiGenerated).toBe(false);
      expect(result.authenticityAssessment.possibleAiGenerated).toBe(false);
      expect(result.authenticityAssessment.assessment).toBe("AUTHENTIC_REAL_PHOTO");
      expect(result.authenticityAssessment.indicators.length).toBeGreaterThan(0);
      expect(result.authenticityAssessment.explanation).toContain("authentic");
    });

    it("recognizes an AI-generated resolution photo and flags as POSSIBLE_AI_GENERATED", async () => {
      const result = await verifyResolution({
        originalImageUrl: "https://images.unsplash.com/original-pothole.jpg",
        resolutionImageUrl: "https://images.unsplash.com/ai-generated-synthetic-road-repair.png",
        title: "Pothole on FC Road",
        category: "Roads & Potholes",
      });

      expect(result.authenticityAssessment).toBeDefined();
      expect(result.authenticityAssessment.isAiGenerated).toBe(true);
      expect(result.authenticityAssessment.possibleAiGenerated).toBe(true);
      expect(result.authenticityAssessment.assessment).toBe("POSSIBLE_AI_GENERATED");
      expect(result.authenticityAssessment.explanation).toMatch(/AI vision forensic scan|synthetic|diffusion/i);
    });
  });
});
