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
// Optimised: batch-loads all dwellings + active participants in 3 queries
// instead of N+1 per property per dwelling.
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

    // Batch-load all dwellings and active participants in two queries
    const allDwellings = await ctx.db.query("dwellings").collect();
    const allActiveParticipants = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Build lookup maps
    const dwellingsByProperty = new Map<string, typeof allDwellings>();
    for (const d of allDwellings) {
      const key = d.propertyId as string;
      if (!dwellingsByProperty.has(key)) dwellingsByProperty.set(key, []);
      dwellingsByProperty.get(key)!.push(d);
    }

    const participantsByDwelling = new Map<string, number>();
    for (const p of allActiveParticipants) {
      if (p.dwellingId) {
        const key = p.dwellingId as string;
        participantsByDwelling.set(key, (participantsByDwelling.get(key) || 0) + 1);
      }
    }

    const vacancies = properties.map((property) => {
      const dwellings = dwellingsByProperty.get(property._id as string) || [];

      const dwellingsWithOccupancy = dwellings.map((dwelling) => {
        const occupants = participantsByDwelling.get(dwelling._id as string) || 0;
        const vacantSpots = dwelling.maxParticipants - occupants;
        return {
          dwelling,
          occupants,
          capacity: dwelling.maxParticipants,
          vacantSpots,
        };
      });

      const totalVacant = dwellingsWithOccupancy.reduce(
        (sum, d) => sum + d.vacantSpots,
        0
      );

      return {
        property,
        dwellings: dwellingsWithOccupancy.filter((d) => d.vacantSpots > 0),
        totalVacant,
      };
    });

    return vacancies.filter((v) => v.totalVacant > 0);
  },
});

// Get overdue/outstanding maintenance
// Optimised: pre-fetches all dwellings + properties in 2 queries,
// then resolves via lookup maps (was: 2N queries in the loop).
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

    // Batch-load all dwellings and properties into lookup maps
    const allDwellings = await ctx.db.query("dwellings").collect();
    const dwellingMap = new Map(allDwellings.map((d) => [d._id as string, d]));

    const allProperties = await ctx.db.query("properties").collect();
    const propertyMap = new Map(allProperties.map((p) => [p._id as string, p]));

    // Resolve references from maps instead of per-request queries
    const results = requests.map((request) => {
      const dwelling = request.dwellingId ? dwellingMap.get(request.dwellingId as string) ?? null : null;
      const property = dwelling ? propertyMap.get(dwelling.propertyId as string) ?? null : null;

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
    });

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
// Optimised: pre-fetches participants, properties, dwellings into maps
// instead of per-document lookups (was: N queries for N expiring docs).
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

    // Batch-load all potential linked entities into maps
    const [allParticipants, allProperties, allDwellings] = await Promise.all([
      ctx.db.query("participants").collect(),
      ctx.db.query("properties").collect(),
      ctx.db.query("dwellings").collect(),
    ]);
    const participantMap = new Map(allParticipants.map((p) => [p._id as string, p]));
    const propertyMap = new Map(allProperties.map((p) => [p._id as string, p]));
    const dwellingMap = new Map(allDwellings.map((d) => [d._id as string, d]));

    // Resolve linked entities from maps
    const results = expiring.map((doc) => {
      let linkedEntity = null;
      if (doc.linkedParticipantId) {
        linkedEntity = participantMap.get(doc.linkedParticipantId as string) ?? null;
      } else if (doc.linkedPropertyId) {
        linkedEntity = propertyMap.get(doc.linkedPropertyId as string) ?? null;
      } else if (doc.linkedDwellingId) {
        linkedEntity = dwellingMap.get(doc.linkedDwellingId as string) ?? null;
      }

      return {
        document: doc,
        linkedEntity,
        daysUntilExpiry: daysUntil(doc.expiryDate!),
      };
    });

    return results.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  },
});

// Get property summary
// Optimised: batch-loads owners, dwellings, participants, and maintenance
// in 4 queries total instead of N+1 per property per dwelling.
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

    // Batch-load all related data in parallel
    const [allOwners, allDwellings, allActiveParticipants, allMaintenance] = await Promise.all([
      ctx.db.query("owners").collect(),
      ctx.db.query("dwellings").collect(),
      ctx.db.query("participants").filter((q) => q.eq(q.field("status"), "active")).collect(),
      ctx.db.query("maintenanceRequests").collect(),
    ]);

    // Build lookup maps
    const ownerMap = new Map(allOwners.map((o) => [o._id as string, o]));

    const dwellingsByProperty = new Map<string, typeof allDwellings>();
    for (const d of allDwellings) {
      const key = d.propertyId as string;
      if (!dwellingsByProperty.has(key)) dwellingsByProperty.set(key, []);
      dwellingsByProperty.get(key)!.push(d);
    }

    const participantsByDwelling = new Map<string, typeof allActiveParticipants>();
    for (const p of allActiveParticipants) {
      if (p.dwellingId) {
        const key = p.dwellingId as string;
        if (!participantsByDwelling.has(key)) participantsByDwelling.set(key, []);
        participantsByDwelling.get(key)!.push(p);
      }
    }

    const results = matches.map((property) => {
      const owner = property.ownerId ? ownerMap.get(property.ownerId as string) ?? null : null;
      const dwellings = dwellingsByProperty.get(property._id as string) || [];

      const dwellingsWithParticipants = dwellings.map((dwelling) => ({
        dwelling,
        participants: participantsByDwelling.get(dwelling._id as string) || [],
      }));

      const totalCapacity = dwellings.reduce((sum, d) => sum + d.maxParticipants, 0);
      const totalOccupants = dwellingsWithParticipants.reduce(
        (sum, d) => sum + d.participants.length,
        0
      );

      // Get recent maintenance from pre-loaded data
      const dwellingIdSet = new Set(dwellings.map((d) => d._id as string));
      const propertyMaintenance = allMaintenance
        .filter((m) => dwellingIdSet.has(m.dwellingId as string))
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
    });

    return { found: true, results };
  },
});

// Get participant info
// Optimised: pre-fetches dwellings, properties, and plans in 3 queries
// instead of 3 queries per matched participant.
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

    // Batch-load related data
    const [allDwellings, allProperties, allPlans] = await Promise.all([
      ctx.db.query("dwellings").collect(),
      ctx.db.query("properties").collect(),
      ctx.db.query("participantPlans").filter((q) => q.eq(q.field("planStatus"), "current")).collect(),
    ]);

    const dwellingMap = new Map(allDwellings.map((d) => [d._id as string, d]));
    const propertyMap = new Map(allProperties.map((p) => [p._id as string, p]));
    const planByParticipant = new Map(allPlans.map((p) => [p.participantId as string, p]));

    const results = matches.map((participant) => {
      const dwelling = participant.dwellingId
        ? dwellingMap.get(participant.dwellingId as string) ?? null
        : null;
      const property = dwelling
        ? propertyMap.get(dwelling.propertyId as string) ?? null
        : null;
      const plan = planByParticipant.get(participant._id as string) ?? null;

      return {
        participant,
        dwelling,
        property,
        plan,
      };
    });

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
    params: v.object({
      // move_participant
      participantName: v.optional(v.string()),
      participant_name: v.optional(v.string()),
      targetDwellingName: v.optional(v.string()),
      target_dwelling: v.optional(v.string()),
      targetPropertyName: v.optional(v.string()),
      target_property: v.optional(v.string()),
      // create_maintenance / update_maintenance_status
      dwellingName: v.optional(v.string()),
      dwelling_name: v.optional(v.string()),
      propertyName: v.optional(v.string()),
      property_name: v.optional(v.string()),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      category: v.optional(v.string()),
      priority: v.optional(v.string()),
      maintenanceTitle: v.optional(v.string()),
      maintenance_title: v.optional(v.string()),
      newStatus: v.optional(v.string()),
      new_status: v.optional(v.string()),
      // record_payment
      amount: v.optional(v.number()),
      paymentDate: v.optional(v.string()),
      payment_date: v.optional(v.string()),
      periodStart: v.optional(v.string()),
      periodEnd: v.optional(v.string()),
      // schedule_inspection
      scheduledDate: v.optional(v.string()),
      scheduled_date: v.optional(v.string()),
      templateName: v.optional(v.string()),
      template_name: v.optional(v.string()),
    }),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; response: string; conversationId: string }> => {
    let result: { success: boolean; message?: string; error?: string } = { success: false };

    try {
      switch (args.actionType) {
        case "move_participant":
          result = await ctx.runMutation(internal.aiChatbot.moveParticipant, {
            participantName: args.params.participantName!,
            targetDwellingName: args.params.targetDwellingName!,
            targetPropertyName: args.params.targetPropertyName!,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "create_maintenance":
          result = await ctx.runMutation(internal.aiChatbot.createMaintenanceRequest, {
            dwellingName: args.params.dwellingName!,
            propertyName: args.params.propertyName!,
            title: args.params.title!,
            description: args.params.description!,
            category: args.params.category!,
            priority: args.params.priority!,
            userId: args.userId,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "update_maintenance_status":
          result = await ctx.runMutation(internal.aiChatbot.updateMaintenanceStatus, {
            maintenanceTitle: args.params.maintenanceTitle!,
            dwellingName: args.params.dwellingName!,
            newStatus: args.params.newStatus!,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "record_payment":
          result = await ctx.runMutation(internal.aiChatbot.recordPayment, {
            participantName: args.params.participantName!,
            amount: args.params.amount!,
            paymentDate: args.params.paymentDate!,
            periodStart: args.params.periodStart,
            periodEnd: args.params.periodEnd,
            userId: args.userId,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "update_participant_status":
          result = await ctx.runMutation(internal.aiChatbot.updateParticipantStatus, {
            participantName: args.params.participantName!,
            newStatus: args.params.newStatus!,
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

// ==================== Tool-Based Chat (V2) ====================

import {
  callClaudeWithTools,
  extractToolUse,
  extractText,
} from "./aiUtils";
import {
  SDA_ASSISTANT_TOOLS,
  requiresConfirmation,
  getActionDescription,
} from "./aiTools";

const TOOL_SYSTEM_PROMPT = `You are an AI assistant for an SDA (Specialist Disability Accommodation) property management system in Australia.

Your role is to help staff manage properties, participants, maintenance, payments, and documents.

Key context:
- SDA = Specialist Disability Accommodation (NDIS-funded housing)
- Participants = NDIS participants living in the accommodation
- Dwellings = Individual units within a property
- RRC = Reasonable Rent Contribution (participant's rent payment)

When responding:
- Use Australian date format (DD Month YYYY)
- Format currency as AUD (e.g., $1,234.56)
- Be concise but helpful
- For actions that modify data, always use the appropriate tool - never just describe what you would do

Always use the available tools to answer questions. If you need to perform an action like moving a participant or creating maintenance, use the appropriate tool.`;

// New tool-based query processor
export const processUserQueryV2 = action({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    userMessage: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<ProcessQueryResult> => {
    // Call Claude with tools
    const response = await callClaudeWithTools(
      TOOL_SYSTEM_PROMPT,
      [{ role: "user", content: args.userMessage }],
      SDA_ASSISTANT_TOOLS,
      4096
    );

    // Check if Claude wants to use a tool
    const toolUse = extractToolUse(response);

    if (toolUse) {
      // Handle tool use
      const result = await handleToolUse(ctx, toolUse, args.userId);

      // Save to conversation
      const conversationId = await ctx.runMutation(
        internal.aiChatbot.saveMessage,
        {
          conversationId: args.conversationId,
          userId: args.userId,
          userMessage: args.userMessage,
          assistantResponse: result.response,
        }
      );

      return {
        response: result.response,
        conversationId,
        pendingAction: result.pendingAction,
      };
    }

    // No tool use - just text response
    const textResponse = extractText(response) || "I'm not sure how to help with that. Could you please rephrase your question?";

    const conversationId = await ctx.runMutation(
      internal.aiChatbot.saveMessage,
      {
        conversationId: args.conversationId,
        userId: args.userId,
        userMessage: args.userMessage,
        assistantResponse: textResponse,
      }
    );

    return { response: textResponse, conversationId };
  },
});

// Handle tool use from Claude
async function handleToolUse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  toolUse: { name: string; input: Record<string, unknown> },
  userId: string
): Promise<{ response: string; pendingAction?: { actionType: string; description: string; params: Record<string, unknown> } }> {
  const { name, input } = toolUse;

  // Check if this action requires confirmation
  if (requiresConfirmation(name)) {
    const description = getActionDescription(name, input);
    return {
      response: `I'll ${description.toLowerCase()}.\n\nPlease confirm this action by clicking the button below.`,
      pendingAction: {
        actionType: name,
        description,
        params: { ...input, userId },
      },
    };
  }

  // Execute query tools directly
  let queryResult: unknown = null;

  switch (name) {
    case "get_vacancies":
      queryResult = await ctx.runQuery(internal.aiChatbot.getVacancies, {
        propertyName: input.property_name as string | undefined,
        suburb: input.suburb as string | undefined,
      });
      break;

    case "get_participant_plan_expiry":
      queryResult = await ctx.runQuery(internal.aiChatbot.getParticipantPlanExpiry, {
        participantName: input.participant_name as string,
      });
      break;

    case "get_expiring_plans":
      queryResult = await ctx.runQuery(internal.aiChatbot.getExpiringPlans, {
        daysAhead: (input.days_ahead as number) || 60,
      });
      break;

    case "get_overdue_maintenance":
      queryResult = await ctx.runQuery(internal.aiChatbot.getOverdueMaintenance, {
        propertyName: input.property_name as string | undefined,
        priority: input.priority as string | undefined,
      });
      break;

    case "get_payment_status":
      queryResult = await ctx.runQuery(internal.aiChatbot.getPaymentStatus, {
        participantName: input.participant_name as string,
      });
      break;

    case "get_expiring_documents":
      queryResult = await ctx.runQuery(internal.aiChatbot.getExpiringDocuments, {
        daysAhead: (input.days_ahead as number) || 30,
      });
      break;

    case "get_property_summary":
      queryResult = await ctx.runQuery(internal.aiChatbot.getPropertySummary, {
        propertyName: input.property_name as string,
      });
      break;

    case "get_participant_info":
      queryResult = await ctx.runQuery(internal.aiChatbot.getParticipantInfo, {
        participantName: input.participant_name as string,
      });
      break;

    case "list_all_participants":
      queryResult = await ctx.runQuery(internal.aiChatbot.listAllParticipants, {});
      break;

    case "get_recent_activity":
      queryResult = await ctx.runQuery(internal.aiChatbot.getRecentActivity, {
        daysBack: (input.days_back as number) || 7,
      });
      break;

    case "generate_text_response":
      return { response: generateTextResponse(input.response_type as string, input.context as string) };

    // New query tools
    case "calculate_owner_payment":
      queryResult = await ctx.runQuery(internal.aiChatbot.calculateOwnerPayment, {
        propertyName: input.property_name as string,
        month: input.month as string | undefined,
      });
      break;

    case "get_compliance_status":
      queryResult = await ctx.runQuery(internal.aiChatbot.getComplianceStatus, {
        propertyName: input.property_name as string | undefined,
      });
      break;

    case "match_participant_to_vacancy":
      queryResult = await ctx.runQuery(internal.aiChatbot.matchParticipantToVacancy, {
        sdaCategory: input.sda_category as string,
        suburb: input.suburb as string | undefined,
      });
      break;

    case "get_contractor_history":
      queryResult = await ctx.runQuery(internal.aiChatbot.getContractorHistory, {
        contractorName: input.contractor_name as string | undefined,
        trade: input.trade as string | undefined,
      });
      break;

    case "get_property_financials":
      queryResult = await ctx.runQuery(internal.aiChatbot.getPropertyFinancials, {
        propertyName: input.property_name as string,
        months: input.months as number | undefined,
      });
      break;

    case "get_incident_summary":
      queryResult = await ctx.runQuery(internal.aiChatbot.getIncidentSummary, {
        propertyName: input.property_name as string | undefined,
        participantName: input.participant_name as string | undefined,
        daysBack: input.days_back as number | undefined,
      });
      break;

    case "get_upcoming_payments":
      queryResult = await ctx.runQuery(internal.aiChatbot.getUpcomingPayments, {
        daysAhead: input.days_ahead as number | undefined,
      });
      break;

    case "get_monthly_summary":
      queryResult = await ctx.runQuery(internal.aiChatbot.getMonthlySummary, {
        month: input.month as string | undefined,
      });
      break;

    default:
      return { response: `I don't know how to handle the "${name}" tool yet.` };
  }

  // Format the query result into a response
  const formattedResponse = await formatToolResult(name, queryResult);
  return { response: formattedResponse };
}

// Generate text responses for general queries
function generateTextResponse(responseType: string, context?: string): string {
  switch (responseType) {
    case "greeting":
      return "Hello! I'm your SDA Assistant. I can help you with:\n\n- Finding vacant rooms and dwellings\n- Checking participant plan expiry dates\n- Viewing overdue maintenance\n- Recording payments\n- And more!\n\nWhat would you like help with?";
    case "help":
      return "Here's what I can help you with:\n\n**Queries:**\n- Show vacancies\n- Check participant plans\n- View overdue maintenance\n- Check expiring documents\n- Get property summaries\n- View payment history\n\n**Actions:**\n- Move participants between dwellings\n- Create maintenance requests\n- Record payments\n- Update participant status\n\nJust ask in natural language!";
    case "clarification":
      return context ? `I need more information: ${context}` : "Could you please provide more details?";
    case "unknown":
      return "I'm not sure how to help with that. Try asking about:\n- Vacancies\n- Participant plans\n- Maintenance\n- Payments\n- Property details";
    default:
      return "How can I help you today?";
  }
}

// Format tool results into readable responses
async function formatToolResult(toolName: string, result: unknown): Promise<string> {
  if (!result) {
    return "I couldn't find any information for that query.";
  }

  // Type the result for each case
  switch (toolName) {
    case "get_vacancies": {
      const vacancies = result as Array<{
        property: { propertyName?: string; addressLine1: string; suburb: string };
        dwellings: Array<{ dwelling: { dwellingName: string }; vacantSpots: number; capacity: number }>;
        totalVacant: number;
      }>;
      if (!vacancies || vacancies.length === 0) {
        return "No vacant rooms found at the moment. All dwellings are fully occupied.";
      }
      let response = "### Available Vacancies\n\n";
      for (const v of vacancies) {
        response += `**${v.property.propertyName || v.property.addressLine1}** (${v.property.suburb})\n`;
        for (const d of v.dwellings) {
          response += `- ${d.dwelling.dwellingName}: ${d.vacantSpots} vacant (capacity: ${d.capacity})\n`;
        }
        response += `Total vacant: ${v.totalVacant}\n\n`;
      }
      return response;
    }

    case "get_participant_plan_expiry": {
      const data = result as { found: boolean; message?: string; results?: Array<{
        participant: { firstName: string; lastName: string };
        plan: { planEndDate: string } | null;
        daysUntilExpiry: number | null;
      }> };
      if (!data.found) {
        return data.message || "Participant not found.";
      }
      let response = "### Plan Expiry Information\n\n";
      for (const r of data.results || []) {
        response += `**${r.participant.firstName} ${r.participant.lastName}**\n`;
        if (r.plan) {
          const expiryStatus = r.daysUntilExpiry !== null && r.daysUntilExpiry <= 30 ? " ⚠️" : "";
          response += `- Plan expires: ${r.plan.planEndDate}${expiryStatus}\n`;
          response += `- Days until expiry: ${r.daysUntilExpiry}\n`;
        } else {
          response += `- No current plan on file\n`;
        }
        response += "\n";
      }
      return response;
    }

    case "get_overdue_maintenance": {
      const items = result as Array<{
        request: { title: string; priority: string; status: string };
        property: { propertyName?: string; addressLine1: string } | null;
        dwelling: { dwellingName: string } | null;
        daysOverdue: number;
      }>;
      if (!items || items.length === 0) {
        return "No overdue maintenance requests found. All maintenance is up to date.";
      }
      let response = "### Overdue Maintenance\n\n";
      for (const item of items) {
        const priorityEmoji = item.request.priority === "urgent" ? "🚨" : item.request.priority === "high" ? "⚠️" : "";
        response += `${priorityEmoji} **${item.request.title}**\n`;
        response += `- Location: ${item.dwelling?.dwellingName || "Unknown"} at ${item.property?.propertyName || item.property?.addressLine1 || "Unknown"}\n`;
        response += `- Priority: ${item.request.priority} | Status: ${item.request.status}\n`;
        response += `- ${item.daysOverdue} days overdue\n\n`;
      }
      return response;
    }

    case "get_payment_status": {
      const data = result as { found: boolean; message?: string; results?: Array<{
        participant: { firstName: string; lastName: string };
        recentPayments: Array<{ paymentDate: string; actualAmount: number }>;
        totalPayments: number;
        totalPaid: number;
        totalExpected: number;
        variance: number;
      }> };
      if (!data.found) {
        return data.message || "Participant not found.";
      }
      let response = "### Payment Status\n\n";
      for (const r of data.results || []) {
        response += `**${r.participant.firstName} ${r.participant.lastName}**\n`;
        response += `- Total payments: ${r.totalPayments}\n`;
        response += `- Total paid: $${r.totalPaid.toLocaleString()}\n`;
        response += `- Total expected: $${r.totalExpected.toLocaleString()}\n`;
        response += `- Variance: $${r.variance.toLocaleString()}\n\n`;
        if (r.recentPayments.length > 0) {
          response += "Recent payments:\n";
          for (const p of r.recentPayments.slice(0, 3)) {
            response += `- ${p.paymentDate}: $${p.actualAmount.toLocaleString()}\n`;
          }
        }
        response += "\n";
      }
      return response;
    }

    case "get_expiring_documents": {
      const docs = result as Array<{
        document: { fileName: string; documentType: string; expiryDate: string };
        linkedEntity: { propertyName?: string; firstName?: string; lastName?: string } | null;
        daysUntilExpiry: number;
      }>;
      if (!docs || docs.length === 0) {
        return "No documents expiring in the specified period.";
      }
      let response = "### Expiring Documents\n\n";
      for (const d of docs) {
        const urgency = d.daysUntilExpiry <= 7 ? "🚨" : d.daysUntilExpiry <= 14 ? "⚠️" : "";
        response += `${urgency} **${d.document.fileName}**\n`;
        response += `- Type: ${d.document.documentType}\n`;
        response += `- Expires: ${d.document.expiryDate} (${d.daysUntilExpiry} days)\n`;
        if (d.linkedEntity) {
          const entityName = d.linkedEntity.propertyName || `${d.linkedEntity.firstName || ""} ${d.linkedEntity.lastName || ""}`.trim();
          response += `- Linked to: ${entityName}\n`;
        }
        response += "\n";
      }
      return response;
    }

    case "get_property_summary": {
      const data = result as { found: boolean; message?: string; results?: Array<{
        property: { propertyName?: string; addressLine1: string; suburb: string };
        owner: { firstName: string; lastName: string } | null;
        dwellings: Array<{ dwelling: { dwellingName: string }; participants: Array<{ firstName: string; lastName: string }> }>;
        totalCapacity: number;
        totalOccupants: number;
        vacancies: number;
      }> };
      if (!data.found) {
        return data.message || "Property not found.";
      }
      let response = "### Property Summary\n\n";
      for (const r of data.results || []) {
        response += `**${r.property.propertyName || r.property.addressLine1}**\n`;
        response += `${r.property.addressLine1}, ${r.property.suburb}\n\n`;
        if (r.owner) {
          response += `Owner: ${r.owner.firstName} ${r.owner.lastName}\n`;
        }
        response += `Capacity: ${r.totalOccupants}/${r.totalCapacity} (${r.vacancies} vacant)\n\n`;
        response += "**Dwellings:**\n";
        for (const d of r.dwellings) {
          response += `- ${d.dwelling.dwellingName}: `;
          if (d.participants.length > 0) {
            response += d.participants.map((p) => `${p.firstName} ${p.lastName}`).join(", ");
          } else {
            response += "Vacant";
          }
          response += "\n";
        }
        response += "\n";
      }
      return response;
    }

    case "get_participant_info": {
      const data = result as { found: boolean; message?: string; results?: Array<{
        participant: { firstName: string; lastName: string; ndisNumber?: string; status: string };
        dwelling: { dwellingName: string } | null;
        property: { propertyName?: string; addressLine1: string } | null;
        plan: { planEndDate: string; monthlySdaAmount?: number } | null;
      }> };
      if (!data.found) {
        return data.message || "Participant not found.";
      }
      let response = "### Participant Information\n\n";
      for (const r of data.results || []) {
        response += `**${r.participant.firstName} ${r.participant.lastName}**\n`;
        response += `- NDIS: ${r.participant.ndisNumber || "Not recorded"}\n`;
        response += `- Status: ${r.participant.status}\n`;
        if (r.property && r.dwelling) {
          response += `- Location: ${r.dwelling.dwellingName} at ${r.property.propertyName || r.property.addressLine1}\n`;
        }
        if (r.plan) {
          response += `- Plan expires: ${r.plan.planEndDate}\n`;
          if (r.plan.monthlySdaAmount) {
            response += `- Monthly SDA: $${r.plan.monthlySdaAmount.toLocaleString()}\n`;
          }
        }
        response += "\n";
      }
      return response;
    }

    case "list_all_participants": {
      const participants = result as Array<{
        participant: { firstName: string; lastName: string; status: string };
        dwelling: { dwellingName: string } | null;
        property: { propertyName?: string; addressLine1: string } | null;
      }>;
      if (!participants || participants.length === 0) {
        return "No active participants found.";
      }
      let response = "### All Active Participants\n\n";
      for (const p of participants) {
        response += `- **${p.participant.firstName} ${p.participant.lastName}**`;
        if (p.property && p.dwelling) {
          response += ` - ${p.dwelling.dwellingName} at ${p.property.propertyName || p.property.addressLine1}`;
        }
        response += "\n";
      }
      return response;
    }

    case "get_recent_activity": {
      const activity = result as {
        payments: Array<{ paymentDate: string; actualAmount: number; participantName: string }>;
        maintenance: Array<{ title: string; status: string; dwellingName: string }>;
        incidents: Array<{ incidentDate: string; category: string }>;
      };
      let response = "### Recent Activity Summary\n\n";

      if (activity.payments && activity.payments.length > 0) {
        response += "**Recent Payments:**\n";
        for (const p of activity.payments.slice(0, 5)) {
          response += `- ${p.paymentDate}: $${p.actualAmount.toLocaleString()} (${p.participantName})\n`;
        }
        response += "\n";
      }

      if (activity.maintenance && activity.maintenance.length > 0) {
        response += "**Recent Maintenance:**\n";
        for (const m of activity.maintenance.slice(0, 5)) {
          response += `- ${m.title} (${m.status}) - ${m.dwellingName}\n`;
        }
        response += "\n";
      }

      if (activity.incidents && activity.incidents.length > 0) {
        response += "**Recent Incidents:**\n";
        for (const i of activity.incidents.slice(0, 5)) {
          response += `- ${i.incidentDate}: ${i.category}\n`;
        }
      }

      return response || "No recent activity found.";
    }

    // New tool formatters
    case "calculate_owner_payment": {
      const data = result as {
        found: boolean;
        message?: string;
        property?: { name: string; address: string };
        owner?: string;
        month?: string;
        dwellings?: Array<{
          dwelling: string;
          participants: Array<{ participant: string; monthlySda: number; monthlyRrc: number }>;
        }>;
        totals?: {
          sdaIncome: number;
          rrcIncome: number;
          grossIncome: number;
          managementFeePercent: number;
          managementFee: number;
          netOwnerPayment: number;
        };
        bankDetails?: { bsb?: string; accountNumber?: string; accountName?: string } | null;
      };
      if (!data.found) {
        return data.message || "Property not found.";
      }
      let response = `### Owner Payment Calculator\n\n`;
      response += `**${data.property?.name}**\n`;
      response += `${data.property?.address}\n`;
      response += `Owner: ${data.owner}\n`;
      response += `Month: ${data.month}\n\n`;

      response += "**Revenue Breakdown:**\n";
      for (const d of data.dwellings || []) {
        response += `\n*${d.dwelling}:*\n`;
        for (const p of d.participants) {
          response += `- ${p.participant}: SDA $${p.monthlySda.toLocaleString()} + RRC $${p.monthlyRrc.toLocaleString()}\n`;
        }
      }

      response += "\n**Totals:**\n";
      response += `- SDA Income: $${data.totals?.sdaIncome.toLocaleString()}\n`;
      response += `- RRC Income: $${data.totals?.rrcIncome.toLocaleString()}\n`;
      response += `- Gross Income: $${data.totals?.grossIncome.toLocaleString()}\n`;
      response += `- Management Fee (${data.totals?.managementFeePercent}%): -$${data.totals?.managementFee.toLocaleString()}\n`;
      response += `- **Net Owner Payment: $${data.totals?.netOwnerPayment.toLocaleString()}**\n`;

      if (data.bankDetails) {
        response += `\n**Bank Details:**\n`;
        response += `- BSB: ${data.bankDetails.bsb}\n`;
        response += `- Account: ${data.bankDetails.accountNumber}\n`;
        response += `- Name: ${data.bankDetails.accountName}\n`;
      }

      return response;
    }

    case "get_compliance_status": {
      const items = result as Array<{
        property: { name: string; address: string };
        status: string;
        issues: string[];
        expiredDocs: Array<{ fileName: string; type: string; expiryDate?: string }>;
        expiringDocs: Array<{ fileName: string; type: string; expiryDate?: string; daysUntilExpiry: number }>;
        overdueInspections: Array<{ scheduledDate: string }>;
        lastInspection: string | null;
        missingDocTypes: string[];
      }>;
      if (!items || items.length === 0) {
        return "No properties found.";
      }
      let response = "### Compliance Status\n\n";
      for (const item of items) {
        const statusEmoji = item.status === "compliant" ? "✅" : item.status === "attention_needed" ? "⚠️" : "🚨";
        response += `${statusEmoji} **${item.property.name}** - ${item.status.replace("_", " ")}\n`;

        if (item.issues.length > 0) {
          response += `Issues: ${item.issues.join(", ")}\n`;
        }

        if (item.expiredDocs.length > 0) {
          response += `Expired: ${item.expiredDocs.map((d) => d.fileName).join(", ")}\n`;
        }

        if (item.expiringDocs.length > 0) {
          response += `Expiring soon: ${item.expiringDocs.map((d) => `${d.fileName} (${d.daysUntilExpiry} days)`).join(", ")}\n`;
        }

        if (item.lastInspection) {
          response += `Last inspection: ${item.lastInspection}\n`;
        }
        response += "\n";
      }
      return response;
    }

    case "match_participant_to_vacancy": {
      const matches = result as Array<{
        property: { name: string; address: string };
        dwellings: Array<{
          dwelling: string;
          sdaCategory: string;
          sdaRegisteredAmount?: number;
          vacantSpots: number;
          currentOccupants: string[];
          features?: string[];
        }>;
      }>;
      if (!matches || matches.length === 0) {
        return "No matching vacancies found for the specified SDA category.";
      }
      let response = "### Matching Vacancies\n\n";
      for (const m of matches) {
        response += `**${m.property.name}**\n${m.property.address}\n\n`;
        for (const d of m.dwellings) {
          response += `- **${d.dwelling}**\n`;
          response += `  - ${d.vacantSpots} spot(s) available\n`;
          if (d.sdaRegisteredAmount) {
            response += `  - SDA Rate: $${d.sdaRegisteredAmount.toLocaleString()}/month\n`;
          }
          if (d.currentOccupants.length > 0) {
            response += `  - Current occupants: ${d.currentOccupants.join(", ")}\n`;
          }
          if (d.features && d.features.length > 0) {
            response += `  - Features: ${d.features.join(", ")}\n`;
          }
        }
        response += "\n";
      }
      return response;
    }

    case "get_contractor_history": {
      const contractors = result as Array<{
        contractor: {
          name: string;
          trades: string[];
          phone?: string;
          email?: string;
          isActive: boolean;
        };
        metrics: {
          totalJobs: number;
          completedJobs: number;
          quotesSubmitted: number;
          averageQuoteAmount: number;
          avgResponseDays: number | null;
        };
        recentJobs: Array<{ title: string; completedDate?: string; category: string }>;
      }>;
      if (!contractors || contractors.length === 0) {
        return "No contractors found matching the criteria.";
      }
      let response = "### Contractor History\n\n";
      for (const c of contractors) {
        const statusBadge = c.contractor.isActive ? "🟢" : "🔴";
        response += `${statusBadge} **${c.contractor.name}**\n`;
        response += `Trades: ${c.contractor.trades.join(", ")}\n`;
        if (c.contractor.phone) response += `Phone: ${c.contractor.phone}\n`;
        if (c.contractor.email) response += `Email: ${c.contractor.email}\n\n`;

        response += `**Performance:**\n`;
        response += `- Jobs completed: ${c.metrics.completedJobs}/${c.metrics.totalJobs}\n`;
        response += `- Quotes submitted: ${c.metrics.quotesSubmitted}\n`;
        if (c.metrics.averageQuoteAmount > 0) {
          response += `- Average quote: $${c.metrics.averageQuoteAmount.toLocaleString()}\n`;
        }
        if (c.metrics.avgResponseDays !== null) {
          response += `- Avg response time: ${c.metrics.avgResponseDays} days\n`;
        }

        if (c.recentJobs.length > 0) {
          response += `\n**Recent Jobs:**\n`;
          for (const job of c.recentJobs) {
            response += `- ${job.title} (${job.category})${job.completedDate ? ` - ${job.completedDate}` : ""}\n`;
          }
        }
        response += "\n";
      }
      return response;
    }

    case "get_property_financials": {
      const data = result as {
        found: boolean;
        message?: string;
        property?: { name: string; address: string };
        period?: { start: string; end: string; months: number };
        currentOccupancy?: { occupied: number; capacity: number; percent: number };
        monthlyBreakdown?: Array<{ month: string; income: number; expenses: number; net: number }>;
        totals?: {
          income: number;
          expenses: number;
          net: number;
          avgMonthlyIncome: number;
          avgMonthlyExpenses: number;
        };
      };
      if (!data.found) {
        return data.message || "Property not found.";
      }
      let response = `### Financial Summary: ${data.property?.name}\n\n`;
      response += `Period: ${data.period?.start} to ${data.period?.end} (${data.period?.months} months)\n`;
      response += `Occupancy: ${data.currentOccupancy?.occupied}/${data.currentOccupancy?.capacity} (${data.currentOccupancy?.percent}%)\n\n`;

      response += "**Monthly Breakdown:**\n";
      response += "| Month | Income | Expenses | Net |\n";
      response += "|-------|--------|----------|-----|\n";
      for (const m of data.monthlyBreakdown || []) {
        response += `| ${m.month} | $${m.income.toLocaleString()} | $${m.expenses.toLocaleString()} | $${m.net.toLocaleString()} |\n`;
      }

      response += `\n**Totals:**\n`;
      response += `- Total Income: $${data.totals?.income.toLocaleString()}\n`;
      response += `- Total Expenses: $${data.totals?.expenses.toLocaleString()}\n`;
      response += `- Net: $${data.totals?.net.toLocaleString()}\n`;
      response += `- Avg Monthly Income: $${data.totals?.avgMonthlyIncome.toLocaleString()}\n`;
      response += `- Avg Monthly Expenses: $${data.totals?.avgMonthlyExpenses.toLocaleString()}\n`;

      return response;
    }

    case "get_incident_summary": {
      const data = result as {
        period: { days: number; start: string; end: string };
        summary: {
          total: number;
          bySeverity: { critical: number; high: number; medium: number; low: number };
          byStatus: { open: number; resolved: number };
          ndisReportable: number;
          ndisNotified: number;
          pendingNdisNotification: number;
        };
        incidents: Array<{
          date: string;
          type: string;
          severity: string;
          status: string;
          participant: string;
          location: string;
          requiresNdisNotification?: boolean;
          ndisNotified?: boolean;
          description?: string;
        }>;
      };
      let response = `### Incident Summary (Last ${data.period.days} days)\n\n`;
      response += `**Overview:**\n`;
      response += `- Total incidents: ${data.summary.total}\n`;
      response += `- Open: ${data.summary.byStatus.open} | Resolved: ${data.summary.byStatus.resolved}\n`;
      response += `- Critical: ${data.summary.bySeverity.critical} | High: ${data.summary.bySeverity.high} | Medium: ${data.summary.bySeverity.medium} | Low: ${data.summary.bySeverity.low}\n`;

      if (data.summary.ndisReportable > 0) {
        response += `\n⚠️ **NDIS Commission:**\n`;
        response += `- Reportable incidents: ${data.summary.ndisReportable}\n`;
        response += `- Notified: ${data.summary.ndisNotified}\n`;
        if (data.summary.pendingNdisNotification > 0) {
          response += `- 🚨 **Pending notification: ${data.summary.pendingNdisNotification}**\n`;
        }
      }

      if (data.incidents.length > 0) {
        response += `\n**Recent Incidents:**\n`;
        for (const i of data.incidents.slice(0, 10)) {
          const severityEmoji = i.severity === "critical" ? "🚨" : i.severity === "high" ? "⚠️" : "";
          response += `${severityEmoji} **${i.date}** - ${i.type.replace("_", " ")}\n`;
          response += `  - ${i.participant} at ${i.location}\n`;
          response += `  - Status: ${i.status}\n`;
        }
      }

      return response;
    }

    case "get_upcoming_payments": {
      const data = result as {
        period: { days: number; start: string; end: string };
        totals: {
          expectedSda: number;
          expectedRrc: number;
          totalExpected: number;
          participantCount: number;
        };
        payments: Array<{
          participant: string;
          location: string;
          dwelling: string;
          expectedSda: number;
          expectedRrc: number;
          totalExpected: number;
          claimDate: string;
          daysUntil: number;
          lastPaymentDate: string | null;
          fundingType?: string;
        }> | null;
      };
      let response = `### Upcoming Payments (Next ${data.period.days} days)\n\n`;
      response += `**Summary:**\n`;
      response += `- Expected SDA: $${data.totals.expectedSda.toLocaleString()}\n`;
      response += `- Expected RRC: $${data.totals.expectedRrc.toLocaleString()}\n`;
      response += `- **Total Expected: $${data.totals.totalExpected.toLocaleString()}**\n`;
      response += `- Participants: ${data.totals.participantCount}\n\n`;

      if (data.payments && data.payments.length > 0) {
        response += "**Upcoming Claims:**\n";
        for (const p of data.payments) {
          response += `- **${p.participant}** - ${p.location}\n`;
          response += `  Due: ${p.claimDate} (${p.daysUntil} days)\n`;
          response += `  Amount: $${p.totalExpected.toLocaleString()} (SDA: $${p.expectedSda.toLocaleString()} + RRC: $${p.expectedRrc.toLocaleString()})\n`;
        }
      }

      return response;
    }

    case "get_monthly_summary": {
      const data = result as {
        month: string;
        financial: {
          totalIncome: number;
          maintenanceCosts: number;
          netIncome: number;
          paymentsReceived: number;
        };
        operations: {
          maintenanceCreated: number;
          maintenanceCompleted: number;
          maintenanceOpen: number;
          incidents: number;
        };
        occupancy: {
          activeParticipants: number;
          totalCapacity: number;
          occupancyPercent: number;
          properties: number;
          dwellings: number;
        };
        alerts: {
          expiringPlans: number;
          expiringDocuments: number;
          overdueMaintenance: number;
        };
      };
      let response = `### Monthly Summary: ${data.month}\n\n`;

      response += `**Financial:**\n`;
      response += `- Total Income: $${data.financial.totalIncome.toLocaleString()}\n`;
      response += `- Maintenance Costs: $${data.financial.maintenanceCosts.toLocaleString()}\n`;
      response += `- Net Income: $${data.financial.netIncome.toLocaleString()}\n`;
      response += `- Payments Received: ${data.financial.paymentsReceived}\n\n`;

      response += `**Operations:**\n`;
      response += `- Maintenance: ${data.operations.maintenanceCompleted} completed, ${data.operations.maintenanceOpen} open\n`;
      response += `- Incidents: ${data.operations.incidents}\n\n`;

      response += `**Occupancy:**\n`;
      response += `- ${data.occupancy.activeParticipants}/${data.occupancy.totalCapacity} participants (${data.occupancy.occupancyPercent}%)\n`;
      response += `- Properties: ${data.occupancy.properties} | Dwellings: ${data.occupancy.dwellings}\n\n`;

      if (data.alerts.expiringPlans > 0 || data.alerts.expiringDocuments > 0 || data.alerts.overdueMaintenance > 0) {
        response += `**⚠️ Alerts:**\n`;
        if (data.alerts.expiringPlans > 0) response += `- ${data.alerts.expiringPlans} plan(s) expiring soon\n`;
        if (data.alerts.expiringDocuments > 0) response += `- ${data.alerts.expiringDocuments} document(s) expiring soon\n`;
        if (data.alerts.overdueMaintenance > 0) response += `- ${data.alerts.overdueMaintenance} overdue maintenance\n`;
      }

      return response;
    }

    default:
      return JSON.stringify(result, null, 2);
  }
}

// Additional internal queries for new tools
export const getExpiringPlans = internalQuery({
  args: { daysAhead: v.number() },
  handler: async (ctx, args) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + args.daysAhead);

    const todayStr = today.toISOString().split("T")[0];
    const futureStr = futureDate.toISOString().split("T")[0];

    const plans = await ctx.db.query("participantPlans")
      .filter((q) => q.eq(q.field("planStatus"), "current"))
      .collect();

    const expiring = plans.filter(
      (plan) => plan.planEndDate >= todayStr && plan.planEndDate <= futureStr
    );

    const results = await Promise.all(
      expiring.map(async (plan) => {
        const participant = await ctx.db.get(plan.participantId);
        return {
          participant,
          plan,
          daysUntilExpiry: daysUntil(plan.planEndDate),
        };
      })
    );

    return results.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  },
});

export const listAllParticipants = internalQuery({
  args: {},
  handler: async (ctx) => {
    const participants = await ctx.db.query("participants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const results = await Promise.all(
      participants.map(async (participant) => {
        const dwelling = participant.dwellingId
          ? await ctx.db.get(participant.dwellingId)
          : null;
        const property = dwelling
          ? await ctx.db.get(dwelling.propertyId)
          : null;

        return { participant, dwelling, property };
      })
    );

    return results;
  },
});

export const getRecentActivity = internalQuery({
  args: { daysBack: v.number() },
  handler: async (ctx, args) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - args.daysBack);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    // Recent payments
    const payments = await ctx.db.query("payments").collect();
    const recentPayments = payments
      .filter((p) => p.paymentDate >= cutoffStr)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .slice(0, 10);

    const paymentsWithNames = await Promise.all(
      recentPayments.map(async (p) => {
        const participant = await ctx.db.get(p.participantId);
        return {
          ...p,
          participantName: participant ? `${participant.firstName} ${participant.lastName}` : "Unknown",
        };
      })
    );

    // Recent maintenance
    const maintenance = await ctx.db.query("maintenanceRequests").collect();
    const recentMaintenance = maintenance
      .filter((m) => m.reportedDate && m.reportedDate >= cutoffStr)
      .sort((a, b) => (b.reportedDate || "").localeCompare(a.reportedDate || ""))
      .slice(0, 10);

    const maintenanceWithDwellings = await Promise.all(
      recentMaintenance.map(async (m) => {
        const dwelling = await ctx.db.get(m.dwellingId);
        return {
          ...m,
          dwellingName: dwelling?.dwellingName || "Unknown",
        };
      })
    );

    // Recent incidents
    const incidents = await ctx.db.query("incidents").collect();
    const recentIncidents = incidents
      .filter((i) => i.incidentDate >= cutoffStr)
      .sort((a, b) => b.incidentDate.localeCompare(a.incidentDate))
      .slice(0, 10);

    return {
      payments: paymentsWithNames,
      maintenance: maintenanceWithDwellings,
      incidents: recentIncidents,
    };
  },
});

// ==================== New AI Tools - Internal Queries ====================

// Calculate owner payment for a property
export const calculateOwnerPayment = internalQuery({
  args: {
    propertyName: v.string(),
    month: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const properties = await ctx.db.query("properties").collect();
    const property = properties.find(
      (p) =>
        (p.propertyName && fuzzyMatch(args.propertyName, p.propertyName)) ||
        fuzzyMatch(args.propertyName, p.addressLine1)
    );

    if (!property) {
      return { found: false, message: `No property found matching "${args.propertyName}"` };
    }

    const owner = property.ownerId ? await ctx.db.get(property.ownerId) : null;

    // Get dwellings
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .collect();

    // Get participants in dwellings
    const participantDetails = await Promise.all(
      dwellings.map(async (dwelling) => {
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        const participantRevenue = await Promise.all(
          participants.map(async (participant) => {
            const plan = await ctx.db
              .query("participantPlans")
              .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
              .filter((q) => q.eq(q.field("planStatus"), "current"))
              .first();

            const monthlySda = plan?.monthlySdaAmount || (plan?.annualSdaBudget ? plan.annualSdaBudget / 12 : 0);

            // Calculate RRC based on frequency
            let monthlyRrc = plan?.reasonableRentContribution || 0;
            if (plan?.rentContributionFrequency === "weekly") {
              monthlyRrc = monthlyRrc * 52 / 12;
            } else if (plan?.rentContributionFrequency === "fortnightly") {
              monthlyRrc = monthlyRrc * 26 / 12;
            }

            return {
              participant: `${participant.firstName} ${participant.lastName}`,
              monthlySda,
              monthlyRrc,
            };
          })
        );

        return {
          dwelling: dwelling.dwellingName,
          sdaRegisteredAmount: dwelling.sdaRegisteredAmount || 0,
          participants: participantRevenue,
        };
      })
    );

    // Calculate totals
    let totalSdaIncome = 0;
    let totalRrcIncome = 0;

    for (const d of participantDetails) {
      for (const p of d.participants) {
        totalSdaIncome += p.monthlySda;
        totalRrcIncome += p.monthlyRrc;
      }
    }

    const totalIncome = totalSdaIncome + totalRrcIncome;
    const managementFeePercent = property.managementFeePercent || 15;
    const managementFee = totalIncome * (managementFeePercent / 100);
    const netOwnerPayment = totalIncome - managementFee;

    return {
      found: true,
      property: {
        name: property.propertyName || property.addressLine1,
        address: `${property.addressLine1}, ${property.suburb}`,
      },
      owner: owner ? `${owner.firstName} ${owner.lastName}` : "No owner assigned",
      month: args.month || new Date().toISOString().slice(0, 7),
      dwellings: participantDetails,
      totals: {
        sdaIncome: totalSdaIncome,
        rrcIncome: totalRrcIncome,
        grossIncome: totalIncome,
        managementFeePercent,
        managementFee,
        netOwnerPayment,
      },
      bankDetails: owner?.bankAccountNumber ? {
        bsb: owner.bankBsb,
        accountNumber: owner.bankAccountNumber,
        accountName: owner.bankAccountName,
      } : null,
    };
  },
});

// Get compliance status
export const getComplianceStatus = internalQuery({
  args: {
    propertyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
    const thirtyDaysStr = thirtyDaysAhead.toISOString().split("T")[0];

    let properties = await ctx.db.query("properties").collect();

    if (args.propertyName) {
      properties = properties.filter(
        (p) =>
          (p.propertyName && fuzzyMatch(args.propertyName!, p.propertyName)) ||
          fuzzyMatch(args.propertyName!, p.addressLine1)
      );
    }

    const complianceResults = await Promise.all(
      properties.map(async (property) => {
        // Get documents for this property
        const documents = await ctx.db
          .query("documents")
          .withIndex("by_property", (q) => q.eq("linkedPropertyId", property._id))
          .collect();

        // Get dwellings for this property
        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .collect();

        // Get dwelling documents
        const dwellingDocs = await Promise.all(
          dwellings.map(async (dwelling) => {
            const docs = await ctx.db
              .query("documents")
              .withIndex("by_dwelling", (q) => q.eq("linkedDwellingId", dwelling._id))
              .collect();
            return docs;
          })
        );
        const allDocs = [...documents, ...dwellingDocs.flat()];

        // Check for expiring documents
        const expiringDocs = allDocs.filter(
          (doc) => doc.expiryDate && doc.expiryDate >= today && doc.expiryDate <= thirtyDaysStr
        );

        // Check for expired documents
        const expiredDocs = allDocs.filter(
          (doc) => doc.expiryDate && doc.expiryDate < today
        );

        // Get inspections
        const inspections = await ctx.db.query("inspections").collect();
        const propertyInspections = inspections.filter((i) => i.propertyId === property._id);

        const overdueInspections = propertyInspections.filter(
          (i) => i.status === "scheduled" && i.scheduledDate < today
        );

        const lastCompleted = propertyInspections
          .filter((i) => i.status === "completed")
          .sort((a, b) => (b.completedDate || "").localeCompare(a.completedDate || ""))[0];

        // Check for required document types
        const complianceDocTypes = ["fire_safety", "electrical", "gas", "pest_control", "insurance"];
        const missingDocTypes = complianceDocTypes.filter(
          (docType) => !allDocs.some((doc) => doc.documentType === docType && (!doc.expiryDate || doc.expiryDate >= today))
        );

        const issues = [];
        if (expiredDocs.length > 0) issues.push(`${expiredDocs.length} expired document(s)`);
        if (expiringDocs.length > 0) issues.push(`${expiringDocs.length} document(s) expiring soon`);
        if (overdueInspections.length > 0) issues.push(`${overdueInspections.length} overdue inspection(s)`);
        if (missingDocTypes.length > 0) issues.push(`Missing: ${missingDocTypes.join(", ")}`);

        return {
          property: {
            name: property.propertyName || property.addressLine1,
            address: `${property.addressLine1}, ${property.suburb}`,
          },
          status: issues.length === 0 ? "compliant" : issues.length <= 2 ? "attention_needed" : "non_compliant",
          issues,
          expiredDocs: expiredDocs.map((d) => ({ fileName: d.fileName, type: d.documentType, expiryDate: d.expiryDate })),
          expiringDocs: expiringDocs.map((d) => ({ fileName: d.fileName, type: d.documentType, expiryDate: d.expiryDate, daysUntilExpiry: daysUntil(d.expiryDate!) })),
          overdueInspections: overdueInspections.map((i) => ({ scheduledDate: i.scheduledDate })),
          lastInspection: lastCompleted?.completedDate || null,
          missingDocTypes,
        };
      })
    );

    return complianceResults;
  },
});

// Match participant to vacancy
export const matchParticipantToVacancy = internalQuery({
  args: {
    sdaCategory: v.string(),
    suburb: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let properties = await ctx.db.query("properties").collect();

    // Filter by suburb if provided
    if (args.suburb) {
      properties = properties.filter((p) => fuzzyMatch(args.suburb!, p.suburb));
    }

    const matches = await Promise.all(
      properties.map(async (property) => {
        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .collect();

        // Filter by SDA category and find vacancies
        const matchingDwellings = await Promise.all(
          dwellings
            .filter((d) => d.sdaDesignCategory === args.sdaCategory)
            .map(async (dwelling) => {
              const participants = await ctx.db
                .query("participants")
                .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
                .filter((q) => q.eq(q.field("status"), "active"))
                .collect();

              const vacantSpots = dwelling.maxParticipants - participants.length;

              if (vacantSpots > 0) {
                return {
                  dwelling: dwelling.dwellingName,
                  sdaCategory: dwelling.sdaDesignCategory,
                  sdaRegisteredAmount: dwelling.sdaRegisteredAmount,
                  vacantSpots,
                  currentOccupants: participants.map((p) => `${p.firstName} ${p.lastName}`),
                  notes: dwelling.notes || "",
                };
              }
              return null;
            })
        );

        const available = matchingDwellings.filter((d) => d !== null);

        if (available.length > 0) {
          return {
            property: {
              name: property.propertyName || property.addressLine1,
              address: `${property.addressLine1}, ${property.suburb}`,
            },
            dwellings: available,
          };
        }
        return null;
      })
    );

    return matches.filter((m) => m !== null);
  },
});

// Get contractor history
export const getContractorHistory = internalQuery({
  args: {
    contractorName: v.optional(v.string()),
    trade: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let contractors = await ctx.db.query("contractors").collect();

    if (args.contractorName) {
      contractors = contractors.filter((c) =>
        fuzzyMatch(args.contractorName!, c.companyName || c.contactName || "")
      );
    }

    if (args.trade) {
      contractors = contractors.filter((c) =>
        c.specialty.toLowerCase().includes(args.trade!.toLowerCase()) ||
        c.secondarySpecialties?.some((t: string) => t.toLowerCase().includes(args.trade!.toLowerCase()))
      );
    }

    const contractorDetails = await Promise.all(
      contractors.slice(0, 10).map(async (contractor) => {
        // Get maintenance requests assigned to this contractor
        const maintenance = await ctx.db.query("maintenanceRequests").collect();
        const assignedJobs = maintenance.filter((m) => m.assignedContractorId === contractor._id);

        // Get quotes submitted by this contractor
        const quotes = await ctx.db.query("maintenanceQuotes").collect();
        const contractorQuotes = quotes.filter((q) => q.contractorId === contractor._id);

        // Calculate metrics
        const completedJobs = assignedJobs.filter((j) => j.status === "completed");
        const totalQuoted = contractorQuotes.reduce((sum, q) => sum + (q.quoteAmount || 0), 0);
        const avgQuote = contractorQuotes.length > 0 ? totalQuoted / contractorQuotes.length : 0;

        // Calculate average response time (days between quote request sent and quote received)
        const quoteRequests = await ctx.db.query("quoteRequests").collect();
        const responseTimes: number[] = [];
        for (const quote of contractorQuotes) {
          const request = quoteRequests.find((r) => r.contractorId === contractor._id && r.maintenanceRequestId === quote.maintenanceRequestId);
          if (request && quote.createdAt && request.emailSentAt) {
            const days = (quote.createdAt - request.emailSentAt) / (1000 * 60 * 60 * 24);
            responseTimes.push(days);
          }
        }
        const avgResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : null;

        return {
          contractor: {
            name: contractor.companyName || contractor.contactName || "Unknown",
            specialty: contractor.specialty,
            secondarySpecialties: contractor.secondarySpecialties || [],
            phone: contractor.phone,
            email: contractor.email,
            isActive: contractor.isActive,
          },
          metrics: {
            totalJobs: assignedJobs.length,
            completedJobs: completedJobs.length,
            quotesSubmitted: contractorQuotes.length,
            averageQuoteAmount: avgQuote,
            avgResponseDays: avgResponseTime ? Math.round(avgResponseTime * 10) / 10 : null,
          },
          recentJobs: completedJobs.slice(0, 5).map((j) => ({
            title: j.title,
            completedDate: j.completedDate,
            category: j.category,
          })),
        };
      })
    );

    return contractorDetails;
  },
});

// Get property financials
export const getPropertyFinancials = internalQuery({
  args: {
    propertyName: v.string(),
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const properties = await ctx.db.query("properties").collect();
    const property = properties.find(
      (p) =>
        (p.propertyName && fuzzyMatch(args.propertyName, p.propertyName)) ||
        fuzzyMatch(args.propertyName, p.addressLine1)
    );

    if (!property) {
      return { found: false, message: `No property found matching "${args.propertyName}"` };
    }

    const monthsToShow = args.months || 6;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsToShow + 1, 1);
    const startStr = startDate.toISOString().split("T")[0];

    // Get dwellings and participants
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .collect();

    const dwellingIds = dwellings.map((d) => d._id);

    // Get payments for participants in these dwellings
    const allPayments = await ctx.db.query("payments").collect();
    const participants = await ctx.db.query("participants").collect();
    const propertyParticipants = participants.filter((p) => p.dwellingId && dwellingIds.includes(p.dwellingId));
    const participantIds = propertyParticipants.map((p) => p._id);

    const propertyPayments = allPayments.filter(
      (p) => participantIds.includes(p.participantId) && p.paymentDate >= startStr
    );

    // Get maintenance costs
    const maintenance = await ctx.db.query("maintenanceRequests").collect();
    const propertyMaintenance = maintenance.filter(
      (m) => dwellingIds.includes(m.dwellingId) && m.reportedDate && m.reportedDate >= startStr
    );

    // Group by month
    const monthlyData: Record<string, { income: number; expenses: number; occupancy: number }> = {};

    for (let i = 0; i < monthsToShow; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsToShow + 1 + i, 1);
      const monthKey = monthDate.toISOString().slice(0, 7);
      monthlyData[monthKey] = { income: 0, expenses: 0, occupancy: 0 };
    }

    // Sum payments by month
    for (const payment of propertyPayments) {
      const monthKey = payment.paymentDate.slice(0, 7);
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].income += payment.actualAmount;
      }
    }

    // Sum maintenance costs by month
    for (const m of propertyMaintenance) {
      if (m.actualCost && m.reportedDate) {
        const monthKey = m.reportedDate.slice(0, 7);
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].expenses += m.actualCost;
        }
      }
    }

    // Calculate current occupancy
    const totalCapacity = dwellings.reduce((sum, d) => sum + d.maxParticipants, 0);
    const currentOccupants = propertyParticipants.filter((p) => p.status === "active").length;
    const occupancyPercent = totalCapacity > 0 ? Math.round((currentOccupants / totalCapacity) * 100) : 0;

    // Calculate totals
    const totalIncome = Object.values(monthlyData).reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = Object.values(monthlyData).reduce((sum, m) => sum + m.expenses, 0);

    return {
      found: true,
      property: {
        name: property.propertyName || property.addressLine1,
        address: `${property.addressLine1}, ${property.suburb}`,
      },
      period: {
        start: startStr,
        end: now.toISOString().split("T")[0],
        months: monthsToShow,
      },
      currentOccupancy: {
        occupied: currentOccupants,
        capacity: totalCapacity,
        percent: occupancyPercent,
      },
      monthlyBreakdown: Object.entries(monthlyData).map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
      })),
      totals: {
        income: totalIncome,
        expenses: totalExpenses,
        net: totalIncome - totalExpenses,
        avgMonthlyIncome: Math.round(totalIncome / monthsToShow),
        avgMonthlyExpenses: Math.round(totalExpenses / monthsToShow),
      },
    };
  },
});

// Get incident summary
export const getIncidentSummary = internalQuery({
  args: {
    propertyName: v.optional(v.string()),
    participantName: v.optional(v.string()),
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.daysBack || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    let incidents = await ctx.db.query("incidents").collect();

    // Filter by date
    incidents = incidents.filter((i) => i.incidentDate >= cutoffStr);

    // Filter by property if provided
    if (args.propertyName) {
      const properties = await ctx.db.query("properties").collect();
      const property = properties.find(
        (p) =>
          (p.propertyName && fuzzyMatch(args.propertyName!, p.propertyName)) ||
          fuzzyMatch(args.propertyName!, p.addressLine1)
      );

      if (property) {
        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .collect();
        const dwellingIds = dwellings.map((d) => d._id);
        incidents = incidents.filter((i) => i.dwellingId && dwellingIds.includes(i.dwellingId));
      }
    }

    // Filter by participant if provided
    if (args.participantName) {
      const participants = await ctx.db.query("participants").collect();
      const participant = participants.find((p) =>
        fuzzyMatch(args.participantName!, `${p.firstName} ${p.lastName}`)
      );

      if (participant) {
        incidents = incidents.filter((i) => i.participantId === participant._id);
      }
    }

    // Get details for each incident
    const incidentDetails = await Promise.all(
      incidents.map(async (incident) => {
        const participant = incident.participantId ? await ctx.db.get(incident.participantId) : null;
        const dwelling = incident.dwellingId ? await ctx.db.get(incident.dwellingId) : null;
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        return {
          date: incident.incidentDate,
          type: incident.incidentType,
          severity: incident.severity,
          status: incident.status,
          participant: participant ? `${participant.firstName} ${participant.lastName}` : "N/A",
          location: dwelling ? `${dwelling.dwellingName} at ${property?.propertyName || property?.addressLine1 || "Unknown"}` : "N/A",
          isNdisReportable: incident.isNdisReportable,
          ndisNotified: incident.ndisCommissionNotified,
          description: incident.description?.slice(0, 100),
        };
      })
    );

    // Summary stats
    const bySeverity = {
      critical: incidents.filter((i) => i.severity === "critical").length,
      major: incidents.filter((i) => i.severity === "major").length,
      moderate: incidents.filter((i) => i.severity === "moderate").length,
      minor: incidents.filter((i) => i.severity === "minor").length,
    };

    const byStatus = {
      open: incidents.filter((i) => i.status === "reported" || i.status === "under_investigation").length,
      resolved: incidents.filter((i) => i.status === "resolved" || i.status === "closed").length,
    };

    const ndisReportable = incidents.filter((i) => i.isNdisReportable).length;
    const ndisNotified = incidents.filter((i) => i.ndisCommissionNotified).length;

    return {
      period: {
        days,
        start: cutoffStr,
        end: new Date().toISOString().split("T")[0],
      },
      summary: {
        total: incidents.length,
        bySeverity,
        byStatus,
        ndisReportable,
        ndisNotified,
        pendingNdisNotification: ndisReportable - ndisNotified,
      },
      incidents: incidentDetails.sort((a, b) => b.date.localeCompare(a.date)),
    };
  },
});

// Get upcoming payments
export const getUpcomingPayments = internalQuery({
  args: {
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.daysAhead || 14;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    // Get all active participants with their plans
    const participants = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const upcomingPayments = await Promise.all(
      participants.map(async (participant) => {
        const plan = await ctx.db
          .query("participantPlans")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .filter((q) => q.eq(q.field("planStatus"), "current"))
          .first();

        if (!plan) return null;

        const dwelling = participant.dwellingId ? await ctx.db.get(participant.dwellingId) : null;
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        // Get last payment
        const payments = await ctx.db
          .query("payments")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .collect();

        const lastPayment = payments
          .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0];

        // Calculate expected monthly SDA
        const monthlySda = plan.monthlySdaAmount || (plan.annualSdaBudget ? plan.annualSdaBudget / 12 : 0);

        // Calculate monthly RRC
        let monthlyRrc = plan.reasonableRentContribution || 0;
        if (plan.rentContributionFrequency === "weekly") {
          monthlyRrc = monthlyRrc * 52 / 12;
        } else if (plan.rentContributionFrequency === "fortnightly") {
          monthlyRrc = monthlyRrc * 26 / 12;
        }

        // Determine claim day (using default of 15th)
        const claimDay = 15;
        let nextClaimDate = new Date(today.getFullYear(), today.getMonth(), claimDay);
        if (nextClaimDate <= today) {
          nextClaimDate = new Date(today.getFullYear(), today.getMonth() + 1, claimDay);
        }

        // Check if within date range
        if (nextClaimDate > futureDate) return null;

        return {
          participant: `${participant.firstName} ${participant.lastName}`,
          location: property ? `${property.propertyName || property.addressLine1}` : "Unassigned",
          dwelling: dwelling?.dwellingName || "N/A",
          expectedSda: monthlySda,
          expectedRrc: monthlyRrc,
          totalExpected: monthlySda + monthlyRrc,
          claimDate: nextClaimDate.toISOString().split("T")[0],
          daysUntil: daysUntil(nextClaimDate.toISOString().split("T")[0]),
          lastPaymentDate: lastPayment?.paymentDate || null,
          fundingType: plan.fundingManagementType,
        };
      })
    );

    const filtered = upcomingPayments.filter((p) => p !== null);
    const sorted = filtered.sort((a, b) => a!.daysUntil - b!.daysUntil);

    // Calculate totals
    const totalExpectedSda = filtered.reduce((sum, p) => sum + (p?.expectedSda || 0), 0);
    const totalExpectedRrc = filtered.reduce((sum, p) => sum + (p?.expectedRrc || 0), 0);

    return {
      period: {
        days,
        start: today.toISOString().split("T")[0],
        end: futureDate.toISOString().split("T")[0],
      },
      totals: {
        expectedSda: totalExpectedSda,
        expectedRrc: totalExpectedRrc,
        totalExpected: totalExpectedSda + totalExpectedRrc,
        participantCount: filtered.length,
      },
      payments: sorted,
    };
  },
});

// Get monthly summary
export const getMonthlySummary = internalQuery({
  args: {
    month: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const monthStr = args.month || now.toISOString().slice(0, 7);
    const [year, month] = monthStr.split("-").map(Number);

    const monthStart = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const monthEnd = new Date(year, month, 0).toISOString().split("T")[0];

    // Get all payments for the month
    const payments = await ctx.db.query("payments").collect();
    const monthPayments = payments.filter(
      (p) => p.paymentDate >= monthStart && p.paymentDate <= monthEnd
    );
    const totalIncome = monthPayments.reduce((sum, p) => sum + p.actualAmount, 0);

    // Get maintenance for the month
    const maintenance = await ctx.db.query("maintenanceRequests").collect();
    const monthMaintenance = maintenance.filter(
      (m) => m.reportedDate && m.reportedDate >= monthStart && m.reportedDate <= monthEnd
    );
    const maintenanceCosts = monthMaintenance.reduce((sum, m) => sum + (m.actualCost || 0), 0);
    const completedMaintenance = monthMaintenance.filter((m) => m.status === "completed").length;
    const openMaintenance = monthMaintenance.filter((m) => m.status !== "completed" && m.status !== "cancelled").length;

    // Get incidents for the month
    const incidents = await ctx.db.query("incidents").collect();
    const monthIncidents = incidents.filter(
      (i) => i.incidentDate >= monthStart && i.incidentDate <= monthEnd
    );

    // Get occupancy stats
    const participants = await ctx.db.query("participants").collect();
    const activeParticipants = participants.filter((p) => p.status === "active").length;

    const dwellings = await ctx.db.query("dwellings").collect();
    const totalCapacity = dwellings.reduce((sum, d) => sum + d.maxParticipants, 0);
    const occupancyPercent = totalCapacity > 0 ? Math.round((activeParticipants / totalCapacity) * 100) : 0;

    // Get expiring items
    const plans = await ctx.db
      .query("participantPlans")
      .filter((q) => q.eq(q.field("planStatus"), "current"))
      .collect();
    const expiringPlans = plans.filter((p) => {
      const expiry = daysUntil(p.planEndDate);
      return expiry >= 0 && expiry <= 30;
    }).length;

    const documents = await ctx.db.query("documents").collect();
    const expiringDocs = documents.filter((d) => {
      if (!d.expiryDate) return false;
      const expiry = daysUntil(d.expiryDate);
      return expiry >= 0 && expiry <= 30;
    }).length;

    // Properties count
    const properties = await ctx.db.query("properties").collect();

    return {
      month: monthStr,
      financial: {
        totalIncome,
        maintenanceCosts,
        netIncome: totalIncome - maintenanceCosts,
        paymentsReceived: monthPayments.length,
      },
      operations: {
        maintenanceCreated: monthMaintenance.length,
        maintenanceCompleted: completedMaintenance,
        maintenanceOpen: openMaintenance,
        incidents: monthIncidents.length,
      },
      occupancy: {
        activeParticipants,
        totalCapacity,
        occupancyPercent,
        properties: properties.length,
        dwellings: dwellings.length,
      },
      alerts: {
        expiringPlans,
        expiringDocuments: expiringDocs,
        overdueMaintenance: maintenance.filter(
          (m) => m.scheduledDate && m.scheduledDate < monthStart && m.status !== "completed" && m.status !== "cancelled"
        ).length,
      },
    };
  },
});

// Schedule inspection action
export const scheduleInspection = internalMutation({
  args: {
    propertyName: v.string(),
    dwellingName: v.optional(v.string()),
    scheduledDate: v.string(),
    templateName: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find property
    const properties = await ctx.db.query("properties").collect();
    const property = properties.find(
      (p) =>
        (p.propertyName && fuzzyMatch(args.propertyName, p.propertyName)) ||
        fuzzyMatch(args.propertyName, p.addressLine1)
    );

    if (!property) {
      return { success: false, error: `Property "${args.propertyName}" not found` };
    }

    // Find dwelling if specified
    let dwelling = null;
    if (args.dwellingName) {
      const dwellings = await ctx.db
        .query("dwellings")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .collect();
      dwelling = dwellings.find((d) => fuzzyMatch(args.dwellingName!, d.dwellingName));
    }

    // Find template
    const templateName = args.templateName || "BLS Property Inspection";
    const templates = await ctx.db.query("inspectionTemplates").collect();
    const template = templates.find((t) => fuzzyMatch(templateName, t.name));

    if (!template) {
      return { success: false, error: `Template "${templateName}" not found` };
    }

    const now = Date.now();

    // Count total items from template
    let totalItems = 0;
    for (const category of template.categories) {
      totalItems += category.items.length;
    }

    // Create inspection
    const inspectionId = await ctx.db.insert("inspections", {
      templateId: template._id,
      propertyId: property._id,
      dwellingId: dwelling?._id,
      inspectorId: args.userId,
      scheduledDate: args.scheduledDate,
      status: "scheduled",
      totalItems,
      completedItems: 0,
      passedItems: 0,
      failedItems: 0,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Create inspection items from template
    let itemOrder = 0;
    for (const category of template.categories) {
      for (const item of category.items) {
        await ctx.db.insert("inspectionItems", {
          inspectionId,
          category: category.name,
          itemName: item.name,
          itemOrder: itemOrder++,
          status: "pending",
          hasIssue: false,
          updatedAt: now,
        });
      }
    }

    return {
      success: true,
      message: `Scheduled inspection for ${property.propertyName || property.addressLine1}${dwelling ? ` (${dwelling.dwellingName})` : ""} on ${args.scheduledDate}`,
      inspectionId,
      property: property.propertyName || property.addressLine1,
      dwelling: dwelling?.dwellingName,
      scheduledDate: args.scheduledDate,
      template: template.name,
      totalItems,
    };
  },
});

// Execute action V2 (handles tool-based actions)
export const executeActionV2 = action({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    actionType: v.string(),
    params: v.object({
      // move_participant
      participantName: v.optional(v.string()),
      participant_name: v.optional(v.string()),
      targetDwellingName: v.optional(v.string()),
      target_dwelling: v.optional(v.string()),
      targetPropertyName: v.optional(v.string()),
      target_property: v.optional(v.string()),
      // create_maintenance / update_maintenance_status
      dwellingName: v.optional(v.string()),
      dwelling_name: v.optional(v.string()),
      propertyName: v.optional(v.string()),
      property_name: v.optional(v.string()),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      category: v.optional(v.string()),
      priority: v.optional(v.string()),
      maintenanceTitle: v.optional(v.string()),
      maintenance_title: v.optional(v.string()),
      newStatus: v.optional(v.string()),
      new_status: v.optional(v.string()),
      // record_payment
      amount: v.optional(v.number()),
      paymentDate: v.optional(v.string()),
      payment_date: v.optional(v.string()),
      periodStart: v.optional(v.string()),
      periodEnd: v.optional(v.string()),
      // schedule_inspection
      scheduledDate: v.optional(v.string()),
      scheduled_date: v.optional(v.string()),
      templateName: v.optional(v.string()),
      template_name: v.optional(v.string()),
    }),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; response: string; conversationId: string }> => {
    let result: { success: boolean; message?: string; error?: string } = { success: false };

    try {
      switch (args.actionType) {
        case "move_participant":
          result = await ctx.runMutation(internal.aiChatbot.moveParticipant, {
            participantName: (args.params.participant_name || args.params.participantName)!,
            targetDwellingName: (args.params.target_dwelling || args.params.targetDwellingName)!,
            targetPropertyName: (args.params.target_property || args.params.targetPropertyName)!,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "create_maintenance_request":
          result = await ctx.runMutation(internal.aiChatbot.createMaintenanceRequest, {
            dwellingName: (args.params.dwelling_name || args.params.dwellingName)!,
            propertyName: (args.params.property_name || args.params.propertyName)!,
            title: args.params.title!,
            description: args.params.description!,
            category: args.params.category || "general",
            priority: args.params.priority || "medium",
            userId: args.userId,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "update_maintenance_status":
          result = await ctx.runMutation(internal.aiChatbot.updateMaintenanceStatus, {
            maintenanceTitle: (args.params.maintenance_title || args.params.maintenanceTitle)!,
            dwellingName: (args.params.dwelling_name || args.params.dwellingName)!,
            newStatus: (args.params.new_status || args.params.newStatus)!,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "record_payment":
          result = await ctx.runMutation(internal.aiChatbot.recordPayment, {
            participantName: (args.params.participant_name || args.params.participantName)!,
            amount: args.params.amount!,
            paymentDate: (args.params.payment_date || args.params.paymentDate)!,
            periodStart: args.params.periodStart,
            periodEnd: args.params.periodEnd,
            userId: args.userId,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "update_participant_status":
          result = await ctx.runMutation(internal.aiChatbot.updateParticipantStatus, {
            participantName: (args.params.participant_name || args.params.participantName)!,
            newStatus: (args.params.new_status || args.params.newStatus)!,
          }) as { success: boolean; message?: string; error?: string };
          break;

        case "schedule_inspection":
          result = await ctx.runMutation(internal.aiChatbot.scheduleInspection, {
            propertyName: (args.params.property_name || args.params.propertyName)!,
            dwellingName: (args.params.dwelling_name || args.params.dwellingName)!,
            scheduledDate: (args.params.scheduled_date || args.params.scheduledDate)!,
            templateName: (args.params.template_name || args.params.templateName)!,
            userId: args.userId,
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
