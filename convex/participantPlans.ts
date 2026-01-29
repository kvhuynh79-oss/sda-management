import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new plan
export const create = mutation({
  args: {
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
    dailySdaRate: v.number(),
    reasonableRentContribution: v.optional(v.number()),
    rentContributionFrequency: v.optional(
      v.union(v.literal("weekly"), v.literal("fortnightly"), v.literal("monthly"))
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
    const planId = await ctx.db.insert("participantPlans", {
      ...args,
      planStatus: "current",
      createdAt: now,
      updatedAt: now,
    });

    return planId;
  },
});

// Get plans for a participant
export const getByParticipant = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
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
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
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
    const { planId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(planId, filteredUpdates);
    return { success: true };
  },
});

// Get all plans expiring soon (for alerts)
export const getExpiringSoon = query({
  args: { daysAhead: v.number() },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("participantPlans")
      .withIndex("by_status", (q) => q.eq("planStatus", "current"))
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
