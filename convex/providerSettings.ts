import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenant } from "./authHelpers";

// Get provider settings for the current user's organization
export const get = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!args.userId) return null;

    const { organizationId } = await requireTenant(ctx, args.userId);

    const settings = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .first();

    return settings;
  },
});

// Create or update provider settings (scoped to user's organization)
export const upsert = mutation({
  args: {
    userId: v.id("users"),
    providerName: v.optional(v.string()),
    ndisRegistrationNumber: v.optional(v.string()),
    abn: v.optional(v.string()),
    defaultGstCode: v.optional(v.string()),
    defaultSupportItemNumber: v.optional(v.string()),
    orgAbbreviation: v.optional(v.string()), // Short code for CSV filenames, e.g. "BLS", "AAH"
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    signatoryName: v.optional(v.string()),
    signatoryTitle: v.optional(v.string()),
    bankBsb: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
    // RRC settings
    dspFortnightlyRate: v.optional(v.number()),
    dspPercentage: v.optional(v.number()),
    craFortnightlyRate: v.optional(v.number()),
    craPercentage: v.optional(v.number()),
    rrcLastUpdated: v.optional(v.string()),
    // MTA settings
    mtaDailyRate: v.optional(v.number()),
    mtaSupportItemNumber: v.optional(v.string()),
    mtaLastUpdated: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    // Find existing settings for THIS organization only
    const existing = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .first();

    if (existing) {
      // Update existing settings
      const updates: Record<string, unknown> = { updatedAt: now };
      for (const [key, value] of Object.entries(args)) {
        if (key !== "userId" && value !== undefined) {
          updates[key] = value;
        }
      }
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      // Create new settings for this organization
      const settingsId = await ctx.db.insert("providerSettings", {
        organizationId,
        providerName: args.providerName || "",
        ndisRegistrationNumber: args.ndisRegistrationNumber || "",
        abn: args.abn || "",
        defaultGstCode: args.defaultGstCode || "P2",
        defaultSupportItemNumber: args.defaultSupportItemNumber || "",
        contactEmail: args.contactEmail,
        contactPhone: args.contactPhone,
        address: args.address,
        signatoryName: args.signatoryName,
        signatoryTitle: args.signatoryTitle,
        bankBsb: args.bankBsb,
        bankAccountNumber: args.bankAccountNumber,
        bankAccountName: args.bankAccountName,
        dspFortnightlyRate: args.dspFortnightlyRate || 1047.70,
        dspPercentage: args.dspPercentage || 25,
        craFortnightlyRate: args.craFortnightlyRate || 230.80,
        craPercentage: args.craPercentage || 100,
        rrcLastUpdated: args.rrcLastUpdated || new Date().toISOString().split("T")[0],
        createdAt: now,
        updatedAt: now,
      });
      return settingsId;
    }
  },
});

// Update RRC rates only (scoped to user's organization)
export const updateRrcRates = mutation({
  args: {
    userId: v.id("users"),
    dspFortnightlyRate: v.number(),
    dspPercentage: v.number(),
    craFortnightlyRate: v.number(),
    craPercentage: v.number(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    const existing = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .first();

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
      // Create with defaults and RRC values for this organization
      await ctx.db.insert("providerSettings", {
        organizationId,
        providerName: "",
        ndisRegistrationNumber: "",
        abn: "",
        defaultGstCode: "P2",
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

// Update MTA (Medium Term Accommodation) settings (scoped to user's organization)
export const updateMtaSettings = mutation({
  args: {
    userId: v.id("users"),
    mtaDailyRate: v.number(),
    mtaSupportItemNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    const existing = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .first();

    if (existing) {
      const patch: Record<string, unknown> = {
        mtaDailyRate: args.mtaDailyRate,
        mtaLastUpdated: today,
        updatedAt: now,
      };
      if (args.mtaSupportItemNumber !== undefined) {
        patch.mtaSupportItemNumber = args.mtaSupportItemNumber;
      }
      await ctx.db.patch(existing._id, patch);
      return { success: true };
    } else {
      // Create with defaults and MTA values for this organization
      await ctx.db.insert("providerSettings", {
        organizationId,
        providerName: "",
        ndisRegistrationNumber: "",
        abn: "",
        defaultGstCode: "P2",
        defaultSupportItemNumber: "",
        mtaDailyRate: args.mtaDailyRate,
        mtaSupportItemNumber: args.mtaSupportItemNumber || "01_082_0115_1_1",
        mtaLastUpdated: today,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }
  },
});

// ── Easy Read Template Management ─────────────────────────

// Generate upload URL for Easy Read PDF template
export const generateTemplateUploadUrl = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);
    return await ctx.storage.generateUploadUrl();
  },
});

// Save Easy Read template reference after upload
export const saveEasyReadTemplate = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    const existing = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        easyReadTemplateStorageId: args.storageId,
        easyReadTemplateFileName: args.fileName,
        easyReadTemplateUploadedAt: now,
        updatedAt: now,
      });
      return { success: true };
    } else {
      await ctx.db.insert("providerSettings", {
        organizationId,
        providerName: "",
        ndisRegistrationNumber: "",
        abn: "",
        defaultGstCode: "P2",
        defaultSupportItemNumber: "",
        easyReadTemplateStorageId: args.storageId,
        easyReadTemplateFileName: args.fileName,
        easyReadTemplateUploadedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }
  },
});

// Remove Easy Read template
export const removeEasyReadTemplate = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    const existing = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .first();

    if (existing) {
      // Delete the stored file if it exists
      if (existing.easyReadTemplateStorageId) {
        try {
          await ctx.storage.delete(existing.easyReadTemplateStorageId as any);
        } catch {
          // File may already be deleted
        }
      }

      await ctx.db.patch(existing._id, {
        easyReadTemplateStorageId: undefined,
        easyReadTemplateFileName: undefined,
        easyReadTemplateUploadedAt: undefined,
        updatedAt: now,
      });
      return { success: true };
    }

    return { success: false, error: "No settings found" };
  },
});

// Save Easy Read field map (JSON positions for template overlay)
export const saveEasyReadFieldMap = mutation({
  args: {
    userId: v.id("users"),
    fieldMapJson: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    // Validate JSON
    try {
      JSON.parse(args.fieldMapJson);
    } catch {
      throw new Error("Invalid JSON for field map");
    }

    const existing = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        easyReadFieldMap: args.fieldMapJson,
        updatedAt: now,
      });
      return { success: true };
    } else {
      await ctx.db.insert("providerSettings", {
        organizationId,
        providerName: "",
        ndisRegistrationNumber: "",
        abn: "",
        defaultGstCode: "P2",
        defaultSupportItemNumber: "",
        easyReadFieldMap: args.fieldMapJson,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }
  },
});

// Get Easy Read template URL (resolves storage ID to downloadable URL)
export const getEasyReadTemplateUrl = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!args.userId) return null;

    const { organizationId } = await requireTenant(ctx, args.userId);

    const settings = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .first();

    if (!settings?.easyReadTemplateStorageId) return null;

    try {
      const url = await ctx.storage.getUrl(settings.easyReadTemplateStorageId as any);
      return {
        url: url ?? null,
        fileName: settings.easyReadTemplateFileName ?? "template.pdf",
        uploadedAt: settings.easyReadTemplateUploadedAt ?? null,
        fieldMap: settings.easyReadFieldMap ?? null,
      };
    } catch {
      return null;
    }
  },
});

// Calculate RRC amounts for the current user's organization
export const calculateRrc = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let settings = null;
    if (args.userId) {
      const { organizationId } = await requireTenant(ctx, args.userId);
      settings = await ctx.db
        .query("providerSettings")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .first();
    }

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
