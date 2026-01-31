import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new property
export const create = mutation({
  args: {
    propertyName: v.optional(v.string()),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    suburb: v.string(),
    state: v.union(
      v.literal("NSW"),
      v.literal("VIC"),
      v.literal("QLD"),
      v.literal("SA"),
      v.literal("WA"),
      v.literal("TAS"),
      v.literal("NT"),
      v.literal("ACT")
    ),
    postcode: v.string(),
    propertyStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("under_construction"),
        v.literal("sil_property")
      )
    ),
    expectedCompletionDate: v.optional(v.string()),
    silProviderName: v.optional(v.string()),
    ownerId: v.id("owners"),
    ownershipType: v.union(v.literal("investor"), v.literal("self_owned")),
    revenueSharePercent: v.optional(v.number()),
    managementFeePercent: v.optional(v.number()), // % of revenue kept as management fee (0-100)
    sdaRegistrationNumber: v.optional(v.string()),
    sdaRegistrationDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const propertyId = await ctx.db.insert("properties", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return propertyId;
  },
});

// Get all properties with owner info
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const properties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get owner details and dwelling counts for each property
    const propertiesWithDetails = await Promise.all(
      properties.map(async (property) => {
        const owner = await ctx.db.get(property.ownerId);
        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        const totalCapacity = dwellings.reduce((sum, d) => sum + d.maxParticipants, 0);
        const currentOccupancy = dwellings.reduce((sum, d) => sum + d.currentOccupancy, 0);

        return {
          ...property,
          owner,
          dwellingCount: dwellings.length,
          totalCapacity,
          currentOccupancy,
          vacancies: totalCapacity - currentOccupancy,
        };
      })
    );

    return propertiesWithDetails;
  },
});

// Get property by ID with full details
export const getById = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const property = await ctx.db.get(args.propertyId);
    if (!property) return null;

    const owner = await ctx.db.get(property.ownerId);
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return {
      ...property,
      owner,
      dwellings,
    };
  },
});

// Update property
export const update = mutation({
  args: {
    propertyId: v.id("properties"),
    propertyName: v.optional(v.string()),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.union(
      v.literal("NSW"),
      v.literal("VIC"),
      v.literal("QLD"),
      v.literal("SA"),
      v.literal("WA"),
      v.literal("TAS"),
      v.literal("NT"),
      v.literal("ACT")
    )),
    postcode: v.optional(v.string()),
    propertyStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("under_construction"),
        v.literal("sil_property")
      )
    ),
    expectedCompletionDate: v.optional(v.string()),
    silProviderName: v.optional(v.string()),
    ownerId: v.optional(v.id("owners")),
    ownershipType: v.optional(v.union(v.literal("investor"), v.literal("self_owned"))),
    revenueSharePercent: v.optional(v.number()),
    managementFeePercent: v.optional(v.number()), // % of revenue kept as management fee (0-100)
    sdaRegistrationNumber: v.optional(v.string()),
    sdaRegistrationDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { propertyId, ...updates } = args;
    
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(propertyId, filteredUpdates);
    return { success: true };
  },
});

// Delete (soft delete) property
export const remove = mutation({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.propertyId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
