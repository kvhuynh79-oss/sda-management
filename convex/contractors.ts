import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requirePermission, getUserFullName, requireTenant } from "./authHelpers";
import { assertValidEmail, assertValidPhone } from "./lib/validation";

// Get all contractors
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    // Use organizationId index for tenant isolation
    const contractors = await ctx.db
      .query("contractors")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get preferred properties for each contractor
    const contractorsWithProperties = await Promise.all(
      contractors.map(async (contractor) => {
        const properties = contractor.preferredProperties
          ? await Promise.all(
              contractor.preferredProperties.map(async (propId) => {
                const property = await ctx.db.get(propId);
                return property
                  ? {
                      _id: property._id,
                      propertyName: property.propertyName,
                      addressLine1: property.addressLine1,
                      suburb: property.suburb,
                    }
                  : null;
              })
            )
          : [];
        return {
          ...contractor,
          properties: properties.filter(Boolean),
        };
      })
    );

    return contractorsWithProperties;
  },
});

// Get contractor by ID
export const getById = query({
  args: { userId: v.id("users"), contractorId: v.id("contractors") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) return null;
    if (contractor.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    // Get preferred properties
    const properties = contractor.preferredProperties
      ? await Promise.all(
          contractor.preferredProperties.map(async (propId) => {
            const property = await ctx.db.get(propId);
            return property
              ? {
                  _id: property._id,
                  propertyName: property.propertyName,
                  addressLine1: property.addressLine1,
                  suburb: property.suburb,
                }
              : null;
          })
        )
      : [];

    return {
      ...contractor,
      properties: properties.filter(Boolean),
    };
  },
});

// Get contractors by specialty
export const getBySpecialty = query({
  args: { userId: v.id("users"), specialty: v.string() },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allContractors = await ctx.db
      .query("contractors")
      .withIndex("by_specialty", (q) => q.eq("specialty", args.specialty as any))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const contractors = allContractors.filter(c => c.organizationId === organizationId);
    return contractors;
  },
});

// Get contractors for a specific property
export const getByProperty = query({
  args: { userId: v.id("users"), propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    // Use organizationId index for tenant isolation
    const allContractors = await ctx.db
      .query("contractors")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter to contractors who have this property as preferred
    const propertyContractors = allContractors.filter((c) =>
      c.preferredProperties?.includes(args.propertyId)
    );

    return propertyContractors;
  },
});

// Create a new contractor
export const create = mutation({
  args: {
    userId: v.id("users"),
    companyName: v.string(),
    contactName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    abn: v.optional(v.string()),
    specialty: v.union(
      v.literal("plumbing"),
      v.literal("electrical"),
      v.literal("appliances"),
      v.literal("building"),
      v.literal("grounds"),
      v.literal("safety"),
      v.literal("general"),
      v.literal("multi_trade")
    ),
    secondarySpecialties: v.optional(v.array(v.string())),
    licenseNumber: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    preferredProperties: v.optional(v.array(v.id("properties"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate email and phone
    assertValidEmail(args.email);
    if (args.phone) assertValidPhone(args.phone, "Phone");

    // Permission check and get organizationId
    const user = await requirePermission(ctx, args.userId, "contractors", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { userId, ...contractorData } = args;
    const contractorId = await ctx.db.insert("contractors", {
      ...contractorData,
      organizationId,
      rating: undefined,
      totalJobsCompleted: 0,
      averageResponseTime: undefined,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "contractor",
      entityId: contractorId,
      entityName: args.companyName,
    });

    return contractorId;
  },
});

// Update a contractor
export const update = mutation({
  args: {
    userId: v.id("users"),
    contractorId: v.id("contractors"),
    companyName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    abn: v.optional(v.string()),
    specialty: v.optional(
      v.union(
        v.literal("plumbing"),
        v.literal("electrical"),
        v.literal("appliances"),
        v.literal("building"),
        v.literal("grounds"),
        v.literal("safety"),
        v.literal("general"),
        v.literal("multi_trade")
      )
    ),
    secondarySpecialties: v.optional(v.array(v.string())),
    licenseNumber: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    preferredProperties: v.optional(v.array(v.id("properties"))),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Permission check and get organizationId
    await requirePermission(ctx, args.userId, "contractors", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { contractorId, userId, ...updates } = args;

    const existing = await ctx.db.get(contractorId);
    if (!existing) throw new Error("Contractor not found");
    if (existing.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(contractorId, filteredUpdates);
    return contractorId;
  },
});

// Delete (deactivate) a contractor
export const remove = mutation({
  args: {
    userId: v.id("users"),
    contractorId: v.id("contractors"),
  },
  handler: async (ctx, args) => {
    // Permission check - only admin can delete
    await requirePermission(ctx, args.userId, "contractors", "delete");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) throw new Error("Contractor not found");
    if (contractor.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    await ctx.db.patch(args.contractorId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// Get contractor job history
export const getJobHistory = query({
  args: { userId: v.id("users"), contractorId: v.id("contractors") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) return null;
    if (contractor.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    // Get all quotes by this contractor
    const quotes = await ctx.db
      .query("maintenanceQuotes")
      .withIndex("by_contractor", (q) => q.eq("contractorId", args.contractorId))
      .collect();

    // Get maintenance requests for accepted quotes
    const jobHistory = await Promise.all(
      quotes
        .filter((q) => q.status === "accepted")
        .map(async (quote) => {
          const request = await ctx.db.get(quote.maintenanceRequestId);
          if (!request) return null;

          const dwelling = await ctx.db.get(request.dwellingId);
          const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

          return {
            quote,
            request,
            property: property
              ? {
                  _id: property._id,
                  propertyName: property.propertyName,
                  addressLine1: property.addressLine1,
                  suburb: property.suburb,
                }
              : null,
          };
        })
    );

    return {
      contractor,
      jobs: jobHistory.filter(Boolean),
      totalQuotes: quotes.length,
      acceptedQuotes: quotes.filter((q) => q.status === "accepted").length,
      totalValue: quotes
        .filter((q) => q.status === "accepted")
        .reduce((sum, q) => sum + q.quoteAmount, 0),
    };
  },
});