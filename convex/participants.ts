import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth } from "./authHelpers";
import { paginationArgs } from "./paginationHelpers";
import {
  validateRequiredString,
  validateNdisNumber,
  validateOptionalEmail,
  validateOptionalPhone,
  validateOptionalDate,
} from "./validationHelpers";

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

    // Validate inputs
    const validatedNdis = validateNdisNumber(args.ndisNumber);
    const validatedFirstName = validateRequiredString(args.firstName, "first name");
    const validatedLastName = validateRequiredString(args.lastName, "last name");
    const validatedEmail = validateOptionalEmail(args.email);
    const validatedPhone = validateOptionalPhone(args.phone);
    const validatedMoveInDate = validateOptionalDate(args.moveInDate, "move-in date");

    // Check if NDIS number already exists
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_ndisNumber", (q) => q.eq("ndisNumber", validatedNdis))
      .first();

    if (existing) {
      throw new Error("A participant with this NDIS number already exists");
    }

    const now = Date.now();
    // Use provided status, or default to active if moveInDate is provided, pending_move_in otherwise
    const status = args.status || (validatedMoveInDate ? "active" : "pending_move_in");

    const participantId = await ctx.db.insert("participants", {
      ndisNumber: validatedNdis,
      firstName: validatedFirstName,
      lastName: validatedLastName,
      dateOfBirth: args.dateOfBirth,
      email: validatedEmail,
      phone: validatedPhone,
      emergencyContactName: args.emergencyContactName,
      emergencyContactPhone: args.emergencyContactPhone,
      emergencyContactRelation: args.emergencyContactRelation,
      dwellingId: args.dwellingId,
      moveInDate: validatedMoveInDate,
      status,
      silProviderName: args.silProviderName,
      supportCoordinatorName: args.supportCoordinatorName,
      supportCoordinatorEmail: args.supportCoordinatorEmail,
      supportCoordinatorPhone: args.supportCoordinatorPhone,
      notes: args.notes,
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

    // Batch fetch all dwellings
    const dwellingIds = [...new Set(participants.map((p) => p.dwellingId))];
    const dwellings = await Promise.all(dwellingIds.map((id) => ctx.db.get(id)));
    const dwellingMap = new Map(dwellings.map((d, i) => [dwellingIds[i], d]));

    // Batch fetch all properties
    const propertyIds = [...new Set(dwellings.filter(Boolean).map((d) => d!.propertyId))];
    const properties = await Promise.all(propertyIds.map((id) => ctx.db.get(id)));
    const propertyMap = new Map(properties.map((p, i) => [propertyIds[i], p]));

    // Batch fetch all current plans
    const allPlans = await ctx.db
      .query("participantPlans")
      .withIndex("by_status", (q) => q.eq("planStatus", "current"))
      .collect();

    // Group plans by participant
    const plansByParticipant = new Map<string, typeof allPlans[0]>();
    for (const plan of allPlans) {
      plansByParticipant.set(plan.participantId, plan);
    }

    // Build result with pre-fetched data
    const participantsWithDetails = participants.map((participant) => {
      const dwelling = dwellingMap.get(participant.dwellingId);
      const property = dwelling ? propertyMap.get(dwelling.propertyId) : null;
      const currentPlan = plansByParticipant.get(participant._id);

      return {
        ...participant,
        dwelling,
        property,
        currentPlan,
      };
    });

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
    await requirePermission(ctx, args.userId, "participants", "update");
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
    await requirePermission(ctx, args.userId, "participants", "update");
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
    await requirePermission(ctx, args.userId, "participants", "update");
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

// Get participants with pagination
export const getAllPaginated = query({
  args: {
    ...paginationArgs,
    status: v.optional(v.string()),
    dwellingId: v.optional(v.id("dwellings")),
  },
  handler: async (ctx, args) => {
    // Build query based on filters
    let result;

    if (args.dwellingId) {
      // Filter by dwelling
      let dwellingQuery = ctx.db
        .query("participants")
        .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId!));
      if (!args.status) {
        dwellingQuery = dwellingQuery.filter((q) => q.neq(q.field("status"), "moved_out"));
      }
      result = await dwellingQuery.paginate(args.paginationOpts);
    } else if (args.status) {
      // Filter by status
      const statusQuery = ctx.db
        .query("participants")
        .withIndex("by_status", (q) => q.eq("status", args.status as any));
      result = await statusQuery.paginate(args.paginationOpts);
    } else {
      // Default: exclude moved_out
      const defaultQuery = ctx.db
        .query("participants")
        .filter((q) => q.neq(q.field("status"), "moved_out"));
      result = await defaultQuery.paginate(args.paginationOpts);
    }

    // Enrich with dwelling, property, and plan data
    const enrichedPage = await Promise.all(
      result.page.map(async (participant) => {
        const dwelling = await ctx.db.get(participant.dwellingId);
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

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

    return {
      ...result,
      page: enrichedPage,
    };
  },
});
