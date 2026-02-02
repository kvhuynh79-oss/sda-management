import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all insurance policies with optional filters
export const getAll = query({
  args: {
    insuranceType: v.optional(v.string()),
    status: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    let policies = await ctx.db.query("insurancePolicies").collect();

    if (args.insuranceType) {
      policies = policies.filter(p => p.insuranceType === args.insuranceType);
    }
    if (args.status) {
      policies = policies.filter(p => p.status === args.status);
    }
    if (args.propertyId) {
      policies = policies.filter(p => p.propertyId === args.propertyId);
    }

    // Enrich with property data
    const enriched = await Promise.all(
      policies.map(async (policy) => {
        const property = policy.propertyId ? await ctx.db.get(policy.propertyId) : null;
        return { ...policy, property };
      })
    );

    return enriched.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  },
});

// Get policies expiring soon (within 60 days)
export const getExpiringSoon = query({
  args: {},
  handler: async (ctx) => {
    const policies = await ctx.db.query("insurancePolicies").collect();
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const expiring = policies.filter(policy => {
      const endDate = new Date(policy.endDate);
      return endDate > now && endDate <= sixtyDaysFromNow;
    });

    // Enrich with property data
    const enriched = await Promise.all(
      expiring.map(async (policy) => {
        const property = policy.propertyId ? await ctx.db.get(policy.propertyId) : null;
        return { ...policy, property };
      })
    );

    return enriched.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  },
});

// Get policy by ID
export const getById = query({
  args: { policyId: v.id("insurancePolicies") },
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) return null;

    const property = policy.propertyId ? await ctx.db.get(policy.propertyId) : null;

    return { ...policy, property };
  },
});

// Check if organization has required insurance coverage
export const checkRequiredCoverage = query({
  args: {},
  handler: async (ctx) => {
    const policies = await ctx.db.query("insurancePolicies").collect();
    const today = new Date();

    // Required insurance types for NDIS providers
    const requiredTypes = [
      { type: "public_liability", minCoverage: 20000000, name: "Public Liability ($20M minimum)" },
      { type: "professional_indemnity", minCoverage: 0, name: "Professional Indemnity" },
    ];

    const coverage = requiredTypes.map(required => {
      const matchingPolicies = policies.filter(
        p => p.insuranceType === required.type &&
        new Date(p.endDate) > today &&
        p.status !== "expired"
      );

      const hasCoverage = matchingPolicies.length > 0;
      const totalCoverage = matchingPolicies.reduce((sum, p) => sum + p.coverageAmount, 0);
      const meetsCoverage = totalCoverage >= required.minCoverage;

      return {
        type: required.type,
        name: required.name,
        hasCoverage,
        meetsCoverage,
        totalCoverage,
        requiredCoverage: required.minCoverage,
        policies: matchingPolicies,
      };
    });

    return coverage;
  },
});

// Create insurance policy
export const create = mutation({
  args: {
    insuranceType: v.union(
      v.literal("public_liability"),
      v.literal("professional_indemnity"),
      v.literal("building"),
      v.literal("contents"),
      v.literal("workers_compensation"),
      v.literal("cyber"),
      v.literal("directors_officers"),
      v.literal("other")
    ),
    policyName: v.string(),
    insurer: v.string(),
    policyNumber: v.string(),
    coverageAmount: v.number(),
    excessAmount: v.optional(v.number()),
    propertyId: v.optional(v.id("properties")),
    isOrganizationWide: v.optional(v.boolean()),
    startDate: v.string(),
    endDate: v.string(),
    renewalDate: v.optional(v.string()),
    annualPremium: v.optional(v.number()),
    paymentFrequency: v.optional(v.union(
      v.literal("annual"),
      v.literal("monthly"),
      v.literal("quarterly")
    )),
    policyDocumentStorageId: v.optional(v.id("_storage")),
    certificateStorageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const endDate = new Date(args.endDate);
    const today = new Date();
    const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    let status: "current" | "expiring_soon" | "expired" | "pending_renewal" = "current";
    if (endDate < today) {
      status = "expired";
    } else if (endDate <= sixtyDaysFromNow) {
      status = "expiring_soon";
    }

    return await ctx.db.insert("insurancePolicies", {
      ...args,
      status,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update insurance policy
export const update = mutation({
  args: {
    policyId: v.id("insurancePolicies"),
    policyName: v.optional(v.string()),
    insurer: v.optional(v.string()),
    policyNumber: v.optional(v.string()),
    coverageAmount: v.optional(v.number()),
    excessAmount: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    renewalDate: v.optional(v.string()),
    annualPremium: v.optional(v.number()),
    paymentFrequency: v.optional(v.union(
      v.literal("annual"),
      v.literal("monthly"),
      v.literal("quarterly")
    )),
    policyDocumentStorageId: v.optional(v.id("_storage")),
    certificateStorageId: v.optional(v.id("_storage")),
    status: v.optional(v.union(
      v.literal("current"),
      v.literal("expiring_soon"),
      v.literal("expired"),
      v.literal("pending_renewal")
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { policyId, ...updates } = args;
    const policy = await ctx.db.get(policyId);
    if (!policy) throw new Error("Policy not found");

    // Recalculate status if end date changed
    let status = updates.status;
    if (updates.endDate && !updates.status) {
      const endDate = new Date(updates.endDate);
      const today = new Date();
      const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

      if (endDate < today) {
        status = "expired";
      } else if (endDate <= sixtyDaysFromNow) {
        status = "expiring_soon";
      } else {
        status = "current";
      }
    }

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    if (status) filteredUpdates.status = status;

    await ctx.db.patch(policyId, filteredUpdates);
    return { success: true };
  },
});

// Delete insurance policy
export const remove = mutation({
  args: { policyId: v.id("insurancePolicies") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.policyId);
    return { success: true };
  },
});

// Update all policy statuses (run periodically via cron)
export const updateStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    const policies = await ctx.db.query("insurancePolicies").collect();
    const today = new Date();
    const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    let updated = 0;

    for (const policy of policies) {
      const endDate = new Date(policy.endDate);
      let newStatus: "current" | "expiring_soon" | "expired" | "pending_renewal" = policy.status;

      if (endDate < today && policy.status !== "expired" && policy.status !== "pending_renewal") {
        newStatus = "expired";
      } else if (endDate <= sixtyDaysFromNow && endDate > today && policy.status === "current") {
        newStatus = "expiring_soon";
      }

      if (newStatus !== policy.status) {
        await ctx.db.patch(policy._id, { status: newStatus, updatedAt: Date.now() });
        updated++;
      }
    }

    return { updated };
  },
});
