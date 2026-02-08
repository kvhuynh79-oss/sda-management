import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireTenant } from "./authHelpers";
import { internal } from "./_generated/api";

// Create a new plan
export const create = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    planStartDate: v.string(),
    planEndDate: v.string(),
    sdaEligibilityType: v.union(v.literal("standard"), v.literal("higher_needs")),
    sdaDesignCategory: v.union(
      v.literal("improved_liveability"),
      v.literal("fully_accessible"),
      v.literal("robust"),
      v.literal("high_physical_support")
    ),
    sdaBuildingType: v.union(v.literal("new_build"), v.literal("existing")),
    fundingManagementType: v.union(
      v.literal("ndia_managed"),
      v.literal("plan_managed"),
      v.literal("self_managed")
    ),
    planManagerName: v.optional(v.string()),
    planManagerEmail: v.optional(v.string()),
    planManagerPhone: v.optional(v.string()),
    annualSdaBudget: v.number(),
    monthlySdaAmount: v.number(),
    claimDay: v.optional(v.number()), // Day of month when claims are due (1-31)
    managementFeePercent: v.optional(v.number()), // % of revenue kept as management fee (0-100)
    dailySdaRate: v.optional(v.number()), // Deprecated
    reasonableRentContribution: v.optional(v.number()),
    rentContributionFrequency: v.optional(
      v.union(v.literal("weekly"), v.literal("fortnightly"), v.literal("monthly"))
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, organizationId } = await requireTenant(ctx, args.userId);

    // Get participant details and verify ownership
    const participant = await ctx.db.get(args.participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }
    if (participant.organizationId !== organizationId) {
      throw new Error("Access denied: participant belongs to different organization");
    }

    // Mark any existing current plans as expired
    const existingPlans = await ctx.db
      .query("participantPlans")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .filter((q) => q.eq(q.field("planStatus"), "current"))
      .collect();

    for (const plan of existingPlans) {
      await ctx.db.patch(plan._id, {
        planStatus: "expired",
        updatedAt: Date.now(),
      });
    }

    const now = Date.now();
    const { userId, ...planData } = args;
    const planId = await ctx.db.insert("participantPlans", {
      ...planData,
      organizationId,
      planStatus: "current",
      createdAt: now,
      updatedAt: now,
    });

    // Audit log: Plan created
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "participantPlan",
      entityId: planId,
      entityName: `Plan for ${participant.firstName} ${participant.lastName}`,
      metadata: JSON.stringify({
        participantId: args.participantId,
        annualSdaBudget: args.annualSdaBudget,
        monthlySdaAmount: args.monthlySdaAmount,
        planStartDate: args.planStartDate,
        planEndDate: args.planEndDate,
        sdaDesignCategory: args.sdaDesignCategory,
      }),
    });

    return planId;
  },
});

// Get plans for a participant
export const getByParticipant = query({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants")
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify participant belongs to user's organization
    const participant = await ctx.db.get(args.participantId);
    if (!participant || participant.organizationId !== organizationId) {
      return [];
    }

    const plans = await ctx.db
      .query("participantPlans")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .collect();

    return plans.sort((a, b) => 
      new Date(b.planStartDate).getTime() - new Date(a.planStartDate).getTime()
    );
  },
});

// Get current plan for a participant
export const getCurrentPlan = query({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants")
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify participant belongs to user's organization
    const participant = await ctx.db.get(args.participantId);
    if (!participant || participant.organizationId !== organizationId) {
      return null;
    }

    const plan = await ctx.db
      .query("participantPlans")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .filter((q) => q.eq(q.field("planStatus"), "current"))
      .first();

    return plan;
  },
});

// Update plan
export const update = mutation({
  args: {
    userId: v.id("users"),
    planId: v.id("participantPlans"),
    planStartDate: v.optional(v.string()),
    planEndDate: v.optional(v.string()),
    sdaEligibilityType: v.optional(v.union(v.literal("standard"), v.literal("higher_needs"))),
    sdaDesignCategory: v.optional(v.union(
      v.literal("improved_liveability"),
      v.literal("fully_accessible"),
      v.literal("robust"),
      v.literal("high_physical_support")
    )),
    sdaBuildingType: v.optional(v.union(v.literal("new_build"), v.literal("existing"))),
    fundingManagementType: v.optional(v.union(
      v.literal("ndia_managed"),
      v.literal("plan_managed"),
      v.literal("self_managed")
    )),
    planManagerName: v.optional(v.string()),
    planManagerEmail: v.optional(v.string()),
    planManagerPhone: v.optional(v.string()),
    annualSdaBudget: v.optional(v.number()),
    monthlySdaAmount: v.optional(v.number()),
    claimDay: v.optional(v.number()),
    managementFeePercent: v.optional(v.number()),
    dailySdaRate: v.optional(v.number()),
    reasonableRentContribution: v.optional(v.number()),
    rentContributionFrequency: v.optional(
      v.union(v.literal("weekly"), v.literal("fortnightly"), v.literal("monthly"))
    ),
    planStatus: v.optional(v.union(
      v.literal("current"),
      v.literal("expired"),
      v.literal("pending")
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, organizationId } = await requireTenant(ctx, args.userId);
    const { planId, userId, ...updates } = args;

    // Get current plan for audit logging (BEFORE update) and verify ownership
    const plan = await ctx.db.get(planId);
    if (!plan) {
      throw new Error("Plan not found");
    }
    if (plan.organizationId !== organizationId) {
      throw new Error("Access denied: plan belongs to different organization");
    }

    // Get participant details for audit logging
    const participant = await ctx.db.get(plan.participantId);

    // Capture previous values for NDIS compliance audit trail
    const previousValues: Record<string, unknown> = {
      annualSdaBudget: plan.annualSdaBudget,
      monthlySdaAmount: plan.monthlySdaAmount,
      planStartDate: plan.planStartDate,
      planEndDate: plan.planEndDate,
      sdaDesignCategory: plan.sdaDesignCategory,
      sdaEligibilityType: plan.sdaEligibilityType,
      sdaBuildingType: plan.sdaBuildingType,
      fundingManagementType: plan.fundingManagementType,
      planManagerName: plan.planManagerName,
      planManagerEmail: plan.planManagerEmail,
      planManagerPhone: plan.planManagerPhone,
      claimDay: plan.claimDay,
      managementFeePercent: plan.managementFeePercent,
      reasonableRentContribution: plan.reasonableRentContribution,
      rentContributionFrequency: plan.rentContributionFrequency,
      planStatus: plan.planStatus,
      notes: plan.notes,
    };

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(planId, filteredUpdates);

    // Build changes object (only include what actually changed)
    const changes: Record<string, unknown> = {};
    const prevValuesFiltered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filteredUpdates)) {
      if (key !== "updatedAt" && previousValues[key] !== value) {
        changes[key] = value;
        prevValuesFiltered[key] = previousValues[key];
      }
    }

    // Audit log: Plan updated (only if there are actual changes)
    if (Object.keys(changes).length > 0) {
      const participantName = participant
        ? `${participant.firstName} ${participant.lastName}`
        : "Unknown Participant";

      await ctx.runMutation(internal.auditLog.log, {
        userId: userId,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        action: "update",
        entityType: "participantPlan",
        entityId: planId,
        entityName: `Plan for ${participantName}`,
        changes: JSON.stringify(changes),
        previousValues: JSON.stringify(prevValuesFiltered),
      });
    }

    return { success: true };
  },
});

// Get all plans expiring soon (for alerts)
export const getExpiringSoon = query({
  args: {
    userId: v.id("users"),
    daysAhead: v.number()
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const plans = await ctx.db
      .query("participantPlans")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("planStatus"), "current"))
      .collect();

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + args.daysAhead);

    const expiringPlans = await Promise.all(
      plans
        .filter((plan) => {
          const endDate = new Date(plan.planEndDate);
          return endDate <= futureDate && endDate >= today;
        })
        .map(async (plan) => {
          const participant = await ctx.db.get(plan.participantId);
          return {
            ...plan,
            participant,
            daysUntilExpiry: Math.ceil(
              (new Date(plan.planEndDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            ),
          };
        })
    );

    return expiringPlans.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  },
});
