import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new dwelling
export const create = mutation({
  args: {
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
    maxParticipants: v.number(),
    weeklyRentAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dwellingId = await ctx.db.insert("dwellings", {
      ...args,
      currentOccupancy: 0,
      occupancyStatus: "vacant",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return dwellingId;
  },
});

// Get all dwellings for a property
export const getByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get participant count for each dwelling
    const dwellingsWithParticipants = await Promise.all(
      dwellings.map(async (dwelling) => {
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        return {
          ...dwelling,
          participants,
        };
      })
    );

    return dwellingsWithParticipants;
  },
});

// Get dwelling by ID
export const getById = query({
  args: { dwellingId: v.id("dwellings") },
  handler: async (ctx, args) => {
    const dwelling = await ctx.db.get(args.dwellingId);
    if (!dwelling) return null;

    const property = await ctx.db.get(dwelling.propertyId);
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return {
      ...dwelling,
      property,
      participants,
    };
  },
});

// Update dwelling
export const update = mutation({
  args: {
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
    maxParticipants: v.optional(v.number()),
    weeklyRentAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { dwellingId, ...updates } = args;
    
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(dwellingId, filteredUpdates);
    return { success: true };
  },
});

// Update occupancy (called when participants move in/out)
export const updateOccupancy = mutation({
  args: {
    dwellingId: v.id("dwellings"),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const dwelling = await ctx.db.get(args.dwellingId);
    if (!dwelling) throw new Error("Dwelling not found");

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

    return { currentOccupancy, occupancyStatus };
  },
});

// Delete (soft delete) dwelling
export const remove = mutation({
  args: { dwellingId: v.id("dwellings") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.dwellingId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
