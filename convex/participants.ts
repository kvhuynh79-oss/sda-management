import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth } from "./authHelpers";

// Create a new participant
export const create = mutation({
  args: {
    userId: v.id("users"), // Required for audit logging
    ndisNumber: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),
    dwellingId: v.id("dwellings"),
    moveInDate: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("pending_move_in"))),
    silProviderName: v.optional(v.string()),
    supportCoordinatorName: v.optional(v.string()),
    supportCoordinatorEmail: v.optional(v.string()),
    supportCoordinatorPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user has permission
    const user = await requirePermission(ctx, args.userId, "participants", "create");

    // Check if NDIS number already exists
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_ndisNumber", (q) => q.eq("ndisNumber", args.ndisNumber))
      .first();

    if (existing) {
      throw new Error("A participant with this NDIS number already exists");
    }

    const now = Date.now();
    // Use provided status, or default to active if moveInDate is provided, pending_move_in otherwise
    const status = args.status || (args.moveInDate ? "active" : "pending_move_in");

    const { status: _, userId, ...restArgs } = args;
    const participantId = await ctx.db.insert("participants", {
      ...restArgs,
      status,
      createdAt: now,
      updatedAt: now,
    });

    // Update dwelling occupancy (only counts active participants)
    await updateDwellingOccupancy(ctx, args.dwellingId);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "participant",
      entityId: participantId,
      entityName: `${args.firstName} ${args.lastName}`,
      metadata: JSON.stringify({ ndisNumber: args.ndisNumber, status }),
    });

    return participantId;
  },
});

// Helper to update dwelling occupancy
async function updateDwellingOccupancy(ctx: any, dwellingId: any) {
  const participants = await ctx.db
    .query("participants")
    .withIndex("by_dwelling", (q: any) => q.eq("dwellingId", dwellingId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect();

  const dwelling = await ctx.db.get(dwellingId);
  if (!dwelling) return;

  const currentOccupancy = participants.length;
  let occupancyStatus: "vacant" | "partially_occupied" | "fully_occupied";

  if (currentOccupancy === 0) {
    occupancyStatus = "vacant";
  } else if (currentOccupancy >= dwelling.maxParticipants) {
    occupancyStatus = "fully_occupied";
  } else {
    occupancyStatus = "partially_occupied";
  }

  await ctx.db.patch(dwellingId, {
    currentOccupancy,
    occupancyStatus,
    updatedAt: Date.now(),
  });
}

// Get all participants with dwelling and property info
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const participants = await ctx.db
      .query("participants")
      .filter((q) => q.neq(q.field("status"), "moved_out"))
      .collect();

    const participantsWithDetails = await Promise.all(
      participants.map(async (participant) => {
        const dwelling = await ctx.db.get(participant.dwellingId);
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;
        
        // Get current plan
        const plans = await ctx.db
          .query("participantPlans")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .collect();
        
        const currentPlan = plans.find((p) => p.planStatus === "current");

        return {
          ...participant,
          dwelling,
          property,
          currentPlan,
        };
      })
    );

    return participantsWithDetails;
  },
});

// Get participant by ID with full details
export const getById = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) return null;

    const dwelling = await ctx.db.get(participant.dwellingId);
    const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

    const plans = await ctx.db
      .query("participantPlans")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .collect();

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .collect();

    return {
      ...participant,
      dwelling,
      property,
      plans,
      payments,
    };
  },
});

// Update participant
export const update = mutation({
  args: {
    userId: v.id("users"), // Required for audit logging
    participantId: v.id("participants"),
    ndisNumber: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),
    dwellingId: v.optional(v.id("dwellings")),
    silProviderName: v.optional(v.string()),
    supportCoordinatorName: v.optional(v.string()),
    supportCoordinatorEmail: v.optional(v.string()),
    supportCoordinatorPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user has permission
    const user = await requirePermission(ctx, args.userId, "participants", "update");

    const { participantId, userId, ...updates } = args;
    const participant = await ctx.db.get(participantId);
    if (!participant) throw new Error("Participant not found");

    const oldDwellingId = participant.dwellingId;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(participantId, filteredUpdates);

    // Update occupancy if dwelling changed
    if (updates.dwellingId && updates.dwellingId !== oldDwellingId) {
      await updateDwellingOccupancy(ctx, oldDwellingId);
      await updateDwellingOccupancy(ctx, updates.dwellingId);
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "participant",
      entityId: participantId,
      entityName: `${participant.firstName} ${participant.lastName}`,
      changes: JSON.stringify(filteredUpdates),
    });

    return { success: true };
  },
});

// Revert participant to pending move-in status (undo move-in)
export const revertToPending = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    if (participant.status !== "active") {
      throw new Error("Can only revert active participants to pending");
    }

    // Just update status - keep moveInDate for reference (it will be overwritten on next move-in)
    await ctx.db.patch(args.participantId, {
      status: "pending_move_in",
      updatedAt: Date.now(),
    });

    // Update dwelling occupancy
    await updateDwellingOccupancy(ctx, participant.dwellingId);

    return { success: true };
  },
});

// Move participant in (change status from pending_move_in to active)
export const moveIn = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    moveInDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    if (participant.status !== "pending_move_in") {
      throw new Error("Participant is not in pending move-in status");
    }

    await ctx.db.patch(args.participantId, {
      status: "active",
      moveInDate: args.moveInDate,
      updatedAt: Date.now(),
    });

    // Update dwelling occupancy
    await updateDwellingOccupancy(ctx, participant.dwellingId);

    return { success: true };
  },
});

// Move participant out
export const moveOut = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    moveOutDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    await ctx.db.patch(args.participantId, {
      status: "moved_out",
      moveOutDate: args.moveOutDate,
      updatedAt: Date.now(),
    });

    // Update dwelling occupancy
    await updateDwellingOccupancy(ctx, participant.dwellingId);

    return { success: true };
  },
});

// Get participants by dwelling
export const getByDwelling = query({
  args: { dwellingId: v.id("dwellings") },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return participants;
  },
});
