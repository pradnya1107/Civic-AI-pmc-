import { Types } from "mongoose";
import { Complaint, type ComplaintRecord, type ComplaintPriority } from "./complaint.model";
import { AppError } from "../../utils/app-error";
import { AuditLog } from "../audit/auditLog.model";
import { Notification } from "../notifications/notification.model";

export interface DuplicateCheckParams {
  category?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  title?: string;
}

export interface DuplicateMatch {
  id: string;
  complaintNumber: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  distanceMeters?: number;
  similarityScore: number;
  address: string;
  supportCount: number;
  createdAt: Date;
}

/**
 * Calculate distance in meters between two lat/lng points using Haversine formula
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Tokenize string into significant keywords
 */
function extractKeywords(str: string): Set<string> {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "is", "near", "road", "pune", "pmc", "area", "lane", "street", "corner",
  ]);
  const words = str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  return new Set(words);
}

/**
 * Compute keyword Jaccard overlap similarity (0 to 100)
 */
function computeKeywordSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

/**
 * Smart Duplicate Complaint Detection
 */
export async function findDuplicateComplaints(
  params: DuplicateCheckParams,
): Promise<{ duplicates: DuplicateMatch[]; count: number }> {
  // Query active, non-closed complaints
  const activeComplaints = await Complaint.find({
    status: { $in: ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS"] },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const queryKeywords = extractKeywords(`${params.title || ""} ${params.address || ""}`);
  const matches: DuplicateMatch[] = [];

  for (const complaint of activeComplaints) {
    let distance: number | undefined;
    let distanceScore = 0;

    // Check geospatial proximity if coordinates are available
    if (
      params.latitude !== undefined &&
      params.longitude !== undefined &&
      complaint.location?.latitude !== undefined &&
      complaint.location?.longitude !== undefined
    ) {
      distance = calculateHaversineDistanceMeters(
        params.latitude,
        params.longitude,
        complaint.location.latitude,
        complaint.location.longitude,
      );

      if (distance <= 150) {
        distanceScore = 55;
      } else if (distance <= 350) {
        distanceScore = 40;
      } else if (distance <= 600) {
        distanceScore = 25;
      }
    }

    // Category match
    const categoryMatches =
      params.category &&
      complaint.category &&
      (complaint.category.toLowerCase().includes(params.category.toLowerCase()) ||
        params.category.toLowerCase().includes(complaint.category.toLowerCase()));
    const categoryScore = categoryMatches ? 30 : 0;

    // Keyword similarity on title + address
    const candidateKeywords = extractKeywords(`${complaint.title} ${complaint.location?.address || ""}`);
    const textScore = computeKeywordSimilarity(queryKeywords, candidateKeywords) * 0.35;

    const totalSimilarity = Math.min(100, Math.round(distanceScore + categoryScore + textScore));

    // If similarity >= 50% or within 200m of same category, flag as potential duplicate
    if (totalSimilarity >= 50 || (distance !== undefined && distance <= 250 && categoryMatches)) {
      matches.push({
        id: complaint._id.toString(),
        complaintNumber: complaint.complaintNumber,
        title: complaint.title,
        category: complaint.category,
        status: complaint.status,
        priority: complaint.priority,
        distanceMeters: distance,
        similarityScore: totalSimilarity,
        address: complaint.location?.address || "Pune",
        supportCount: complaint.supportCount || 0,
        createdAt: complaint.createdAt,
      });
    }
  }

  // Sort descending by similarity score
  matches.sort((a, b) => b.similarityScore - a.similarityScore);

  return {
    duplicates: matches.slice(0, 5),
    count: matches.length,
  };
}

/**
 * Community Support / Upvote Complaint
 */
export async function supportComplaint(
  citizenId: string,
  complaintId: string,
): Promise<{ complaint: any; alreadySupported: boolean; message: string }> {
  const cObjectId = new Types.ObjectId(complaintId);
  const uObjectId = new Types.ObjectId(citizenId);

  const existing = await Complaint.findById(cObjectId);
  if (!existing) {
    throw new AppError("Complaint not found.", 404, "COMPLAINT_NOT_FOUND");
  }

  const supporters = existing.supporters || [];
  const alreadySupported = supporters.some((id) => id.toString() === citizenId);

  if (alreadySupported) {
    return {
      complaint: existing.toJSON(),
      alreadySupported: true,
      message: "You have already supported this civic complaint.",
    };
  }

  // Add supporter and increment count
  supporters.push(uObjectId);
  const newCount = supporters.length;
  existing.supporters = supporters;
  existing.supportCount = newCount;

  // Auto-escalation threshold:
  // If support count >= 10, escalate to CRITICAL
  // If support count >= 5 and was MEDIUM, escalate to HIGH
  let escalatedPriority: ComplaintPriority | undefined;
  if (newCount >= 10 && existing.priority !== "CRITICAL") {
    escalatedPriority = "CRITICAL";
    existing.priority = "CRITICAL";
  } else if (newCount >= 5 && existing.priority === "MEDIUM") {
    escalatedPriority = "HIGH";
    existing.priority = "HIGH";
  }

  await existing.save();

  // Audit log support
  await AuditLog.create({
    actorRef: uObjectId,
    action: "STATUS_UPDATE",
    targetRef: existing._id,
    targetModel: "Complaint",
    metadata: {
      type: "COMMUNITY_SUPPORT",
      supportCount: newCount,
      complaintNumber: existing.complaintNumber,
      autoEscalatedPriority: escalatedPriority,
    },
  });

  // Notify original complainant
  if (existing.citizenId.toString() !== citizenId) {
    await Notification.create({
      recipientId: existing.citizenId,
      complaintId: existing._id,
      type: "COMPLAINT_UPDATED",
      title: "Community Backing Received",
      message: `Your complaint has now received support from ${newCount} citizens.${escalatedPriority ? ` Municipal priority automatically escalated to ${escalatedPriority}.` : ""}`,
    });
  }

  return {
    complaint: existing.toJSON(),
    alreadySupported: false,
    message: `Thank you for supporting this issue. Total community supporters: ${newCount}.${escalatedPriority ? ` Priority escalated to ${escalatedPriority}!` : ""}`,
  };
}
