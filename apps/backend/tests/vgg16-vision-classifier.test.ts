import { describe, it, expect } from "vitest";
import { classifyWithVgg16 } from "../src/modules/ai/vgg16-classifier.service";

describe("VGG-16 Deep Vision Classifier Service", () => {
  it("should classify road pothole defect with high confidence", async () => {
    const result = await classifyWithVgg16({
      imageUrl: "https://images.unsplash.com/photo-pothole-road-defect.jpg",
    });

    expect(result).toBeDefined();
    expect(result.model).toContain("VGG-16");
    expect(result.isCivicIssue).toBe(true);
    expect(result.detectedClass).toBe("POTHOLE");
    expect(result.category).toBe("Roads & Potholes");
    expect(result.suggestedDepartment).toBe("Roads & Transportation");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it("should detect garbage dump defect and route to Solid Waste Management", async () => {
    const result = await classifyWithVgg16({
      imageUrl: "https://images.unsplash.com/photo-garbage-dump-overflow.jpg",
    });

    expect(result).toBeDefined();
    expect(result.isCivicIssue).toBe(true);
    expect(result.detectedClass).toBe("GARBAGE_DUMP");
    expect(result.category).toBe("Garbage & Waste Management");
    expect(result.suggestedDepartment).toBe("Solid Waste Management");
  });

  it("should strictly reject non-civic documents, invoices, and receipts", async () => {
    const result = await classifyWithVgg16({
      imageUrl: "https://images.unsplash.com/photo-restaurant-invoice-receipt.jpg",
    });

    expect(result).toBeDefined();
    expect(result.isCivicIssue).toBe(false);
    expect(result.detectedClass).toBe("NON_CIVIC_DOCUMENT");
    expect(result.rejectionReason).toMatch(/non-civic/i);
  });

  it("should handle empty inputs gracefully without crashing", async () => {
    const result = await classifyWithVgg16({});

    expect(result).toBeDefined();
    expect(result.isCivicIssue).toBe(true);
    expect(result.detectedClass).toBe("UNKNOWN");
  });
});
