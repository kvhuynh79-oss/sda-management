import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth, requirePermission, getUserFullName } from "./authHelpers";

// Get all complaints with optional filters
export const getAll = query({
  args: {
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    severity: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    participantId: v.optional(v.id("participants")),
  },
  handler: async (ctx, args) => {
    let complaints = await ctx.db.query("complaints").collect();

    if (args.status) {
      complaints = complaints.filter(c => c.status === args.status);
    }
    if (args.category) {
      complaints = complaints.filter(c => c.category === args.category);
    }
    if (args.severity) {
      complaints = complaints.filter(c => c.severity === args.severity);
    }
    if (args.propertyId) {
      complaints = complaints.filter(c => c.propertyId === args.propertyId);
    }
    if (args.participantId) {
      complaints = complaints.filter(c => c.participantId === args.participantId);
    }

    // Enrich with related data
    const enriched = await Promise.all(
      complaints.map(async (complaint) => {
        const participant = complaint.participantId ? await ctx.db.get(complaint.participantId) : null;
        const property = complaint.propertyId ? await ctx.db.get(complaint.propertyId) : null;
        const receivedByUser = await ctx.db.get(complaint.receivedBy);
        const assignedToUser = complaint.assignedTo ? await ctx.db.get(complaint.assignedTo) : null;
        return { ...complaint, participant, property, receivedByUser, assignedToUser };
      })
    );

    return enriched.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
  },
});

// Get complaints requiring acknowledgment (received but not acknowledged within 5 business days)
export const getPendingAcknowledgment = query({
  args: {},
  handler: async (ctx) => {
    const complaints = await ctx.db.query("complaints")
      .filter(q => q.eq(q.field("status"), "received"))
      .collect();

    const today = new Date();

    // Filter to those needing acknowledgment (5 business days = roughly 7 calendar days)
    const needsAck = complaints.filter(c => {
      if (c.acknowledgedDate) return false;
      const receivedDate = new Date(c.receivedDate);
      const daysSinceReceived = Math.floor((today.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceReceived >= 3; // Flag when approaching deadline
    });

    // Enrich with related data
    const enriched = await Promise.all(
      needsAck.map(async (complaint) => {
        const participant = complaint.participantId ? await ctx.db.get(complaint.participantId) : null;
        const property = complaint.propertyId ? await ctx.db.get(complaint.propertyId) : null;
        return { ...complaint, participant, property };
      })
    );

    return enriched;
  },
});

// Get complaint by ID
export const getById = query({
  args: { complaintId: v.id("complaints") },
  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) return null;

    const participant = complaint.participantId ? await ctx.db.get(complaint.participantId) : null;
    const property = complaint.propertyId ? await ctx.db.get(complaint.propertyId) : null;
    const receivedByUser = await ctx.db.get(complaint.receivedBy);
    const assignedToUser = complaint.assignedTo ? await ctx.db.get(complaint.assignedTo) : null;

    return { ...complaint, participant, property, receivedByUser, assignedToUser };
  },
});

// Create complaint
export const create = mutation({
  args: {
    userId: v.id("users"),
    complainantType: v.union(
      v.literal("participant"),
      v.literal("family_carer"),
      v.literal("support_coordinator"),
      v.literal("sil_provider"),
      v.literal("staff"),
      v.literal("anonymous"),
      v.literal("other")
    ),
    complainantName: v.optional(v.string()),
    complainantContact: v.optional(v.string()),
    participantId: v.optional(v.id("participants")),
    propertyId: v.optional(v.id("properties")),
    complaintDate: v.string(),
    receivedDate: v.string(),
    category: v.union(
      v.literal("service_delivery"),
      v.literal("staff_conduct"),
      v.literal("property_condition"),
      v.literal("communication"),
      v.literal("billing"),
      v.literal("privacy"),
      v.literal("safety"),
      v.literal("other")
    ),
    description: v.string(),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    assignedTo: v.optional(v.id("users")),
    advocacyOffered: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Permission check
    const user = await requireAuth(ctx, args.userId);
    const { userId, ...complaintData } = args;
    const now = Date.now();

    const complaintId = await ctx.db.insert("complaints", {
      ...complaintData,
      receivedBy: userId,
      status: "received",
      acknowledgmentOverdue: false,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "complaint",
      entityId: complaintId,
      entityName: `${args.category} complaint`,
    });

    return complaintId;
  },
});

// Acknowledge complaint
export const acknowledge = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
    acknowledgmentMethod: v.union(
      v.literal("email"),
      v.literal("phone"),
      v.literal("letter"),
      v.literal("in_person")
    ),
    acknowledgedDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

    await ctx.db.patch(args.complaintId, {
      acknowledgedDate: args.acknowledgedDate,
      acknowledgmentMethod: args.acknowledgmentMethod,
      acknowledgmentOverdue: false,
      status: "acknowledged",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update complaint
export const update = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
    assignedTo: v.optional(v.id("users")),
    investigationNotes: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("received"),
      v.literal("acknowledged"),
      v.literal("under_investigation"),
      v.literal("resolved"),
      v.literal("closed"),
      v.literal("escalated")
    )),
    advocacyOffered: v.optional(v.boolean()),
    advocacyAccepted: v.optional(v.boolean()),
    advocacyProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const { complaintId, userId, ...updates } = args;
    const complaint = await ctx.db.get(complaintId);
    if (!complaint) throw new Error("Complaint not found");

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(complaintId, filteredUpdates);
    return { success: true };
  },
});

// Resolve complaint
export const resolve = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
    resolutionDate: v.string(),
    resolutionDescription: v.string(),
    resolutionOutcome: v.union(
      v.literal("upheld"),
      v.literal("partially_upheld"),
      v.literal("not_upheld"),
      v.literal("withdrawn")
    ),
    complainantSatisfied: v.optional(v.boolean()),
    systemicIssueIdentified: v.optional(v.boolean()),
    correctiveActionsTaken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const { complaintId, userId, ...resolution } = args;
    const complaint = await ctx.db.get(complaintId);
    if (!complaint) throw new Error("Complaint not found");

    await ctx.db.patch(complaintId, {
      ...resolution,
      status: "resolved",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Escalate to NDIS Commission
export const escalate = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
    escalationDate: v.string(),
    escalationReason: v.string(),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

    await ctx.db.patch(args.complaintId, {
      escalatedToNdisCommission: true,
      escalationDate: args.escalationDate,
      escalationReason: args.escalationReason,
      status: "escalated",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Close complaint
export const close = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

    await ctx.db.patch(args.complaintId, {
      status: "closed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete complaint
export const remove = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
  },
  handler: async (ctx, args) => {
    // Permission check - admin only
    await requirePermission(ctx, args.userId, "incidents", "delete");
    await ctx.db.delete(args.complaintId);
    return { success: true };
  },
});

// Check for overdue acknowledgments (run via cron)
export const checkOverdueAcknowledgments = mutation({
  args: {},
  handler: async (ctx) => {
    const complaints = await ctx.db.query("complaints")
      .filter(q => q.eq(q.field("status"), "received"))
      .collect();

    const today = new Date();
    let updated = 0;

    for (const complaint of complaints) {
      if (complaint.acknowledgedDate) continue;

      const receivedDate = new Date(complaint.receivedDate);
      // 5 business days ≈ 7 calendar days
      const dueDate = new Date(receivedDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (today > dueDate && !complaint.acknowledgmentOverdue) {
        await ctx.db.patch(complaint._id, {
          acknowledgmentOverdue: true,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    return { updated };
  },
});

// Get complaints statistics
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const complaints = await ctx.db.query("complaints").collect();

    const stats = {
      total: complaints.length,
      byStatus: {
        received: complaints.filter(c => c.status === "received").length,
        acknowledged: complaints.filter(c => c.status === "acknowledged").length,
        under_investigation: complaints.filter(c => c.status === "under_investigation").length,
        resolved: complaints.filter(c => c.status === "resolved").length,
        closed: complaints.filter(c => c.status === "closed").length,
        escalated: complaints.filter(c => c.status === "escalated").length,
      },
      bySeverity: {
        low: complaints.filter(c => c.severity === "low").length,
        medium: complaints.filter(c => c.severity === "medium").length,
        high: complaints.filter(c => c.severity === "high").length,
        critical: complaints.filter(c => c.severity === "critical").length,
      },
      overdueAcknowledgments: complaints.filter(c => c.acknowledgmentOverdue).length,
      escalatedToCommission: complaints.filter(c => c.escalatedToNdisCommission).length,
    };

    return stats;
  },
});
