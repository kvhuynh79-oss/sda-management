import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get provider settings
export const get = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("providerSettings").first();
    return settings;
  },
});

// Create or update provider settings
export const upsert = mutation({
  args: {
    providerName: v.optional(v.string()),
    ndisRegistrationNumber: v.optional(v.string()),
    abn: v.optional(v.string()),
    defaultGstCode: v.optional(v.string()),
    defaultSupportItemNumber: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    // RRC settings
    dspFortnightlyRate: v.optional(v.number()),
    dspPercentage: v.optional(v.number()),
    craFortnightlyRate: v.optional(v.number()),
    craPercentage: v.optional(v.number()),
    rrcLastUpdated: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("providerSettings").first();
    const now = Date.now();

    if (existing) {
      // Update existing settings
      const updates: Record<string, unknown> = { updatedAt: now };
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      // Create new settings
      const settingsId = await ctx.db.insert("providerSettings", {
        providerName: args.providerName || "Better Living Solutions P/L",
        ndisRegistrationNumber: args.ndisRegistrationNumber || "405 005 2336",
        abn: args.abn || "87 630 237 277",
        defaultGstCode: args.defaultGstCode || "GST",
        defaultSupportItemNumber: args.defaultSupportItemNumber || "",
        contactEmail: args.contactEmail,
        contactPhone: args.contactPhone,
        address: args.address,
        dspFortnightlyRate: args.dspFortnightlyRate || 1047.70, // Current DSP rate
        dspPercentage: args.dspPercentage || 25,
        craFortnightlyRate: args.craFortnightlyRate || 230.80, // Current CRA max rate
        craPercentage: args.craPercentage || 100,
        rrcLastUpdated: args.rrcLastUpdated || new Date().toISOString().split("T")[0],
        createdAt: now,
        updatedAt: now,
      });
      return settingsId;
    }
  },
});

// Update RRC rates only
export const updateRrcRates = mutation({
  args: {
    dspFortnightlyRate: v.number(),
    dspPercentage: v.number(),
    craFortnightlyRate: v.number(),
    craPercentage: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("providerSettings").first();
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    if (existing) {
      await ctx.db.patch(existing._id, {
        dspFortnightlyRate: args.dspFortnightlyRate,
        dspPercentage: args.dspPercentage,
        craFortnightlyRate: args.craFortnightlyRate,
        craPercentage: args.craPercentage,
        rrcLastUpdated: today,
        updatedAt: now,
      });
      return { success: true };
    } else {
      // Create with defaults and RRC values
      await ctx.db.insert("providerSettings", {
        providerName: "Better Living Solutions P/L",
        ndisRegistrationNumber: "405 005 2336",
        abn: "87 630 237 277",
        defaultGstCode: "GST",
        defaultSupportItemNumber: "",
        dspFortnightlyRate: args.dspFortnightlyRate,
        dspPercentage: args.dspPercentage,
        craFortnightlyRate: args.craFortnightlyRate,
        craPercentage: args.craPercentage,
        rrcLastUpdated: today,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }
  },
});

// Calculate RRC amounts for a participant
export const calculateRrc = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("providerSettings").first();

    // Default values if no settings exist
    const dspFortnightlyRate = settings?.dspFortnightlyRate || 1047.70;
    const dspPercentage = settings?.dspPercentage || 25;
    const craFortnightlyRate = settings?.craFortnightlyRate || 230.80;
    const craPercentage = settings?.craPercentage || 100;

    const dspContribution = (dspFortnightlyRate * dspPercentage) / 100;
    const craContribution = (craFortnightlyRate * craPercentage) / 100;
    const totalFortnightly = dspContribution + craContribution;

    return {
      dspFortnightlyRate,
      dspPercentage,
      dspContribution,
      craFortnightlyRate,
      craPercentage,
      craContribution,
      totalFortnightly,
      totalWeekly: totalFortnightly / 2,
      totalMonthly: (totalFortnightly * 26) / 12,
      totalAnnual: totalFortnightly * 26,
      lastUpdated: settings?.rrcLastUpdated || null,
    };
  },
});
