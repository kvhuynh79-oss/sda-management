import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all claims for a specific period (month)
export const getByPeriod = query({
  args: { claimPeriod: v.string() },
  handler: async (ctx, args) => {
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_period", (q) => q.eq("claimPeriod", args.claimPeriod))
      .collect();

    const claimsWithDetails = await Promise.all(
      claims.map(async (claim) => {
        const participant = await ctx.db.get(claim.participantId);
        const plan = await ctx.db.get(claim.planId);
        let dwelling = null;
        let property = null;

        if (participant?.dwellingId) {
          dwelling = await ctx.db.get(participant.dwellingId);
          if (dwelling?.propertyId) {
            property = await ctx.db.get(dwelling.propertyId);
          }
        }

        return {
          ...claim,
          participant,
          plan,
          dwelling,
          property,
        };
      })
    );

    return claimsWithDetails.sort((a, b) => {
      const dayA = a.plan?.claimDay || 31;
      const dayB = b.plan?.claimDay || 31;
      return dayA - dayB;
    });
  },
});

// Get claims dashboard data - upcoming claims for current month
export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentDay = now.getDate();

    // Get all active participants with their plans
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const dashboardData = await Promise.all(
      participants.map(async (participant) => {
        // Get current plan
        const plans = await ctx.db
          .query("participantPlans")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .collect();

        const currentPlan = plans.find((p) => p.planStatus === "current");
        if (!currentPlan) return null;

        // Get dwelling and property
        const dwelling = await ctx.db.get(participant.dwellingId);
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        // Check if claim exists for this period
        const existingClaim = await ctx.db
          .query("claims")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .filter((q) => q.eq(q.field("claimPeriod"), currentPeriod))
          .first();

        const claimDay = currentPlan.claimDay || 1;
        const isOverdue = !existingClaim && currentDay > claimDay;
        const isDueToday = !existingClaim && currentDay === claimDay;
        const isUpcoming = !existingClaim && currentDay < claimDay;

        return {
          participant,
          plan: currentPlan,
          dwelling,
          property,
          existingClaim,
          claimDay,
          claimMethod: currentPlan.claimMethod || "agency_managed",
          expectedAmount: currentPlan.monthlySdaAmount || currentPlan.annualSdaBudget / 12,
          isOverdue,
          isDueToday,
          isUpcoming,
          status: existingClaim?.status || "pending",
        };
      })
    );

    // Filter out nulls and sort by claim day
    const validData = dashboardData.filter((d) => d !== null);

    return {
      currentPeriod,
      currentDay,
      claims: validData.sort((a, b) => a.claimDay - b.claimDay),
      summary: {
        total: validData.length,
        pending: validData.filter((d) => d.status === "pending").length,
        submitted: validData.filter((d) => d.status === "submitted").length,
        paid: validData.filter((d) => d.status === "paid").length,
        overdue: validData.filter((d) => d.isOverdue).length,
        dueToday: validData.filter((d) => d.isDueToday).length,
        totalExpected: validData.reduce((sum, d) => sum + (d.expectedAmount || 0), 0),
      },
    };
  },
});

// Get claim history for a participant
export const getByParticipant = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .collect();

    return claims.sort((a, b) => b.claimPeriod.localeCompare(a.claimPeriod));
  },
});

// Create a new claim
export const create = mutation({
  args: {
    participantId: v.id("participants"),
    planId: v.id("participantPlans"),
    claimPeriod: v.string(),
    claimMethod: v.union(
      v.literal("agency_managed"),
      v.literal("pace"),
      v.literal("plan_managed")
    ),
    expectedAmount: v.number(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("submitted"),
        v.literal("paid")
      )
    ),
    claimDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if claim already exists for this participant and period
    const existing = await ctx.db
      .query("claims")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .filter((q) => q.eq(q.field("claimPeriod"), args.claimPeriod))
      .first();

    if (existing) {
      throw new Error("Claim already exists for this period");
    }

    const claimId = await ctx.db.insert("claims", {
      participantId: args.participantId,
      planId: args.planId,
      claimPeriod: args.claimPeriod,
      claimMethod: args.claimMethod,
      expectedAmount: args.expectedAmount,
      status: args.status || "pending",
      claimDate: args.claimDate,
      notes: args.notes,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return claimId;
  },
});

// Update claim status (mark as submitted, paid, etc.)
export const updateStatus = mutation({
  args: {
    claimId: v.id("claims"),
    status: v.union(
      v.literal("pending"),
      v.literal("submitted"),
      v.literal("paid"),
      v.literal("rejected"),
      v.literal("partial")
    ),
    claimDate: v.optional(v.string()),
    claimedAmount: v.optional(v.number()),
    paidDate: v.optional(v.string()),
    paidAmount: v.optional(v.number()),
    paymentReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { claimId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(claimId, filteredUpdates);
    return { success: true };
  },
});

// Bulk create claims for a period (for all eligible participants)
export const bulkCreateForPeriod = mutation({
  args: {
    claimPeriod: v.string(),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all active participants
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let created = 0;
    let skipped = 0;

    for (const participant of participants) {
      // Get current plan
      const plans = await ctx.db
        .query("participantPlans")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .collect();

      const currentPlan = plans.find((p) => p.planStatus === "current");
      if (!currentPlan) {
        skipped++;
        continue;
      }

      // Check if claim already exists
      const existing = await ctx.db
        .query("claims")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) => q.eq(q.field("claimPeriod"), args.claimPeriod))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Create claim
      await ctx.db.insert("claims", {
        participantId: participant._id,
        planId: currentPlan._id,
        claimPeriod: args.claimPeriod,
        claimMethod: currentPlan.claimMethod || "agency_managed",
        expectedAmount: currentPlan.monthlySdaAmount || currentPlan.annualSdaBudget / 12,
        status: "pending",
        createdBy: args.createdBy,
        createdAt: now,
        updatedAt: now,
      });

      created++;
    }

    return { created, skipped };
  },
});

// Mark claim as submitted
export const markSubmitted = mutation({
  args: {
    claimId: v.id("claims"),
    claimDate: v.string(),
    claimedAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId);
    if (!claim) throw new Error("Claim not found");

    await ctx.db.patch(args.claimId, {
      status: "submitted",
      claimDate: args.claimDate,
      claimedAmount: args.claimedAmount || claim.expectedAmount,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mark claim as paid
export const markPaid = mutation({
  args: {
    claimId: v.id("claims"),
    paidDate: v.string(),
    paidAmount: v.number(),
    paymentReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.claimId, {
      status: "paid",
      paidDate: args.paidDate,
      paidAmount: args.paidAmount,
      paymentReference: args.paymentReference,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mark claim as rejected
export const markRejected = mutation({
  args: {
    claimId: v.id("claims"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.claimId, {
      status: "rejected",
      notes: args.reason || "Claim rejected",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Revert claim to pending
export const revertToPending = mutation({
  args: {
    claimId: v.id("claims"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.claimId, {
      status: "pending",
      claimDate: undefined,
      claimedAmount: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get PACE export data (for CSV bulk upload)
export const getPaceExport = query({
  args: { claimPeriod: v.string() },
  handler: async (ctx, args) => {
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_period", (q) => q.eq("claimPeriod", args.claimPeriod))
      .filter((q) => q.eq(q.field("claimMethod"), "pace"))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const exportData = await Promise.all(
      claims.map(async (claim) => {
        const participant = await ctx.db.get(claim.participantId);
        const plan = await ctx.db.get(claim.planId);

        return {
          ndisNumber: participant?.ndisNumber || "",
          firstName: participant?.firstName || "",
          lastName: participant?.lastName || "",
          supportItemNumber: plan?.supportItemNumber || "01_021_0115_1_1",
          amount: claim.expectedAmount,
          claimPeriod: claim.claimPeriod,
        };
      })
    );

    return exportData;
  },
});

// Get monthly summary statistics
export const getMonthlySummary = query({
  args: { claimPeriod: v.string() },
  handler: async (ctx, args) => {
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_period", (q) => q.eq("claimPeriod", args.claimPeriod))
      .collect();

    const byMethod = {
      agency_managed: claims.filter((c) => c.claimMethod === "agency_managed"),
      pace: claims.filter((c) => c.claimMethod === "pace"),
      plan_managed: claims.filter((c) => c.claimMethod === "plan_managed"),
    };

    const byStatus = {
      pending: claims.filter((c) => c.status === "pending"),
      submitted: claims.filter((c) => c.status === "submitted"),
      paid: claims.filter((c) => c.status === "paid"),
      rejected: claims.filter((c) => c.status === "rejected"),
    };

    return {
      total: claims.length,
      totalExpected: claims.reduce((sum, c) => sum + c.expectedAmount, 0),
      totalPaid: claims
        .filter((c) => c.status === "paid")
        .reduce((sum, c) => sum + (c.paidAmount || 0), 0),
      byMethod: {
        agency_managed: {
          count: byMethod.agency_managed.length,
          total: byMethod.agency_managed.reduce((sum, c) => sum + c.expectedAmount, 0),
        },
        pace: {
          count: byMethod.pace.length,
          total: byMethod.pace.reduce((sum, c) => sum + c.expectedAmount, 0),
        },
        plan_managed: {
          count: byMethod.plan_managed.length,
          total: byMethod.plan_managed.reduce((sum, c) => sum + c.expectedAmount, 0),
        },
      },
      byStatus: {
        pending: byStatus.pending.length,
        submitted: byStatus.submitted.length,
        paid: byStatus.paid.length,
        rejected: byStatus.rejected.length,
      },
    };
  },
});

// Delete a claim
export const remove = mutation({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.claimId);
    return { success: true };
  },
});
