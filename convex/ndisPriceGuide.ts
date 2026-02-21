import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireTenant, requireActiveSubscription, requireAdmin } from "./authHelpers";

// ============================================================================
// N3: NDIS Price Guide — SDA rate lookups and validation
// ============================================================================

// Current SDA price guide rates (FY 2024-25) — prices in cents
// These are seeded on first use and can be updated via admin UI
const SDA_SEED_RATES = [
  // High Physical Support
  { supportItemNumber: "01_011_0116_8_1", supportItemName: "SDA - High Physical Support - New Build", registrationGroup: "Specialist Disability Accommodation", supportCategory: "SDA", unitOfMeasure: "per annum", priceNational: 7962000, sdaCategory: "high_physical_support", sdaBuildingType: "new_build" },
  { supportItemNumber: "01_012_0116_8_1", supportItemName: "SDA - High Physical Support - Existing", registrationGroup: "Specialist Disability Accommodation", supportCategory: "SDA", unitOfMeasure: "per annum", priceNational: 5442000, sdaCategory: "high_physical_support", sdaBuildingType: "existing" },
  // Fully Accessible
  { supportItemNumber: "01_021_0116_8_1", supportItemName: "SDA - Fully Accessible - New Build", registrationGroup: "Specialist Disability Accommodation", supportCategory: "SDA", unitOfMeasure: "per annum", priceNational: 4620000, sdaCategory: "fully_accessible", sdaBuildingType: "new_build" },
  { supportItemNumber: "01_022_0116_8_1", supportItemName: "SDA - Fully Accessible - Existing", registrationGroup: "Specialist Disability Accommodation", supportCategory: "SDA", unitOfMeasure: "per annum", priceNational: 3159000, sdaCategory: "fully_accessible", sdaBuildingType: "existing" },
  // Robust
  { supportItemNumber: "01_031_0116_8_1", supportItemName: "SDA - Robust - New Build", registrationGroup: "Specialist Disability Accommodation", supportCategory: "SDA", unitOfMeasure: "per annum", priceNational: 3612000, sdaCategory: "robust", sdaBuildingType: "new_build" },
  { supportItemNumber: "01_032_0116_8_1", supportItemName: "SDA - Robust - Existing", registrationGroup: "Specialist Disability Accommodation", supportCategory: "SDA", unitOfMeasure: "per annum", priceNational: 2469000, sdaCategory: "robust", sdaBuildingType: "existing" },
  // Improved Liveability
  { supportItemNumber: "01_041_0116_8_1", supportItemName: "SDA - Improved Liveability - New Build", registrationGroup: "Specialist Disability Accommodation", supportCategory: "SDA", unitOfMeasure: "per annum", priceNational: 2856000, sdaCategory: "improved_liveability", sdaBuildingType: "new_build" },
  { supportItemNumber: "01_042_0116_8_1", supportItemName: "SDA - Improved Liveability - Existing", registrationGroup: "Specialist Disability Accommodation", supportCategory: "SDA", unitOfMeasure: "per annum", priceNational: 1953000, sdaCategory: "improved_liveability", sdaBuildingType: "existing" },
  // MTA Support Item
  { supportItemNumber: "01_082_0115_1_1", supportItemName: "Medium Term Accommodation", registrationGroup: "Assistance With Daily Life", supportCategory: "MTA", unitOfMeasure: "per day", priceNational: 33000, sdaCategory: undefined, sdaBuildingType: undefined },
];

// ── Queries ──────────────────────────────────────────────────────────────────

export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "ndisPriceGuide", "view");

    const rates = await ctx.db
      .query("ndisPriceGuide")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    return rates;
  },
});

export const getById = query({
  args: {
    id: v.id("ndisPriceGuide"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "ndisPriceGuide", "view");

    const rate = await ctx.db.get(args.id);
    if (!rate) {
      throw new Error("Price guide entry not found");
    }
    return rate;
  },
});

export const getByCategory = query({
  args: {
    sdaCategory: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "ndisPriceGuide", "view");

    const rates = await ctx.db
      .query("ndisPriceGuide")
      .withIndex("by_sdaCategory", (q) => q.eq("sdaCategory", args.sdaCategory))
      .collect();

    return rates.filter((r) => r.isActive);
  },
});

export const getBySupportItemNumber = query({
  args: {
    supportItemNumber: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "ndisPriceGuide", "view");

    const rates = await ctx.db
      .query("ndisPriceGuide")
      .withIndex("by_supportItemNumber", (q) => q.eq("supportItemNumber", args.supportItemNumber))
      .collect();

    return rates.filter((r) => r.isActive);
  },
});

/**
 * Get the correct SDA price rate for a specific combination
 */
export const getSDAPriceRate = query({
  args: {
    sdaCategory: v.string(),
    sdaBuildingType: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);

    const rates = await ctx.db
      .query("ndisPriceGuide")
      .withIndex("by_sdaCategory", (q) => q.eq("sdaCategory", args.sdaCategory))
      .collect();

    const matched = rates.find(
      (r) =>
        r.isActive &&
        r.sdaBuildingType === args.sdaBuildingType &&
        (!r.effectiveTo || r.effectiveTo >= new Date().toISOString().split("T")[0])
    );

    if (!matched) {
      return null;
    }

    return {
      supportItemNumber: matched.supportItemNumber,
      supportItemName: matched.supportItemName,
      priceNational: matched.priceNational,
      priceNSW: matched.priceNSW,
      priceVIC: matched.priceVIC,
      priceQLD: matched.priceQLD,
      unitOfMeasure: matched.unitOfMeasure,
      effectiveFrom: matched.effectiveFrom,
    };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    userId: v.id("users"),
    supportItemNumber: v.string(),
    supportItemName: v.string(),
    registrationGroup: v.string(),
    supportCategory: v.string(),
    unitOfMeasure: v.string(),
    priceNSW: v.number(),
    priceVIC: v.number(),
    priceQLD: v.number(),
    priceNational: v.number(),
    effectiveFrom: v.string(),
    effectiveTo: v.optional(v.string()),
    sdaCategory: v.optional(v.string()),
    sdaBuildingType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx, args.userId);
    const { organizationId } = await requireTenant(ctx, args.userId);

    const { userId, ...data } = args;
    const id = await ctx.db.insert("ndisPriceGuide", {
      ...data,
      isActive: true,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "ndis_price_guide",
      entityId: id,
      entityName: args.supportItemName,
    });

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("ndisPriceGuide"),
    userId: v.id("users"),
    priceNSW: v.optional(v.number()),
    priceVIC: v.optional(v.number()),
    priceQLD: v.optional(v.number()),
    priceNational: v.optional(v.number()),
    effectiveTo: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx, args.userId);
    const { organizationId } = await requireTenant(ctx, args.userId);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Price guide entry not found");
    }

    const { id, userId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(args.id, filteredUpdates);

    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "ndis_price_guide",
      entityId: args.id,
      entityName: existing.supportItemName,
      changes: JSON.stringify(filteredUpdates),
    });

    return args.id;
  },
});

/**
 * Seed the price guide with current SDA rates
 */
export const seedRates = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx, args.userId);

    // Check if rates already exist
    const existingRates = await ctx.db
      .query("ndisPriceGuide")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    if (existingRates.length > 0) {
      return { message: "Rates already seeded", count: existingRates.length };
    }

    const today = new Date().toISOString().split("T")[0];
    let count = 0;
    for (const rate of SDA_SEED_RATES) {
      await ctx.db.insert("ndisPriceGuide", {
        ...rate,
        priceNSW: rate.priceNational, // Default to national rate
        priceVIC: rate.priceNational,
        priceQLD: rate.priceNational,
        effectiveFrom: today,
        isActive: true,
        createdAt: Date.now(),
      });
      count++;
    }

    return { message: `Seeded ${count} price guide rates`, count };
  },
});
