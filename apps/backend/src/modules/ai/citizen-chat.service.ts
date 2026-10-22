import { Types } from "mongoose";
import { z } from "zod";
import { Complaint, type ComplaintRecord } from "../complaints/complaint.model";
import { Department } from "../departments/department.model";

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty").max(1000, "Message cannot exceed 1000 characters"),
  conversationId: z.string().trim().max(100).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(1000),
      }),
    )
    .max(10)
    .optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export interface ChatAction {
  label: string;
  path?: string;
  action?: string;
  text?: string;
  variant?: "primary" | "secondary" | "outline";
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
  suggestedActions: ChatAction[];
  provider: "gemini" | "heuristic_fallback";
  timestamp: string;
}

// Verified municipal department knowledge base
const PMC_DEPARTMENTS_INFO: Record<string, { name: string; category: string; description: string; slaHours: number; helpline: string }> = {
  roads: {
    name: "Roads & Infrastructure",
    category: "Roads & Potholes",
    description: "Repairs potholes, damaged road asphalt, missing manhole covers, and road dividers.",
    slaHours: 48,
    helpline: "020-25501000",
  },
  waste: {
    name: "Solid Waste Management",
    category: "Solid Waste & Garbage",
    description: "Cleans unattended garbage dumps, overflowing community bins, and illegal debris disposal.",
    slaHours: 24,
    helpline: "9689900002 (WhatsApp)",
  },
  water: {
    name: "Water Supply Department",
    category: "Water Supply",
    description: "Handles broken water mains, pipeline leaks, low water pressure, and contaminated water reports.",
    slaHours: 24,
    helpline: "020-25501383",
  },
  drainage: {
    name: "Drainage & Sewerage",
    category: "Drainage & Sewerage",
    description: "Clears choked gutters, storm water drainage overflows, and backflow into residential streets.",
    slaHours: 24,
    helpline: "020-25501269",
  },
  lighting: {
    name: "Street Lighting & Electrical",
    category: "Street Lighting & Electrical",
    description: "Repairs non-functional streetlights, faulty timers, exposed cables, and damaged lighting poles.",
    slaHours: 48,
    helpline: "1800-1030-222",
  },
  health: {
    name: "Public Health & Sanitation",
    category: "Health & Sanitation",
    description: "Conducts mosquito fogging, public toilet sanitation, and disease vector control.",
    slaHours: 48,
    helpline: "1800-1030-222",
  },
};

const PMC_SYSTEM_PROMPT = `You are "CivicAI Assistant", an official smart civic support AI for Pune Municipal Corporation (PMC).
Your mission is to help Pune citizens report civic issues, track complaint statuses, identify the responsible PMC municipal department, and find relevant platform features.

STRICT SAFETY AND CIVIC SERVICE RULES:
1. NEVER claim a complaint has been registered, filed, or resolved by chatting with you. Citizens MUST submit complaints through the official grievance submission form (/complaints/new).
2. NEVER invent fake complaint IDs, officer names, or unverified SLAs.
3. Be courteous, concise, and helpful. Format your responses with clean bullet points or short paragraphs where appropriate.
4. If a citizen asks how to report an issue, explain the steps (Title, Category, Address, optional photo) and point them to the Report Issue button.
5. If an issue is an emergency (flooding, open live electrical wires, major pipeline burst), urge calling the PMC 24x7 Emergency Helpline: 1800-1030-222 or Disaster Cell 020-25501269.
6. Available citizen routes:
   - Report Grievance: /complaints/new
   - My Complaints List: /complaints
   - Pune Civic Heatmap: /heatmap
   - Citizen Dashboard: /dashboard`;

function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

type LeanComplaint = ComplaintRecord & { _id: Types.ObjectId };

/**
 * Handle complaint-tracking queries from authenticated or unauthenticated citizens
 */
async function handleComplaintTracking(
  message: string,
  citizenUser?: { id: string | Types.ObjectId; role: string; name?: string },
): Promise<{ reply: string; actions: ChatAction[] } | null> {
  // Check if message looks like a status query
  const isStatusQuery = /\b(status|track|check|progress|update|what happened|complaint\s*#?|ticket)\b/i.test(message);
  if (!isStatusQuery) {
    return null;
  }

  // Extract possible complaint reference or ID from message
  const idMatch = message.match(/\b([0-9a-fA-F]{24})\b/) || message.match(/\b(PMC-[A-Z0-9-]+)\b/i);

  if (idMatch) {
    const rawId = idMatch[1];
    let query: Record<string, unknown>;

    if (Types.ObjectId.isValid(rawId)) {
      query = { _id: new Types.ObjectId(rawId) };
    } else {
      query = { complaintNumber: rawId.toUpperCase() };
    }

    const complaint = await Complaint.findOne(query).lean<LeanComplaint>();

    if (!complaint) {
      return {
        reply: `I could not find any grievance matching reference identifier **${rawId}**. Please double-check your complaint number or browse your registered complaints list in [My Complaints](/complaints).`,
        actions: [{ label: "View My Complaints", path: "/complaints" }],
      };
    }

    // Authorization check: Citizen can only view their own complaint details
    if (citizenUser) {
      const isOwner = complaint.citizenId.toString() === citizenUser.id.toString();
      const isAdmin = ["SUPER_ADMIN", "ADMIN", "DEPARTMENT_ADMIN"].includes(citizenUser.role?.toUpperCase());

      if (!isOwner && !isAdmin) {
        return {
          reply: `For citizen data privacy and municipal security standards, details for complaint **${rawId}** cannot be disclosed because it was filed by another citizen. You can only view complaints associated with your account.`,
          actions: [{ label: "View My Complaints", path: "/complaints" }],
        };
      }
    } else {
      // Unauthenticated user attempting to query a specific complaint
      return {
        reply: `A complaint record was found for **${rawId}**. To view sensitive status updates, assigned officer details, and resolution evidence, please log in with the citizen account that registered it.`,
        actions: [
          { label: "Log In to View", path: "/login", variant: "primary" },
          { label: "Report New Issue", path: "/complaints/new" },
        ],
      };
    }

    // User is authorized: Return real complaint status
    const officerName = complaint.assignedOfficer?.name || "Officer assignment in progress";
    const slaText = complaint.slaDeadline
      ? new Date(complaint.slaDeadline).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Standard PMC SLA";

    return {
      reply: `📋 **Grievance Status Record:**
• **Title:** ${complaint.title}
• **Tracking ID:** ${complaint.complaintNumber || complaint._id.toString()}
• **Category:** ${complaint.category}
• **Current Status:** **${complaint.status}**
• **Priority:** ${complaint.priority}
• **Field Officer:** ${officerName}
• **Target SLA Resolution:** ${slaText}

You can view full progress history, photos, and post-resolution confirmation on the complaint details page.`,
      actions: [
        { label: "Open Complaint Details", path: `/complaints/${complaint._id.toString()}`, variant: "primary" },
        { label: "All Complaints", path: "/complaints" },
      ],
    };
  }

  // If citizen is authenticated and asking generally about their complaints
  if (citizenUser && citizenUser.id) {
    const recentComplaints = await Complaint.find({ citizenId: new Types.ObjectId(citizenUser.id.toString()) })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean<LeanComplaint[]>();

    if (recentComplaints.length === 0) {
      return {
        reply: `You haven't submitted any civic complaints yet. If you have noticed an issue like a pothole, garbage overflow, or water leakage in Pune, you can report it easily!`,
        actions: [
          { label: "Report a Civic Issue", path: "/complaints/new", variant: "primary" },
          { label: "View City Heatmap", path: "/heatmap" },
        ],
      };
    }

    const items = recentComplaints
      .map(
        (c) =>
          `• **${c.title}** (${c.category})\n  Status: **${c.status}** | Tracking ID: \`${c.complaintNumber || c._id.toString()}\``,
      )
      .join("\n\n");

    return {
      reply: `Here are your recent registered grievances:\n\n${items}\n\nClick on any complaint below or open **My Complaints** to view the live timeline and photo evidence.`,
      actions: [
        { label: "Open My Complaints", path: "/complaints", variant: "primary" },
        { label: "Report New Issue", path: "/complaints/new" },
      ],
    };
  }

  // Not authenticated general query
  return {
    reply: `To check the status of your complaints, please sign in with your citizen account, or enter your specific **Complaint Reference ID** (e.g., \`PMC-...\`) in the chat.`,
    actions: [
      { label: "Sign In", path: "/login", variant: "primary" },
      { label: "Report an Issue", path: "/complaints/new" },
    ],
  };
}

/**
 * Deterministic rule-based civic heuristic fallback when Gemini API key is absent or unreachable
 */
function heuristicChatReply(message: string): { reply: string; actions: ChatAction[] } {
  const lower = message.toLowerCase().trim();

  // 1. Report an issue / How to report
  if (
    lower.includes("report") ||
    lower.includes("lodge") ||
    lower.includes("file") ||
    lower.includes("submit") ||
    lower.includes("new issue") ||
    lower.includes("grievance")
  ) {
    return {
      reply: `To report a civic grievance to Pune Municipal Corporation:

1. Click **"Report an Issue"** below or in the sidebar.
2. Enter a descriptive title and select the matching civic category (e.g. Roads & Potholes, Water Supply, Solid Waste).
3. Provide the street address or select your location on the map.
4. Optionally upload a photo of the defect (our Gemini AI will inspect and categorize it automatically).
5. Submit your complaint to receive a unique PMC tracking ID.

Would you like to start reporting now?`,
      actions: [
        { label: "Report an Issue", path: "/complaints/new", variant: "primary" },
        { label: "View City Heatmap", path: "/heatmap" },
      ],
    };
  }

  // 2. Department routing inquiries
  for (const [key, dept] of Object.entries(PMC_DEPARTMENTS_INFO)) {
    if (
      lower.includes(key) ||
      (key === "roads" && (lower.includes("pothole") || lower.includes("asphalt") || lower.includes("divider"))) ||
      (key === "waste" && (lower.includes("garbage") || lower.includes("trash") || lower.includes("dump") || lower.includes("dustbin"))) ||
      (key === "water" && (lower.includes("leak") || lower.includes("pipe") || lower.includes("contamination") || lower.includes("tanker"))) ||
      (key === "drainage" && (lower.includes("gutter") || lower.includes("sewer") || lower.includes("waterlog") || lower.includes("choke"))) ||
      (key === "lighting" && (lower.includes("streetlight") || lower.includes("dark") || lower.includes("lamp") || lower.includes("pole") || lower.includes("electric"))) ||
      (key === "health" && (lower.includes("mosquito") || lower.includes("fogging") || lower.includes("sanitation") || lower.includes("dengue")))
    ) {
      return {
        reply: `🏛️ **Department Guidance:**
• **Responsible Department:** ${dept.name}
• **PMC Category:** ${dept.category}
• **Scope:** ${dept.description}
• **Standard SLA:** Resolves within ~${dept.slaHours} hours under normal municipal operating conditions.
• **Direct Helpline:** ${dept.helpline}

You can file this under category **"${dept.category}"** for automatic priority dispatch to the ${dept.name} engineering team.`,
        actions: [
          { label: `Report ${dept.category}`, path: "/complaints/new", variant: "primary" },
          { label: "Browse Complaints", path: "/complaints" },
        ],
      };
    }
  }

  // 3. Pune Ward / Heatmap inquiry
  if (lower.includes("ward") || lower.includes("heatmap") || lower.includes("map") || lower.includes("area") || lower.includes("zone")) {
    return {
      reply: `CivicAI PMC features an interactive **City Civic Heatmap** showing active and resolved grievances across all 15 Pune Municipal Corporation administrative wards (including Shivajinagar, Kothrud, Aundh, Hadapsar, and Kasba).

You can explore high-density civic hotspots, severity filters, and nearby community reports.`,
      actions: [
        { label: "Open City Heatmap", path: "/heatmap", variant: "primary" },
        { label: "Report an Issue", path: "/complaints/new" },
      ],
    };
  }

  // 4. Helplines & Emergency
  if (lower.includes("helpline") || lower.includes("contact") || lower.includes("phone") || lower.includes("emergency") || lower.includes("call")) {
    return {
      reply: `📞 **Official Pune Municipal Corporation Helplines:**

• **PMC 24x7 Citizen Care (Toll-Free):** [1800-1030-222](tel:18001030222)
• **Disaster Management Cell (Monsoon/Flood):** [020-25501269](tel:02025501269)
• **Solid Waste & Potholes WhatsApp Desk:** [9689900002](tel:9689900002)
• **Central Water Supply Helpdesk:** [020-25501383](tel:02025501383)
• **Official PMC Portal:** https://pmc.gov.in`,
      actions: [
        { label: "Report Grievance", path: "/complaints/new", variant: "primary" },
        { label: "Go Dashboard", path: "/dashboard" },
      ],
    };
  }

  // 5. How it works / Platform guidance
  if (lower.includes("how") || lower.includes("help") || lower.includes("work") || lower.includes("about") || lower.includes("what can you do")) {
    return {
      reply: `👋 Welcome to **CivicAI Assistant**! I am here to assist Pune citizens with municipal services:

1. **Report Civic Defects:** Potholes, garbage accumulation, pipe leaks, dark streetlights, and drainage issues.
2. **Track Live Progress:** Monitor the assignment, field verification, and repair completion of your complaints.
3. **Department Identification:** Learn which municipal division oversees your specific concern.
4. **Resolution Verification:** Once repaired, review proof photos before confirming or disputing resolution.

What would you like to do right now?`,
      actions: [
        { label: "Report an Issue", path: "/complaints/new", variant: "primary" },
        { label: "Track My Complaints", path: "/complaints" },
        { label: "City Heatmap", path: "/heatmap" },
      ],
    };
  }

  // 6. Default Fallback
  return {
    reply: `I understand you are asking about: "${message.slice(0, 100)}".

I can assist you with reporting civic defects, checking complaint progress, finding the right municipal department, or connecting to PMC helpline desks. Choose an action below or let me know what issue you are experiencing.`,
    actions: [
      { label: "Report an Issue", path: "/complaints/new", variant: "primary" },
      { label: "Track My Complaints", path: "/complaints" },
      { label: "PMC Help", text: "What are the official PMC helpline numbers?" },
    ],
  };
}

/**
 * Main chat processing method with Gemini integration and deterministic fallback
 */
export async function processCitizenMessage(
  data: ChatRequest,
  citizenUser?: { id: string | Types.ObjectId; role: string; name?: string },
): Promise<ChatResponse> {
  const conversationId = data.conversationId || `conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = new Date().toISOString();

  // 1. First, check if this is a personal complaint tracking request
  try {
    const trackingResult = await handleComplaintTracking(data.message, citizenUser);
    if (trackingResult) {
      return {
        reply: trackingResult.reply,
        conversationId,
        suggestedActions: trackingResult.actions,
        provider: "heuristic_fallback",
        timestamp,
      };
    }
  } catch (err: any) {
    console.warn("[CitizenChat] Tracking lookup error:", err?.message);
  }

  // 2. If Gemini API key is available, call Google Gemini Vision / Chat
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      // Add conversation history if provided
      if (Array.isArray(data.history) && data.history.length > 0) {
        for (const turn of data.history.slice(-6)) {
          contents.push({
            role: turn.role === "assistant" ? "model" : "user",
            parts: [{ text: turn.content }],
          });
        }
      }

      // Add current message
      contents.push({
        role: "user",
        parts: [{ text: data.message }],
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: PMC_SYSTEM_PROMPT }],
            },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600,
            },
          }),
        },
      );

      if (response.ok) {
        const result: any = await response.json();
        const candidateText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && typeof candidateText === "string" && candidateText.trim()) {
          // Build suggested actions based on reply content
          const actions: ChatAction[] = [];
          const lower = candidateText.toLowerCase();

          if (lower.includes("/complaints/new") || lower.includes("report")) {
            actions.push({ label: "Report an Issue", path: "/complaints/new", variant: "primary" });
          }
          if (lower.includes("/complaints") || lower.includes("track")) {
            actions.push({ label: "View Complaints", path: "/complaints" });
          }
          if (lower.includes("/heatmap") || lower.includes("heatmap")) {
            actions.push({ label: "City Heatmap", path: "/heatmap" });
          }

          if (actions.length === 0) {
            actions.push({ label: "Report an Issue", path: "/complaints/new", variant: "primary" });
            actions.push({ label: "View Complaints", path: "/complaints" });
          }

          return {
            reply: candidateText.trim(),
            conversationId,
            suggestedActions: actions,
            provider: "gemini",
            timestamp,
          };
        }
      } else {
        console.warn(`[CitizenChat] Gemini returned HTTP ${response.status}. Using civic heuristic fallback.`);
      }
    } catch (apiErr: any) {
      console.warn("[CitizenChat] Gemini API call failed:", apiErr?.message);
    }
  }

  // 3. Fallback: Intelligent Civic Rule Heuristic
  const fallback = heuristicChatReply(data.message);
  return {
    reply: fallback.reply,
    conversationId,
    suggestedActions: fallback.actions,
    provider: "heuristic_fallback",
    timestamp,
  };
}
