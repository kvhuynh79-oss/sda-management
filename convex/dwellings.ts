import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth, getUserFullName, requireTenant, enforcePlanLimit, requireActiveSubscription } from "./authHelpers";
import { formatChanges } from "./auditLog";
import { decryptField } from "./lib/encryption";

// Create a new dwelling
export const create = mutation({
  args: {
    userId: v.id("users"),
    propertyId: v.id("properties"),
    dwellingName: v.string(),
    dwellingType: v.union(
      v.literal("house"),
      v.literal("villa"),
      v.literal("apartment"),
      v.literal("unit")
    ),
    bedrooms: v.number(),
    bathrooms: v.optional(v.number()),
    sdaDesignCategory: v.union(
      v.literal("improved_liveability"),
      v.literal("fully_accessible"),
      v.literal("robust"),
      v.literal("high_physical_support")
    ),
    sdaBuildingType: v.union(v.literal("new_build"), v.literal("existing")),
    registrationDate: v.optional(v.string()), // Date when dwelling was registered for SDA
    sdaRegisteredAmount: v.optional(v.number()), // Annual SDA funding amount
    maxParticipants: v.number(),
    weeklyRentAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check + tenant context
    const user = await requirePermission(ctx, args.userId, "properties", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    // B2 FIX: Enforce plan limits on dwelling creation
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await enforcePlanLimit(ctx, organizationId, "dwellings", auditUser);
    // B5 FIX: Require active subscription for write operations
    await requireActiveSubscription(ctx, organizationId, auditUser);
    const { userId, ...dwellingData } = args;
    const now = Date.now();
    const dwellingId = await ctx.db.insert("dwellings", {
      ...dwellingData,
      organizationId,
      currentOccupancy: 0,
      occupancyStatus: "vacant",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "dwelling",
      entityId: dwellingId,
      entityName: args.dwellingName,
    });

    return dwellingId;
  },
});

// Get all dwellings for a property
export const getByProperty = query({
  args: { propertyId: v.id("properties"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .collect();

    // Get participant count for each dwelling
    const dwellingsWithParticipants = await Promise.all(
      dwellings.map(async (dwelling) => {
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        // Decrypt sensitive fields before returning to frontend
        const decryptedParticipants = await Promise.all(
          participants.map(async (p) => ({
            ...p,
            ndisNumber: await decryptField(p.ndisNumber) ?? p.ndisNumber,
          }))
        );

        return {
          ...dwelling,
          participants: decryptedParticipants,
        };
      })
    );

    return dwellingsWithParticipants;
  },
});

// Get dwelling by ID
export const getById = query({
  args: { dwellingId: v.id("dwellings"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const dwelling = await ctx.db.get(args.dwellingId);
    if (!dwelling) return null;

    // Verify org ownership
    if (dwelling.organizationId !== organizationId) {
      throw new Error("Access denied: Dwelling belongs to different organization");
    }

    const property = await ctx.db.get(dwelling.propertyId);
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Decrypt sensitive fields before returning to frontend
    const decryptedParticipants = await Promise.all(
      participants.map(async (p) => ({
        ...p,
        ndisNumber: await decryptField(p.ndisNumber) ?? p.ndisNumber,
      }))
    );

    return {
      ...dwelling,
      property,
      participants: decryptedParticipants,
    };
  },
});

// Update dwelling
export const update = mutation({
  args: {
    userId: v.id("users"),
    dwellingId: v.id("dwellings"),
    dwellingName: v.optional(v.string()),
    dwellingType: v.optional(v.union(
      v.literal("house"),
      v.literal("villa"),
      v.literal("apartment"),
      v.literal("unit")
    )),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    sdaDesignCategory: v.optional(v.union(
      v.literal("improved_liveability"),
      v.literal("fully_accessible"),
      v.literal("robust"),
      v.literal("high_physical_support")
    )),
    sdaBuildingType: v.optional(v.union(v.literal("new_build"), v.literal("existing"))),
    registrationDate: v.optional(v.string()),
    sdaRegisteredAmount: v.optional(v.number()), // Annual SDA funding amount
    maxParticipants: v.optional(v.number()),
    weeklyRentAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check + tenant context
    const user = await requirePermission(ctx, args.userId, "properties", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { dwellingId, userId, ...updates } = args;

    // Get current dwelling data for audit log
    const dwelling = await ctx.db.get(dwellingId);
    if (!dwelling) {
      throw new Error("Dwelling not found");
    }

    // Verify org ownership
    if (dwelling.organizationId !== organizationId) {
      throw new Error("Access denied: Dwelling belongs to different organization");
    }

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(dwellingId, filteredUpdates);

    // Audit log with previousValues
    const { changes, previousValues } = formatChanges(
      dwelling as Record<string, unknown>,
      { ...dwelling, ...filteredUpdates } as Record<string, unknown>
    );

    if (changes !== "{}") {
      // Only log if there are actual changes
      await ctx.runMutation(internal.auditLog.log, {
        userId: user._id,
        userEmail: user.email,
        userName: getUserFullName(user),
        action: "update",
        entityType: "dwelling",
        entityId: dwellingId,
        entityName: dwelling.dwellingName,
        changes,
        previousValues,
      });
    }

    return { success: true };
  },
});

// Update occupancy (called when participants move in/out)
export const updateOccupancy = mutation({
  args: {
    userId: v.id("users"),
    dwellingId: v.id("dwellings"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);
    const { organizationId } = await requireTenant(ctx, args.userId);

    const dwelling = await ctx.db.get(args.dwellingId);
    if (!dwelling) throw new Error("Dwelling not found");

    // Verify org ownership
    if (dwelling.organizationId !== organizationId) {
      throw new Error("Access denied: Dwelling belongs to different organization");
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Store previous occupancy for comparison
    const previousOccupancy = dwelling.currentOccupancy;
    const previousStatus = dwelling.occupancyStatus;

    const currentOccupancy = participants.length;
    let occupancyStatus: "vacant" | "partially_occupied" | "fully_occupied";

    if (currentOccupancy === 0) {
      occupancyStatus = "vacant";
    } else if (currentOccupancy >= dwelling.maxParticipants) {
      occupancyStatus = "fully_occupied";
    } else {
      occupancyStatus = "partially_occupied";
    }

    await ctx.db.patch(args.dwellingId, {
      currentOccupancy,
      occupancyStatus,
      updatedAt: Date.now(),
    });

    // Audit log occupancy changes (triggers NDIA notifications)
    // This is critical for compliance - NDIA must be notified of vacancy/occupancy changes
    if (previousOccupancy !== currentOccupancy || previousStatus !== occupancyStatus) {
      await ctx.runMutation(internal.auditLog.log, {
        userId: user._id,
        userEmail: user.email,
        userName: getUserFullName(user),
        action: "update",
        entityType: "dwelling",
        entityId: args.dwellingId,
        entityName: dwelling.dwellingName,
        changes: JSON.stringify({
          currentOccupancy,
          occupancyStatus,
        }),
        previousValues: JSON.stringify({
          currentOccupancy: previousOccupancy,
          occupancyStatus: previousStatus,
        }),
        metadata: JSON.stringify({
          occupancyChange: true,
          ndiaNotificationRequired: occupancyStatus === "vacant" || previousStatus === "vacant",
          participantCount: participants.length,
          maxParticipants: dwelling.maxParticipants,
        }),
      });
    }

    return { currentOccupancy, occupancyStatus };
  },
});

// Delete (soft delete) dwelling
export const remove = mutation({
  args: {
    userId: v.id("users"),
    dwellingId: v.id("dwellings"),
  },
  handler: async (ctx, args) => {
    // Permission check - only admin can delete
    const user = await requirePermission(ctx, args.userId, "properties", "delete");
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Get dwelling data before deletion for audit log
    const dwelling = await ctx.db.get(args.dwellingId);
    if (!dwelling) {
      throw new Error("Dwelling not found");
    }

    // Verify org ownership
    if (dwelling.organizationId !== organizationId) {
      throw new Error("Access denied: Dwelling belongs to different organization");
    }

    await ctx.db.patch(args.dwellingId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Audit log the deletion
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "delete",
      entityType: "dwelling",
      entityId: args.dwellingId,
      entityName: dwelling.dwellingName,
      metadata: JSON.stringify({
        softDelete: true,
        propertyId: dwelling.propertyId,
        sdaDesignCategory: dwelling.sdaDesignCategory,
      }),
    });

    return { success: true };
  },
});

// Get all dwellings with their property addresses (for bulk updates)
export const getAllWithAddresses = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const dwellingsWithAddresses = await Promise.all(
      dwellings.map(async (dwelling) => {
        const property = await ctx.db.get(dwelling.propertyId);
        return {
          _id: dwelling._id,
          dwellingName: dwelling.dwellingName,
          sdaDesignCategory: dwelling.sdaDesignCategory,
          maxParticipants: dwelling.maxParticipants,
          sdaRegisteredAmount: dwelling.sdaRegisteredAmount,
          propertyAddress: property
            ? `${property.addressLine1}, ${property.suburb} ${property.state} ${property.postcode}`
            : "Unknown",
          fullAddress: property
            ? `${dwelling.dwellingName} - ${property.addressLine1}, ${property.suburb} ${property.state} ${property.postcode}`
            : dwelling.dwellingName,
        };
      })
    );

    return dwellingsWithAddresses;
  },
});

// Bulk update SDA registered amounts
export const bulkUpdateSdaAmount = mutation({
  args: {
    userId: v.id("users"),
    updates: v.array(
      v.object({
        dwellingId: v.id("dwellings"),
        sdaRegisteredAmount: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();
    let updatedCount = 0;

    for (const update of args.updates) {
      // Verify org ownership for each dwelling
      const dwelling = await ctx.db.get(update.dwellingId);
      if (!dwelling) {
        throw new Error(`Dwelling not found: ${update.dwellingId}`);
      }
      if (dwelling.organizationId !== organizationId) {
        throw new Error(`Access denied: Dwelling ${update.dwellingId} belongs to different organization`);
      }

      await ctx.db.patch(update.dwellingId, {
        sdaRegisteredAmount: update.sdaRegisteredAmount,
        updatedAt: now,
      });
      updatedCount++;
    }

    return { success: true, updatedCount };
  },
});
