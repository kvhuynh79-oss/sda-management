import { action, mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  callClaudeAPI,
  extractJSON,
  fuzzyMatch,
  daysUntil,
} from "./aiUtils";

// Type definitions
type QueryIntent =
  | "participant_plan_expiry"
  | "vacancies"
  | "overdue_maintenance"
  | "payment_status"
  | "document_expiry"
  | "property_summary"
  | "participant_info"
  | "general_question";

type ActionIntent =
  | "move_participant"
  | "create_maintenance"
  | "update_maintenance_status"
  | "record_payment"
  | "update_participant_status";

interface IntentResult {
  intent: QueryIntent | ActionIntent | "unknown";
  isAction: boolean;
  entities: {
    participantName?: string;
    propertyName?: string;
    dwellingName?: string;
    suburb?: string;
    daysAhead?: number;
    priority?: string;
    period?: string;
    // Action-specific entities
    maintenanceTitle?: string;
    maintenanceDescription?: string;
    maintenanceCategory?: string;
    maintenanceStatus?: string;
    maintenanceId?: string;
    paymentAmount?: number;
    paymentDate?: string;
    newStatus?: string;
  };
  confidence: number;
}

interface PendingAction {
  actionType: ActionIntent;
  description: string;
  params: Record<string, unknown>;
  requiresConfirmation: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// ==================== Intent Detection ====================

async function detectIntent(userMessage: string): Promise<IntentResult> {
  const systemPrompt = `You are an intent classifier for an SDA (Specialist Disability Accommodation) management system in Australia.

## QUERY INTENTS (read-only, information requests):
- "participant_plan_expiry" - Questions about when a participant's NDIS plan expires
- "vacancies" - Questions about available/vacant dwellings or rooms
- "overdue_maintenance" - Questions about overdue or pending maintenance requests
- "payment_status" - Questions about payments for a participant
- "document_expiry" - Questions about expiring documents
- "property_summary" - Questions about a specific property's details
- "participant_info" - Questions about a participant's details
- "general_question" - General questions about the system or SDA

## ACTION INTENTS (commands that modify data):
- "move_participant" - Move a participant to a different dwelling (e.g., "move Daniel to HPS House", "transfer Faith to Tregear")
- "create_maintenance" - Create a new maintenance request (e.g., "create maintenance for broken AC", "log a plumbing issue")
- "update_maintenance_status" - Update status of maintenance (e.g., "mark maintenance as completed", "set request #123 to in progress")
- "record_payment" - Record a new payment (e.g., "add payment for Andrew", "record $5000 payment")
- "update_participant_status" - Change participant status (e.g., "set Daniel as inactive", "mark Faith as moved out")

- "unknown" - Cannot determine intent

## Entity Extraction:
Extract any mentioned entities:
- participantName: Name of a participant
- propertyName: Name or address of a property
- dwellingName: Name of a specific dwelling (e.g., "HPS House", "Main House")
- suburb: Suburb name
- daysAhead: Number of days for expiry lookups
- priority: Maintenance priority (urgent, high, medium, low)
- period: Time period for payments
- maintenanceTitle: Title for new maintenance request
- maintenanceDescription: Description of the issue
- maintenanceCategory: Category (plumbing, electrical, appliances, building, grounds, safety, general)
- maintenanceStatus: Status to update to (reported, scheduled, in_progress, completed, cancelled)
- maintenanceId: ID or reference number of maintenance request
- paymentAmount: Amount for payment
- paymentDate: Date of payment
- newStatus: New status for participant (active, inactive, moved_out)

Respond with JSON only:
{
  "intent": "intent_type",
  "isAction": true/false,
  "entities": {
    "participantName": "string or null",
    "propertyName": "string or null",
    "dwellingName": "string or null",
    "suburb": "string or null",
    "daysAhead": number or null,
    "priority": "string or null",
    "period": "string or null",
    "maintenanceTitle": "string or null",
    "maintenanceDescription": "string or null",
    "maintenanceCategory": "string or null",
    "maintenanceStatus": "string or null",
    "maintenanceId": "string or null",
    "paymentAmount": number or null,
    "paymentDate": "string or null",
    "newStatus": "string or null"
  },
  "confidence": 0.0-1.0
}`;

  const response = await callClaudeAPI(
    systemPrompt,
    [{ role: "user", content: userMessage }],
    768
  );

  return extractJSON<IntentResult>(response);
}

// ==================== Internal Queries ====================

// Get participant plan expiry information
export const getParticipantPlanExpiry = internalQuery({
  args: { participantName: v.string() },
  handler: async (ctx, args) => {
    const participants = await ctx.db.query("participants").collect();

    // Find matching participant(s)
    const matches = participants.filter((p) =>
      fuzzyMatch(args.participantName, `${p.firstName} ${p.lastName}`)
    );

    if (matches.length === 0) {
      return { found: false, message: `No participant found matching "${args.participantName}"` };
    }

    const results = await Promise.all(
      matches.map(async (participant) => {
        const plan = await ctx.db
          .query("participantPlans")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .filter((q) => q.eq(q.field("planStatus"), "current"))
          .first();

        return {
          participant,
          plan,
          daysUntilExpiry: plan?.planEndDate ? daysUntil(plan.planEndDate) : null,
        };
      })
    );

    return { found: true, results };
  },
});

// Get vacancies
export const getVacancies = internalQuery({
  args: {
    propertyName: v.optional(v.string()),
    suburb: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let properties = await ctx.db.query("properties").collect();

    // Filter by property name or suburb if provided
    if (args.propertyName) {
      properties = properties.filter(
        (p) =>
          (p.propertyName && fuzzyMatch(args.propertyName!, p.propertyName)) ||
          fuzzyMatch(args.propertyName!, p.addressLine1)
      );
    }
    if (args.suburb) {
      properties = properties.filter((p) =>
        fuzzyMatch(args.suburb!, p.suburb)
      );
    }

    const vacancies = await Promise.all(
      properties.map(async (property) => {
        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .collect();

        const dwellingsWithOccupancy = await Promise.all(
          dwellings.map(async (dwelling) => {
            const participants = await ctx.db
              .query("participants")
              .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
              .filter((q) => q.eq(q.field("status"), "active"))
              .collect();

            const vacantSpots = dwelling.maxParticipants - participants.length;
            return {
              dwelling,
              occupants: participants.length,
              capacity: dwelling.maxParticipants,
              vacantSpots,
            };
          })
        );

        const totalVacant = dwellingsWithOccupancy.reduce(
          (sum, d) => sum + d.vacantSpots,
          0
        );

        return {
          property,
          dwellings: dwellingsWithOccupancy.filter((d) => d.vacantSpots > 0),
          totalVacant,
        };
      })
    );

    return vacancies.filter((v) => v.totalVacant > 0);
  },
});

// Get overdue/outstanding maintenance
export const getOverdueMaintenance = internalQuery({
  args: {
    propertyName: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    let requests = await ctx.db
      .query("maintenanceRequests")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    // Filter to show:
    // 1. Requests with scheduledDate in the past (truly overdue)
    // 2. OR requests older than 7 days in "reported" status (outstanding)
    // 3. OR urgent/high priority requests
    requests = requests.filter((r) => {
      const isOverdue = r.scheduledDate && r.scheduledDate < today;
      const isOldReported = r.status === "reported" && r.reportedDate && r.reportedDate < sevenDaysAgo;
      const isUrgent = r.priority === "urgent" || r.priority === "high";
      return isOverdue || isOldReported || isUrgent;
    });

    if (args.priority) {
      requests = requests.filter((r) =>
        r.priority.toLowerCase() === args.priority!.toLowerCase()
      );
    }

    // Get property details for each request
    const results = await Promise.all(
      requests.map(async (request) => {
        const dwelling = await ctx.db.get(request.dwellingId);
        const property = dwelling
          ? await ctx.db.get(dwelling.propertyId)
          : null;

        // Filter by property name if provided
        if (args.propertyName && property) {
          if (
            !(property.propertyName && fuzzyMatch(args.propertyName, property.propertyName)) &&
            !fuzzyMatch(args.propertyName, property.addressLine1)
          ) {
            return null;
          }
        }

        // Calculate days overdue or outstanding
        let daysOutstanding = 0;
        if (request.scheduledDate && request.scheduledDate < today) {
          daysOutstanding = -daysUntil(request.scheduledDate);
        } else if (request.reportedDate) {
          daysOutstanding = -daysUntil(request.reportedDate);
        }

        return {
          request,
          dwelling,
          property,
          daysOverdue: daysOutstanding,
        };
      })
    );

    return results.filter((r) => r !== null);
  },
});

// Get payment status for a participant
export const getPaymentStatus = internalQuery({
  args: {
    participantName: v.string(),
    period: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db.query("participants").collect();

    const matches = participants.filter((p) =>
      fuzzyMatch(args.participantName, `${p.firstName} ${p.lastName}`)
    );

    if (matches.length === 0) {
      return { found: false, message: `No participant found matching "${args.participantName}"` };
    }

    const results = await Promise.all(
      matches.map(async (participant) => {
        let payments = await ctx.db
          .query("payments")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .collect();

        // Sort by date descending
        payments = payments.sort(
          (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        );

        const totalPaid = payments.reduce((sum, p) => sum + p.actualAmount, 0);
        const totalExpected = payments.reduce((sum, p) => sum + p.expectedAmount, 0);

        return {
          participant,
          recentPayments: payments.slice(0, 5),
          totalPayments: payments.length,
          totalPaid,
          totalExpected,
          variance: totalPaid - totalExpected,
        };
      })
    );

    return { found: true, results };
  },
});

// Get expiring documents
export const getExpiringDocuments = internalQuery({
  args: { daysAhead: v.number() },
  handler: async (ctx, args) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + args.daysAhead);

    const todayStr = today.toISOString().split("T")[0];
    const futureStr = futureDate.toISOString().split("T")[0];

    const documents = await ctx.db.query("documents").collect();

    const expiring = documents.filter(
      (doc) =>
        doc.expiryDate &&
        doc.expiryDate >= todayStr &&
        doc.expiryDate <= futureStr
    );

    // Get linked entity details
    const results = await Promise.all(
      expiring.map(async (doc) => {
        let linkedEntity = null;
        if (doc.linkedParticipantId) {
          linkedEntity = await ctx.db.get(doc.linkedParticipantId);
        } else if (doc.linkedPropertyId) {
          linkedEntity = await ctx.db.get(doc.linkedPropertyId);
        } else if (doc.linkedDwellingId) {
          linkedEntity = await ctx.db.get(doc.linkedDwellingId);
        }

        return {
          document: doc,
          linkedEntity,
          daysUntilExpiry: daysUntil(doc.expiryDate!),
        };
      })
    );

    return results.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  },
});

// Get property summary
export const getPropertySummary = internalQuery({
  args: { propertyName: v.string() },
  handler: async (ctx, args) => {
    const properties = await ctx.db.query("properties").collect();

    const matches = properties.filter(
      (p) =>
        (p.propertyName && fuzzyMatch(args.propertyName, p.propertyName)) ||
        fuzzyMatch(args.propertyName, p.addressLine1) ||
        fuzzyMatch(args.propertyName, p.suburb)
    );

    if (matches.length === 0) {
      return { found: false, message: `No property found matching "${args.propertyName}"` };
    }

    const results = await Promise.all(
      matches.map(async (property) => {
        const owner = property.ownerId ? await ctx.db.get(property.ownerId) : null;

        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .collect();

        const dwellingsWithParticipants = await Promise.all(
          dwellings.map(async (dwelling) => {
            const participants = await ctx.db
              .query("participants")
              .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
              .filter((q) => q.eq(q.field("status"), "active"))
              .collect();

            return {
              dwelling,
              participants,
            };
          })
        );

        const totalCapacity = dwellings.reduce((sum, d) => sum + d.maxParticipants, 0);
        const totalOccupants = dwellingsWithParticipants.reduce(
          (sum, d) => sum + d.participants.length,
          0
        );

        // Get recent maintenance
        const allDwellingIds = dwellings.map((d) => d._id);
        const maintenance = await ctx.db
          .query("maintenanceRequests")
          .collect();
        const propertyMaintenance = maintenance
          .filter((m) => allDwellingIds.includes(m.dwellingId))
          .slice(0, 5);

        return {
          property,
          owner,
          dwellings: dwellingsWithParticipants,
          totalCapacity,
          totalOccupants,
          vacancies: totalCapacity - totalOccupants,
          recentMaintenance: propertyMaintenance,
        };
      })
    );

    return { found: true, results };
  },
});

// Get participant info
export const getParticipantInfo = internalQuery({
  args: { participantName: v.string() },
  handler: async (ctx, args) => {
    const participants = await ctx.db.query("participants").collect();

    const matches = participants.filter((p) =>
      fuzzyMatch(args.participantName, `${p.firstName} ${p.lastName}`)
    );

    if (matches.length === 0) {
      return { found: false, message: `No participant found matching "${args.participantName}"` };
    }

    const results = await Promise.all(
      matches.map(async (participant) => {
        const dwelling = participant.dwellingId
          ? await ctx.db.get(participant.dwellingId)
          : null;
        const property = dwelling
          ? await ctx.db.get(dwelling.propertyId)
          : null;

        const plan = await ctx.db
          .query("participantPlans")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .filter((q) => q.eq(q.field("planStatus"), "current"))
          .first();

        return {
          participant,
          dwelling,
          property,
          plan,
        };
      })
    );

    return { found: true, results };
  },
});

// ==================== Action Mutations ====================

// Move participant to a different dwelling
export const moveParticipant = internalMutation({
  args: {
    participantName: v.string(),
    targetDwellingName: v.string(),
    targetPropertyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find participant
    const participants = await ctx.db.query("participants").collect();
    const participant = participants.find((p) =>
      fuzzyMatch(args.participantName, `${p.firstName} ${p.lastName}`)
    );

    if (!participant) {
      return { success: false, error: `Participant "${args.participantName}" not found` };
    }

    // Find target dwelling
    const dwellings = await ctx.db.query("dwellings").collect();
    let targetDwelling = dwellings.find((d) =>
      fuzzyMatch(args.targetDwellingName, d.dwellingName)
    );

    // If property name provided, filter dwellings by property
    if (!targetDwelling && args.targetPropertyName) {
      const properties = await ctx.db.query("properties").collect();
      const property = properties.find(
        (p) =>
          (p.propertyName && fuzzyMatch(args.targetPropertyName!, p.propertyName)) ||
          fuzzyMatch(args.targetPropertyName!, p.addressLine1)
      );

      if (property) {
        const propertyDwellings = dwellings.filter((d) => d.propertyId === property._id);
        targetDwelling = propertyDwellings.find((d) =>
          fuzzyMatch(args.targetDwellingName, d.dwellingName)
        );
      }
    }

    if (!targetDwelling) {
      return { success: false, error: `Dwelling "${args.targetDwellingName}" not found` };
    }

    // Check capacity
    const currentOccupants = await ctx.db
      .query("participants")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", targetDwelling!._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (currentOccupants.length >= targetDwelling.maxParticipants) {
      return { success: false, error: `Dwelling "${targetDwelling.dwellingName}" is at full capacity` };
    }

    // Get old dwelling info for response
    const oldDwelling = participant.dwellingId
      ? await ctx.db.get(participant.dwellingId)
      : null;

    // Update participant
    await ctx.db.patch(participant._id, {
      dwellingId: targetDwelling._id,
      updatedAt: Date.now(),
    });

    // Update old dwelling occupancy
    if (oldDwelling) {
      const oldOccupants = await ctx.db
        .query("participants")
        .withIndex("by_dwelling", (q) => q.eq("dwellingId", oldDwelling._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      const newOccupancy = oldOccupants.length - 1;
      await ctx.db.patch(oldDwelling._id, {
        currentOccupancy: Math.max(0, newOccupancy),
        occupancyStatus: newOccupancy === 0 ? "vacant" : newOccupancy < oldDwelling.maxParticipants ? "partially_occupied" : "fully_occupied",
        updatedAt: Date.now(),
      });
    }

    // Update new dwelling occupancy
    const newOccupancy = currentOccupants.length + 1;
    await ctx.db.patch(targetDwelling._id, {
      currentOccupancy: newOccupancy,
      occupancyStatus: newOccupancy >= targetDwelling.maxParticipants ? "fully_occupied" : "partially_occupied",
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Moved ${participant.firstName} ${participant.lastName} from ${oldDwelling?.dwellingName || "unassigned"} to ${targetDwelling.dwellingName}`,
      participant: `${participant.firstName} ${participant.lastName}`,
      fromDwelling: oldDwelling?.dwellingName || "unassigned",
      toDwelling: targetDwelling.dwellingName,
    };
  },
});

// Create maintenance request
export const createMaintenanceRequest = internalMutation({
  args: {
    dwellingName: v.string(),
    propertyName: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    priority: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find dwelling
    const dwellings = await ctx.db.query("dwellings").collect();
    let targetDwelling = dwellings.find((d) =>
      fuzzyMatch(args.dwellingName, d.dwellingName)
    );

    // If property name provided, filter by property
    if (!targetDwelling && args.propertyName) {
      const properties = await ctx.db.query("properties").collect();
      const property = properties.find(
        (p) =>
          (p.propertyName && fuzzyMatch(args.propertyName!, p.propertyName)) ||
          fuzzyMatch(args.propertyName!, p.addressLine1)
      );

      if (property) {
        const propertyDwellings = dwellings.filter((d) => d.propertyId === property._id);
        targetDwelling = propertyDwellings.find((d) =>
          fuzzyMatch(args.dwellingName, d.dwellingName)
        ) || propertyDwellings[0]; // Default to first dwelling if name not found
      }
    }

    if (!targetDwelling) {
      return { success: false, error: `Dwelling "${args.dwellingName}" not found` };
    }

    // Validate category
    const validCategories = ["plumbing", "electrical", "appliances", "building", "grounds", "safety", "general"];
    const category = validCategories.find((c) => c.toLowerCase() === args.category.toLowerCase()) || "general";

    // Validate priority
    const validPriorities = ["urgent", "high", "medium", "low"];
    const priority = validPriorities.find((p) => p.toLowerCase() === args.priority.toLowerCase()) || "medium";

    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    const requestId = await ctx.db.insert("maintenanceRequests", {
      dwellingId: targetDwelling._id,
      requestType: "reactive",
      category: category as "plumbing" | "electrical" | "appliances" | "building" | "grounds" | "safety" | "general",
      priority: priority as "urgent" | "high" | "medium" | "low",
      title: args.title,
      description: args.description,
      reportedDate: today,
      status: "reported",
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      message: `Created maintenance request: "${args.title}" for ${targetDwelling.dwellingName}`,
      requestId,
      dwelling: targetDwelling.dwellingName,
      priority,
      category,
    };
  },
});

// Update maintenance status
export const updateMaintenanceStatus = internalMutation({
  args: {
    maintenanceTitle: v.optional(v.string()),
    dwellingName: v.optional(v.string()),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    // Find maintenance request
    const requests = await ctx.db.query("maintenanceRequests").collect();

    let targetRequest = null;

    if (args.maintenanceTitle) {
      targetRequest = requests.find((r) =>
        fuzzyMatch(args.maintenanceTitle!, r.title) && r.status !== "completed" && r.status !== "cancelled"
      );
    }

    if (!targetRequest && args.dwellingName) {
      const dwellings = await ctx.db.query("dwellings").collect();
      const dwelling = dwellings.find((d) => fuzzyMatch(args.dwellingName!, d.dwellingName));

      if (dwelling) {
        // Get most recent open request for this dwelling
        const dwellingRequests = requests
          .filter((r) => r.dwellingId === dwelling._id && r.status !== "completed" && r.status !== "cancelled")
          .sort((a, b) => b.createdAt - a.createdAt);
        targetRequest = dwellingRequests[0];
      }
    }

    if (!targetRequest) {
      return { success: false, error: "Maintenance request not found" };
    }

    // Validate status
    const validStatuses = ["reported", "awaiting_quotes", "quoted", "approved", "scheduled", "in_progress", "completed", "cancelled"];
    const status = validStatuses.find((s) => s.toLowerCase() === args.newStatus.toLowerCase().replace(" ", "_"));

    if (!status) {
      return { success: false, error: `Invalid status. Valid options: ${validStatuses.join(", ")}` };
    }

    const updates: Record<string, unknown> = {
      status,
      updatedAt: Date.now(),
    };

    if (status === "completed") {
      updates.completedDate = new Date().toISOString().split("T")[0];
    }

    await ctx.db.patch(targetRequest._id, updates);

    return {
      success: true,
      message: `Updated maintenance "${targetRequest.title}" to status: ${status}`,
      requestTitle: targetRequest.title,
      newStatus: status,
    };
  },
});

// Record payment
export const recordPayment = internalMutation({
  args: {
    participantName: v.string(),
    amount: v.number(),
    paymentDate: v.optional(v.string()),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find participant
    const participants = await ctx.db.query("participants").collect();
    const participant = participants.find((p) =>
      fuzzyMatch(args.participantName, `${p.firstName} ${p.lastName}`)
    );

    if (!participant) {
      return { success: false, error: `Participant "${args.participantName}" not found` };
    }

    // Get current plan
    const plan = await ctx.db
      .query("participantPlans")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .filter((q) => q.eq(q.field("planStatus"), "current"))
      .first();

    if (!plan) {
      return { success: false, error: `No current plan found for ${participant.firstName} ${participant.lastName}` };
    }

    const today = new Date();
    const paymentDate = args.paymentDate || today.toISOString().split("T")[0];

    // Default period to current month if not provided
    const periodStart = args.periodStart || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const periodEnd = args.periodEnd || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

    const now = Date.now();
    const expectedAmount = plan.monthlySdaAmount || (plan.annualSdaBudget / 12);

    const paymentId = await ctx.db.insert("payments", {
      participantId: participant._id,
      planId: plan._id,
      paymentDate,
      paymentPeriodStart: periodStart,
      paymentPeriodEnd: periodEnd,
      expectedAmount,
      actualAmount: args.amount,
      variance: args.amount - expectedAmount,
      paymentSource: plan.fundingManagementType === "ndia_managed" ? "ndia" : plan.fundingManagementType === "plan_managed" ? "plan_manager" : "self_managed",
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      message: `Recorded $${args.amount.toLocaleString()} payment for ${participant.firstName} ${participant.lastName}`,
      paymentId,
      participant: `${participant.firstName} ${participant.lastName}`,
      amount: args.amount,
      paymentDate,
    };
  },
});

// Update participant status
export const updateParticipantStatus = internalMutation({
  args: {
    participantName: v.string(),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    // Find participant
    const participants = await ctx.db.query("participants").collect();
    const participant = participants.find((p) =>
      fuzzyMatch(args.participantName, `${p.firstName} ${p.lastName}`)
    );

    if (!participant) {
      return { success: false, error: `Participant "${args.participantName}" not found` };
    }

    // Validate status
    const validStatuses = ["active", "inactive", "pending_move_in", "moved_out"];
    const status = validStatuses.find((s) => s.toLowerCase() === args.newStatus.toLowerCase().replace(" ", "_"));

    if (!status) {
      return { success: false, error: `Invalid status. Valid options: ${validStatuses.join(", ")}` };
    }

    const updates: Record<string, unknown> = {
      status,
      updatedAt: Date.now(),
    };

    // If moved out, set move out date
    if (status === "moved_out" && !participant.moveOutDate) {
      updates.moveOutDate = new Date().toISOString().split("T")[0];
    }

    await ctx.db.patch(participant._id, updates);

    // Update dwelling occupancy if status changed to/from active
    if (participant.dwellingId && (participant.status === "active" || status === "active")) {
      const dwelling = await ctx.db.get(participant.dwellingId);
      if (dwelling) {
        const activeOccupants = await ctx.db
          .query("participants")
          .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        // Adjust count based on status change
        let newCount = activeOccupants.length;
        if (participant.status === "active" && status !== "active") {
          newCount = Math.max(0, newCount - 1);
        } else if (participant.status !== "active" && status === "active") {
          newCount = newCount + 1;
        }

        await ctx.db.patch(dwelling._id, {
          currentOccupancy: newCount,
          occupancyStatus: newCount === 0 ? "vacant" : newCount < dwelling.maxParticipants ? "partially_occupied" : "fully_occupied",
          updatedAt: Date.now(),
        });
      }
    }

    return {
      success: true,
      message: `Updated ${participant.firstName} ${participant.lastName} status to "${status}"`,
      participant: `${participant.firstName} ${participant.lastName}`,
      previousStatus: participant.status,
      newStatus: status,
    };
  },
});

// ==================== Main Chat Action ====================

interface ProcessQueryResult {
  response: string;
  conversationId: string;
  pendingAction?: {
    actionType: string;
    description: string;
    params: Record<string, unknown>;
  };
}

export const processUserQuery = action({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    userMessage: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<ProcessQueryResult> => {
    // 1. Detect intent
    const intent = await detectIntent(args.userMessage);

    // 2. Check if this is an action intent
    if (intent.isAction) {
      const actionResult = await handleActionIntent(intent, args.userId);

      // Save to conversation
      const conversationId = await ctx.runMutation(
        internal.aiChatbot.saveMessage,
        {
          conversationId: args.conversationId,
          userId: args.userId,
          userMessage: args.userMessage,
          assistantResponse: actionResult.response,
        }
      );

      return {
        response: actionResult.response,
        conversationId,
        pendingAction: actionResult.pendingAction,
      };
    }

    // 3. Execute appropriate query based on intent
    let queryResult: unknown = null;

    switch (intent.intent) {
      case "participant_plan_expiry":
        if (intent.entities.participantName) {
          queryResult = await ctx.runQuery(internal.aiChatbot.getParticipantPlanExpiry, {
            participantName: intent.entities.participantName,
          });
        }
        break;

      case "vacancies":
        queryResult = await ctx.runQuery(internal.aiChatbot.getVacancies, {
          propertyName: intent.entities.propertyName,
          suburb: intent.entities.suburb,
        });
        break;

      case "overdue_maintenance":
        queryResult = await ctx.runQuery(internal.aiChatbot.getOverdueMaintenance, {
          propertyName: intent.entities.propertyName,
          priority: intent.entities.priority,
        });
        break;

      case "payment_status":
        if (intent.entities.participantName) {
          queryResult = await ctx.runQuery(internal.aiChatbot.getPaymentStatus, {
            participantName: intent.entities.participantName,
            period: intent.entities.period,
          });
        }
        break;

      case "document_expiry":
        queryResult = await ctx.runQuery(internal.aiChatbot.getExpiringDocuments, {
          daysAhead: intent.entities.daysAhead || 30,
        });
        break;

      case "property_summary":
        if (intent.entities.propertyName) {
          queryResult = await ctx.runQuery(internal.aiChatbot.getPropertySummary, {
            propertyName: intent.entities.propertyName,
          });
        }
        break;

      case "participant_info":
        if (intent.entities.participantName) {
          queryResult = await ctx.runQuery(internal.aiChatbot.getParticipantInfo, {
            participantName: intent.entities.participantName,
          });
        }
        break;
    }

    // 4. Format response with Claude
    const response = await formatResponse(
      args.userMessage,
      intent,
      queryResult
    );

    // 5. Save to conversation
    const conversationId = await ctx.runMutation(
      internal.aiChatbot.saveMessage,
      {
        conversationId: args.conversationId,
        userId: args.userId,
        userMessage: args.userMessage,
        assistantResponse: response,
      }
    );

    return { response, conversationId };
  },
});

// Handle action intents - prepare action and ask for confirmation
async function handleActionIntent(
  intent: IntentResult,
  userId: string
): Promise<{ response: string; pendingAction?: { actionType: string; description: string; params: Record<string, unknown> } }> {
  const e = intent.entities;

  switch (intent.intent) {
    case "move_participant": {
      if (!e.participantName) {
        return { response: "I need to know which participant you want to move. Please specify the participant's name." };
      }
      if (!e.dwellingName && !e.propertyName) {
        return { response: `I need to know where you want to move ${e.participantName}. Please specify the dwelling or property name.` };
      }

      const targetLocation = e.dwellingName || e.propertyName || "";
      return {
        response: `I'll move **${e.participantName}** to **${targetLocation}**.\n\nPlease confirm this action by clicking the button below.`,
        pendingAction: {
          actionType: "move_participant",
          description: `Move ${e.participantName} to ${targetLocation}`,
          params: {
            participantName: e.participantName,
            targetDwellingName: e.dwellingName || targetLocation,
            targetPropertyName: e.propertyName,
          },
        },
      };
    }

    case "create_maintenance": {
      if (!e.dwellingName && !e.propertyName) {
        return { response: "I need to know which dwelling or property this maintenance request is for. Please specify the location." };
      }
      if (!e.maintenanceTitle && !e.maintenanceDescription) {
        return { response: "Please describe the maintenance issue. What needs to be fixed?" };
      }

      const title = e.maintenanceTitle || e.maintenanceDescription?.slice(0, 50) || "Maintenance Request";
      const description = e.maintenanceDescription || e.maintenanceTitle || "";
      const location = e.dwellingName || e.propertyName || "";
      const priority = e.priority || "medium";
      const category = e.maintenanceCategory || "general";

      return {
        response: `I'll create a maintenance request:\n\n**Title:** ${title}\n**Location:** ${location}\n**Priority:** ${priority}\n**Category:** ${category}\n**Description:** ${description}\n\nPlease confirm this action.`,
        pendingAction: {
          actionType: "create_maintenance",
          description: `Create maintenance: "${title}" at ${location}`,
          params: {
            dwellingName: e.dwellingName || location,
            propertyName: e.propertyName,
            title,
            description,
            category,
            priority,
            userId,
          },
        },
      };
    }

    case "update_maintenance_status": {
      if (!e.maintenanceStatus && !e.newStatus) {
        return { response: "What status should I update the maintenance request to? Options: reported, scheduled, in_progress, completed, cancelled" };
      }
      if (!e.maintenanceTitle && !e.dwellingName) {
        return { response: "Which maintenance request should I update? Please specify the request title or dwelling name." };
      }

      const status = e.maintenanceStatus || e.newStatus || "";
      const identifier = e.maintenanceTitle || `at ${e.dwellingName}`;

      return {
        response: `I'll update the maintenance request **${identifier}** to status: **${status}**.\n\nPlease confirm this action.`,
        pendingAction: {
          actionType: "update_maintenance_status",
          description: `Update maintenance "${identifier}" to ${status}`,
          params: {
            maintenanceTitle: e.maintenanceTitle,
            dwellingName: e.dwellingName,
            newStatus: status,
          },
        },
      };
    }

    case "record_payment": {
      if (!e.participantName) {
        return { response: "Which participant is this payment for? Please specify their name." };
      }
      if (!e.paymentAmount) {
        return { response: `What is the payment amount for ${e.participantName}?` };
      }

      const amount = e.paymentAmount;
      const date = e.paymentDate || new Date().toISOString().split("T")[0];

      return {
        response: `I'll record a payment of **$${amount.toLocaleString()}** for **${e.participantName}** on ${date}.\n\nPlease confirm this action.`,
        pendingAction: {
          actionType: "record_payment",
          description: `Record $${amount.toLocaleString()} payment for ${e.participantName}`,
          params: {
            participantName: e.participantName,
            amount,
            paymentDate: date,
            userId,
          },
        },
      };
    }

    case "update_participant_status": {
      if (!e.participantName) {
        return { response: "Which participant's status should I update? Please specify their name." };
      }
      if (!e.newStatus) {
        return { response: `What status should I set for ${e.participantName}? Options: active, inactive, pending_move_in, moved_out` };
      }

      return {
        response: `I'll update **${e.participantName}**'s status to **${e.newStatus}**.\n\nPlease confirm this action.`,
        pendingAction: {
          actionType: "update_participant_status",
          description: `Update ${e.participantName} status to ${e.newStatus}`,
          params: {
            participantName: e.participantName,
            newStatus: e.newStatus,
          },
        },
      };
    }

    default:
      return { response: "I'm not sure what action you want me to perform. Could you please clarify?" };
  }
}

// Execute a confirmed action
export const executeAction = action({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    actionType: v.string(),
    params: v.any(),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; response: string; conversationId: string }> => {
    let result: { success: boolean; message?: string; error?: string } = { success: false };

    try {
      switch (args.actionType) {
        case "move_participant":
          result = await ctx.runMutation(internal.aiChatbot.moveParticipant, {
            participantName: args.params.participantName,
            targetDwellingName: args.params.targetDwellingName,
            targetPropertyName: args.params.targetPropertyName,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "create_maintenance":
          result = await ctx.runMutation(internal.aiChatbot.createMaintenanceRequest, {
            dwellingName: args.params.dwellingName,
            propertyName: args.params.propertyName,
            title: args.params.title,
            description: args.params.description,
            category: args.params.category,
            priority: args.params.priority,
            userId: args.userId,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "update_maintenance_status":
          result = await ctx.runMutation(internal.aiChatbot.updateMaintenanceStatus, {
            maintenanceTitle: args.params.maintenanceTitle,
            dwellingName: args.params.dwellingName,
            newStatus: args.params.newStatus,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "record_payment":
          result = await ctx.runMutation(internal.aiChatbot.recordPayment, {
            participantName: args.params.participantName,
            amount: args.params.amount,
            paymentDate: args.params.paymentDate,
            periodStart: args.params.periodStart,
            periodEnd: args.params.periodEnd,
            userId: args.userId,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "update_participant_status":
          result = await ctx.runMutation(internal.aiChatbot.updateParticipantStatus, {
            participantName: args.params.participantName,
            newStatus: args.params.newStatus,
          }) as { success: boolean; message?: string; error?: string };
          break;

        default:
          result = { success: false, error: "Unknown action type" };
      }
    } catch (error) {
      result = { success: false, error: String(error) };
    }

    const response = result.success
      ? `Done! ${result.message || "Action completed successfully."}`
      : `Sorry, I couldn't complete this action. ${result.error || "Unknown error"}`;

    // Save result to conversation
    const conversationId = await ctx.runMutation(
      internal.aiChatbot.saveMessage,
      {
        conversationId: args.conversationId,
        userId: args.userId,
        userMessage: `[Confirmed action: ${args.actionType}]`,
        assistantResponse: response,
      }
    );

    return { success: result.success, response, conversationId };
  },
});

// Format response using Claude
async function formatResponse(
  userMessage: string,
  intent: IntentResult,
  queryResult: unknown
): Promise<string> {
  const systemPrompt = `You are a helpful assistant for an SDA (Specialist Disability Accommodation) management system in Australia.

Format the query results into a natural, helpful response. Be concise but informative.

Guidelines:
- Use Australian date format (DD Month YYYY)
- Format currency as AUD (e.g., $1,234.56)
- If no results found, be helpful and suggest alternatives
- Keep responses friendly and professional
- Use bullet points for lists
- Highlight important dates and deadlines

The user asked: "${userMessage}"
The detected intent was: ${intent.intent} (confidence: ${(intent.confidence * 100).toFixed(0)}%)

Query results:
${JSON.stringify(queryResult, null, 2)}

Provide a helpful, natural response based on this data. If the query returned no results or the intent was unclear, provide a helpful message.`;

  const response = await callClaudeAPI(
    systemPrompt,
    [{ role: "user", content: "Please format the response for the user." }],
    1024
  );

  return response;
}

// ==================== Conversation Management ====================

// Save message to conversation (internal mutation for use in actions)
export const saveMessage = internalMutation({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    userId: v.id("users"),
    userMessage: v.string(),
    assistantResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.conversationId) {
      // Add to existing conversation
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const newMessages: ChatMessage[] = [
        ...conversation.messages,
        { role: "user", content: args.userMessage, timestamp: now },
        { role: "assistant", content: args.assistantResponse, timestamp: now },
      ];

      await ctx.db.patch(args.conversationId, {
        messages: newMessages,
        updatedAt: now,
      });

      return args.conversationId;
    } else {
      // Create new conversation
      const title = args.userMessage.slice(0, 50) + (args.userMessage.length > 50 ? "..." : "");

      const conversationId = await ctx.db.insert("aiConversations", {
        userId: args.userId,
        title,
        messages: [
          { role: "user", content: args.userMessage, timestamp: now },
          { role: "assistant", content: args.assistantResponse, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      return conversationId;
    }
  },
});

// Get user's conversations
export const getConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("aiConversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);

    return conversations;
  },
});

// Get conversation by ID
export const getConversation = query({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

// Delete conversation
export const deleteConversation = mutation({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.conversationId);
    return { success: true };
  },
});

// Update conversation title
export const updateConversationTitle = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
