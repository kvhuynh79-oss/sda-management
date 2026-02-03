import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission } from "./authHelpers";

// Create a new payment record
export const create = mutation({
  args: {
    participantId: v.id("participants"),
    planId: v.id("participantPlans"),
    paymentDate: v.string(),
    paymentPeriodStart: v.string(),
    paymentPeriodEnd: v.string(),
    expectedAmount: v.number(),
    actualAmount: v.number(),
    paymentSource: v.union(
      v.literal("ndia"),
      v.literal("plan_manager"),
      v.literal("self_managed")
    ),
    paymentMethod: v.optional(v.string()),
    paymentReference: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify user has permission
    const user = await requirePermission(ctx, args.createdBy, "payments", "create");

    const variance = args.actualAmount - args.expectedAmount;
    const now = Date.now();

    const paymentId = await ctx.db.insert("payments", {
      ...args,
      variance,
      createdAt: now,
      updatedAt: now,
    });

    // Get participant name for audit log
    const participant = await ctx.db.get(args.participantId);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "payment",
      entityId: paymentId,
      entityName: participant ? `${participant.firstName} ${participant.lastName} - ${args.paymentDate}` : args.paymentDate,
      metadata: JSON.stringify({
        amount: args.actualAmount,
        paymentSource: args.paymentSource,
        paymentDate: args.paymentDate,
      }),
    });

    return paymentId;
  },
});

// Get all payments with participant and plan details (optimized batch fetch)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const payments = await ctx.db.query("payments").collect();

    if (payments.length === 0) return [];

    // Batch fetch all unique related IDs to avoid N+1 queries
    const participantIds = [...new Set(payments.map((p) => p.participantId))];
    const planIds = [...new Set(payments.map((p) => p.planId))];
    const userIds = [...new Set(payments.map((p) => p.createdBy))];

    // Parallel batch fetch
    const [participants, plans, users] = await Promise.all([
      Promise.all(participantIds.map((id) => ctx.db.get(id))),
      Promise.all(planIds.map((id) => ctx.db.get(id))),
      Promise.all(userIds.map((id) => ctx.db.get(id))),
    ]);

    // Create lookup maps for O(1) access
    const participantMap = new Map(
      participants.filter(Boolean).map((p) => [p!._id, p])
    );
    const planMap = new Map(plans.filter(Boolean).map((p) => [p!._id, p]));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u]));

    // Enrich payments using lookup maps
    const paymentsWithDetails = payments.map((payment) => ({
      ...payment,
      participant: participantMap.get(payment.participantId) || null,
      plan: planMap.get(payment.planId) || null,
      createdByUser: userMap.get(payment.createdBy) || null,
    }));

    return paymentsWithDetails.sort(
      (a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});

// Get payments by participant (optimized batch fetch)
export const getByParticipant = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .collect();

    if (payments.length === 0) return [];

    // Batch fetch unique related IDs
    const planIds = [...new Set(payments.map((p) => p.planId))];
    const userIds = [...new Set(payments.map((p) => p.createdBy))];

    const [plans, users] = await Promise.all([
      Promise.all(planIds.map((id) => ctx.db.get(id))),
      Promise.all(userIds.map((id) => ctx.db.get(id))),
    ]);

    // Create lookup maps
    const planMap = new Map(plans.filter(Boolean).map((p) => [p!._id, p]));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u]));

    const paymentsWithDetails = payments.map((payment) => ({
      ...payment,
      plan: planMap.get(payment.planId) || null,
      createdByUser: userMap.get(payment.createdBy) || null,
    }));

    return paymentsWithDetails.sort(
      (a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});

// Get payments by plan
export const getByPlan = query({
  args: { planId: v.id("participantPlans") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    return payments.sort(
      (a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});

// Get payment by ID
export const getById = query({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return null;

    const participant = await ctx.db.get(payment.participantId);
    const plan = await ctx.db.get(payment.planId);
    const createdByUser = await ctx.db.get(payment.createdBy);

    return {
      ...payment,
      participant,
      plan,
      createdByUser,
    };
  },
});

// Update payment
export const update = mutation({
  args: {
    userId: v.id("users"), // Required for audit logging
    paymentId: v.id("payments"),
    paymentDate: v.optional(v.string()),
    paymentPeriodStart: v.optional(v.string()),
    paymentPeriodEnd: v.optional(v.string()),
    expectedAmount: v.optional(v.number()),
    actualAmount: v.optional(v.number()),
    paymentSource: v.optional(
      v.union(
        v.literal("ndia"),
        v.literal("plan_manager"),
        v.literal("self_managed")
      )
    ),
    paymentMethod: v.optional(v.string()),
    paymentReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user has permission
    const user = await requirePermission(ctx, args.userId, "payments", "update");

    const { paymentId, userId, ...updates } = args;
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new Error("Payment not found");

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // Recalculate variance if amounts changed
    const expectedAmount = updates.expectedAmount ?? payment.expectedAmount;
    const actualAmount = updates.actualAmount ?? payment.actualAmount;
    filteredUpdates.variance = actualAmount - expectedAmount;

    await ctx.db.patch(paymentId, filteredUpdates);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "payment",
      entityId: paymentId,
      entityName: payment.paymentDate,
      changes: JSON.stringify(filteredUpdates),
    });

    return { success: true };
  },
});

// Delete payment
export const remove = mutation({
  args: {
    userId: v.id("users"), // Required for audit logging
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    // Verify user has permission
    const user = await requirePermission(ctx, args.userId, "payments", "delete");

    const payment = await ctx.db.get(args.paymentId);

    await ctx.db.delete(args.paymentId);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "delete",
      entityType: "payment",
      entityId: args.paymentId,
      entityName: payment?.paymentDate || "Unknown",
      previousValues: payment ? JSON.stringify({
        actualAmount: payment.actualAmount,
        paymentDate: payment.paymentDate,
      }) : undefined,
    });

    return { success: true };
  },
});

// Get payment statistics for a participant
export const getParticipantStats = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .collect();

    if (payments.length === 0) {
      return {
        totalPayments: 0,
        totalExpected: 0,
        totalActual: 0,
        totalVariance: 0,
        averageVariance: 0,
        paymentsCount: 0,
      };
    }

    const totalExpected = payments.reduce((sum, p) => sum + p.expectedAmount, 0);
    const totalActual = payments.reduce((sum, p) => sum + p.actualAmount, 0);
    const totalVariance = totalActual - totalExpected;

    return {
      totalPayments: payments.length,
      totalExpected,
      totalActual,
      totalVariance,
      averageVariance: totalVariance / payments.length,
      paymentsCount: payments.length,
    };
  },
});

// Get recent payments (for dashboard) - optimized
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const payments = await ctx.db.query("payments").collect();

    if (payments.length === 0) return [];

    // Sort first, then slice to limit what we need to enrich
    const sortedPayments = payments.sort(
      (a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
    const recentPayments = sortedPayments.slice(0, limit);

    // Batch fetch only the participants we need
    const participantIds = [...new Set(recentPayments.map((p) => p.participantId))];
    const participants = await Promise.all(participantIds.map((id) => ctx.db.get(id)));

    const participantMap = new Map(
      participants.filter(Boolean).map((p) => [p!._id, p])
    );

    return recentPayments.map((payment) => ({
      ...payment,
      participant: participantMap.get(payment.participantId) || null,
    }));
  },
});

// Get payments with variances (for alerting) - optimized
export const getPaymentsWithVariance = query({
  args: { minVariancePercent: v.number() },
  handler: async (ctx, args) => {
    const payments = await ctx.db.query("payments").collect();

    // Filter first to reduce the dataset
    const filteredPayments = payments.filter((payment) => {
      if (payment.expectedAmount === 0) return false;
      const variancePercent =
        (Math.abs(payment.variance) / payment.expectedAmount) * 100;
      return variancePercent >= args.minVariancePercent;
    });

    if (filteredPayments.length === 0) return [];

    // Batch fetch participants
    const participantIds = [...new Set(filteredPayments.map((p) => p.participantId))];
    const participants = await Promise.all(participantIds.map((id) => ctx.db.get(id)));

    const participantMap = new Map(
      participants.filter(Boolean).map((p) => [p!._id, p])
    );

    const paymentsWithSignificantVariance = filteredPayments.map((payment) => ({
      ...payment,
      participant: participantMap.get(payment.participantId) || null,
      variancePercent: (payment.variance / payment.expectedAmount) * 100,
    }));

    return paymentsWithSignificantVariance.sort(
      (a, b) => Math.abs(b.variance) - Math.abs(a.variance)
    );
  },
});

// Paginated version of getAll for large datasets
export const getAllPaginated = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 25;

    const result = await ctx.db
      .query("payments")
      .order("desc")
      .paginate({ numItems: limit, cursor: args.cursor ?? null });

    if (result.page.length === 0) {
      return {
        page: [],
        isDone: result.isDone,
        continueCursor: result.continueCursor,
      };
    }

    // Batch fetch related data
    const participantIds = [...new Set(result.page.map((p) => p.participantId))];
    const planIds = [...new Set(result.page.map((p) => p.planId))];

    const [participants, plans] = await Promise.all([
      Promise.all(participantIds.map((id) => ctx.db.get(id))),
      Promise.all(planIds.map((id) => ctx.db.get(id))),
    ]);

    const participantMap = new Map(
      participants.filter(Boolean).map((p) => [p!._id, p])
    );
    const planMap = new Map(plans.filter(Boolean).map((p) => [p!._id, p]));

    const paymentsWithDetails = result.page.map((payment) => ({
      ...payment,
      participant: participantMap.get(payment.participantId) || null,
      plan: planMap.get(payment.planId) || null,
    }));

    return {
      page: paymentsWithDetails,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});
