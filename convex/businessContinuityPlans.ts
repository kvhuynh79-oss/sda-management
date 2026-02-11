import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireTenant } from "./authHelpers";

// Get the organization's active BCP, or latest draft if no active plan exists
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allPlans = await ctx.db
      .query("businessContinuityPlans")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Prefer active plan, fall back to latest draft
    const activePlan = allPlans.find((p) => p.status === "active");
    if (activePlan) return activePlan;

    const drafts = allPlans
      .filter((p) => p.status === "draft")
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return drafts[0] ?? null;
  },
});

// Get BCP by ID
export const getById = query({
  args: {
    userId: v.id("users"),
    id: v.id("businessContinuityPlans"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const plan = await ctx.db.get(args.id);
    if (!plan) return null;
    if (plan.organizationId !== organizationId) {
      throw new Error("Access denied: Plan belongs to different organization");
    }
    return plan;
  },
});

// Get all BCPs for the organization
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allPlans = await ctx.db
      .query("businessContinuityPlans")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    return allPlans.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Create a new business continuity plan
export const create = mutation({
  args: {
    userId: v.id("users"),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("under_review"), v.literal("archived"))),
    version: v.optional(v.string()),
    lastReviewDate: v.optional(v.string()),
    nextReviewDate: v.optional(v.string()),
    businessDetails: v.optional(v.object({
      name: v.string(),
      abn: v.optional(v.string()),
      address: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
    })),
    keyPersonnel: v.optional(v.array(v.object({
      name: v.string(),
      role: v.string(),
      phone: v.string(),
      email: v.optional(v.string()),
      responsibilities: v.optional(v.string()),
    }))),
    criticalServices: v.optional(v.array(v.object({
      service: v.string(),
      provider: v.string(),
      contactPhone: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      alternativeProvider: v.optional(v.string()),
    }))),
    insuranceDetails: v.optional(v.array(v.object({
      type: v.string(),
      provider: v.string(),
      policyNumber: v.optional(v.string()),
      coverage: v.optional(v.string()),
      expiryDate: v.optional(v.string()),
    }))),
    riskScenarios: v.optional(v.array(v.object({
      scenario: v.string(),
      likelihood: v.string(),
      impact: v.string(),
      riskLevel: v.string(),
      mitigationSteps: v.optional(v.string()),
      recoverySteps: v.optional(v.string()),
      rto: v.optional(v.string()),
    }))),
    dataBackupProcedures: v.optional(v.object({
      method: v.optional(v.string()),
      frequency: v.optional(v.string()),
      location: v.optional(v.string()),
      responsiblePerson: v.optional(v.string()),
      lastTestedDate: v.optional(v.string()),
    })),
    communicationPlan: v.optional(v.object({
      internalNotification: v.optional(v.string()),
      externalNotification: v.optional(v.string()),
      mediaResponse: v.optional(v.string()),
    })),
    recoveryChecklist: v.optional(v.array(v.object({
      step: v.string(),
      description: v.optional(v.string()),
      responsible: v.optional(v.string()),
      completed: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    const {
      userId,
      status,
      version,
      keyPersonnel,
      criticalServices,
      insuranceDetails,
      riskScenarios,
      recoveryChecklist,
      ...rest
    } = args;

    return await ctx.db.insert("businessContinuityPlans", {
      organizationId,
      ...rest,
      status: status ?? "draft",
      version: version ?? "1.0",
      keyPersonnel: keyPersonnel ?? [],
      criticalServices: criticalServices ?? [],
      insuranceDetails: insuranceDetails ?? [],
      riskScenarios: riskScenarios ?? [],
      recoveryChecklist: recoveryChecklist ?? [],
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing business continuity plan
export const update = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("businessContinuityPlans"),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("under_review"), v.literal("archived"))),
    version: v.optional(v.string()),
    lastReviewDate: v.optional(v.string()),
    nextReviewDate: v.optional(v.string()),
    businessDetails: v.optional(v.object({
      name: v.string(),
      abn: v.optional(v.string()),
      address: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
    })),
    keyPersonnel: v.optional(v.array(v.object({
      name: v.string(),
      role: v.string(),
      phone: v.string(),
      email: v.optional(v.string()),
      responsibilities: v.optional(v.string()),
    }))),
    criticalServices: v.optional(v.array(v.object({
      service: v.string(),
      provider: v.string(),
      contactPhone: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      alternativeProvider: v.optional(v.string()),
    }))),
    insuranceDetails: v.optional(v.array(v.object({
      type: v.string(),
      provider: v.string(),
      policyNumber: v.optional(v.string()),
      coverage: v.optional(v.string()),
      expiryDate: v.optional(v.string()),
    }))),
    riskScenarios: v.optional(v.array(v.object({
      scenario: v.string(),
      likelihood: v.string(),
      impact: v.string(),
      riskLevel: v.string(),
      mitigationSteps: v.optional(v.string()),
      recoverySteps: v.optional(v.string()),
      rto: v.optional(v.string()),
    }))),
    dataBackupProcedures: v.optional(v.object({
      method: v.optional(v.string()),
      frequency: v.optional(v.string()),
      location: v.optional(v.string()),
      responsiblePerson: v.optional(v.string()),
      lastTestedDate: v.optional(v.string()),
    })),
    communicationPlan: v.optional(v.object({
      internalNotification: v.optional(v.string()),
      externalNotification: v.optional(v.string()),
      mediaResponse: v.optional(v.string()),
    })),
    recoveryChecklist: v.optional(v.array(v.object({
      step: v.string(),
      description: v.optional(v.string()),
      responsible: v.optional(v.string()),
      completed: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { id, userId, ...updates } = args;

    const plan = await ctx.db.get(id);
    if (!plan) throw new Error("Business continuity plan not found");
    if (plan.organizationId !== organizationId) {
      throw new Error("Access denied: Plan belongs to different organization");
    }

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, filteredUpdates);
    return { success: true };
  },
});

// Update status of a business continuity plan
export const updateStatus = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("businessContinuityPlans"),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("under_review"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const plan = await ctx.db.get(args.id);
    if (!plan) throw new Error("Business continuity plan not found");
    if (plan.organizationId !== organizationId) {
      throw new Error("Access denied: Plan belongs to different organization");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Delete a business continuity plan
export const remove = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("businessContinuityPlans"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const plan = await ctx.db.get(args.id);
    if (!plan) throw new Error("Business continuity plan not found");
    if (plan.organizationId !== organizationId) {
      throw new Error("Access denied: Plan belongs to different organization");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Get statistics for business continuity plans
export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allPlans = await ctx.db
      .query("businessContinuityPlans")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const today = new Date().toISOString().split("T")[0];
    const activePlan = allPlans.find((p) => p.status === "active");

    return {
      hasActivePlan: !!activePlan,
      totalPlans: allPlans.length,
      currentVersion: activePlan?.version ?? null,
      lastReviewDate: activePlan?.lastReviewDate ?? null,
      nextReviewDate: activePlan?.nextReviewDate ?? null,
      isOverdueReview: activePlan?.nextReviewDate
        ? activePlan.nextReviewDate < today
        : false,
    };
  },
});
