import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new owner payment
export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    ownerId: v.id("owners"),
    participantId: v.optional(v.id("participants")),
    paymentType: v.union(
      v.literal("interim"),
      v.literal("sda_share"),
      v.literal("rent_contribution"),
      v.literal("other")
    ),
    amount: v.number(),
    paymentDate: v.string(),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    bankReference: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("reconciled")
    )),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const paymentId = await ctx.db.insert("ownerPayments", {
      propertyId: args.propertyId,
      ownerId: args.ownerId,
      participantId: args.participantId,
      paymentType: args.paymentType,
      amount: args.amount,
      paymentDate: args.paymentDate,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      bankReference: args.bankReference,
      description: args.description,
      notes: args.notes,
      status: args.status || "paid",
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return paymentId;
  },
});

// Bulk create multiple payments (for importing bank statements)
export const bulkCreate = mutation({
  args: {
    payments: v.array(v.object({
      propertyId: v.id("properties"),
      ownerId: v.id("owners"),
      participantId: v.optional(v.id("participants")),
      paymentType: v.union(
        v.literal("interim"),
        v.literal("sda_share"),
        v.literal("rent_contribution"),
        v.literal("other")
      ),
      amount: v.number(),
      paymentDate: v.string(),
      periodStart: v.optional(v.string()),
      periodEnd: v.optional(v.string()),
      bankReference: v.optional(v.string()),
      description: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const paymentIds = [];

    for (const payment of args.payments) {
      const paymentId = await ctx.db.insert("ownerPayments", {
        ...payment,
        status: "paid",
        createdBy: args.createdBy,
        createdAt: now,
        updatedAt: now,
      });
      paymentIds.push(paymentId);
    }

    return { count: paymentIds.length, ids: paymentIds };
  },
});

// Get all owner payments with property and owner details
export const getAll = query({
  args: {
    paymentType: v.optional(v.union(
      v.literal("interim"),
      v.literal("sda_share"),
      v.literal("rent_contribution"),
      v.literal("other")
    )),
  },
  handler: async (ctx, args) => {
    let payments;

    if (args.paymentType) {
      payments = await ctx.db
        .query("ownerPayments")
        .withIndex("by_type", (q) => q.eq("paymentType", args.paymentType!))
        .collect();
    } else {
      payments = await ctx.db.query("ownerPayments").collect();
    }

    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const property = await ctx.db.get(payment.propertyId);
        const owner = await ctx.db.get(payment.ownerId);
        const participant = payment.participantId
          ? await ctx.db.get(payment.participantId)
          : null;

        return {
          ...payment,
          property,
          owner,
          participant,
        };
      })
    );

    return paymentsWithDetails.sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});

// Get payments by property
export const getByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("ownerPayments")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const owner = await ctx.db.get(payment.ownerId);
        const participant = payment.participantId
          ? await ctx.db.get(payment.participantId)
          : null;

        return {
          ...payment,
          owner,
          participant,
        };
      })
    );

    return paymentsWithDetails.sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});

// Get payments by owner
export const getByOwner = query({
  args: { ownerId: v.id("owners") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("ownerPayments")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const property = await ctx.db.get(payment.propertyId);
        const participant = payment.participantId
          ? await ctx.db.get(payment.participantId)
          : null;

        return {
          ...payment,
          property,
          participant,
        };
      })
    );

    return paymentsWithDetails.sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});

// Get payments by participant
export const getByParticipant = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("ownerPayments")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .collect();

    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const property = await ctx.db.get(payment.propertyId);
        const owner = await ctx.db.get(payment.ownerId);

        return {
          ...payment,
          property,
          owner,
        };
      })
    );

    return paymentsWithDetails.sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});

// Get payment summary by property
export const getSummaryByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("ownerPayments")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    const summary = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      byType: {
        interim: { count: 0, amount: 0 },
        sda_share: { count: 0, amount: 0 },
        rent_contribution: { count: 0, amount: 0 },
        other: { count: 0, amount: 0 },
      } as Record<string, { count: number; amount: number }>,
    };

    for (const payment of payments) {
      summary.byType[payment.paymentType].count++;
      summary.byType[payment.paymentType].amount += payment.amount;
    }

    return summary;
  },
});

// Update a payment
export const update = mutation({
  args: {
    paymentId: v.id("ownerPayments"),
    amount: v.optional(v.number()),
    paymentDate: v.optional(v.string()),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    bankReference: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("reconciled")
    )),
  },
  handler: async (ctx, args) => {
    const { paymentId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(paymentId, filteredUpdates);
    return { success: true };
  },
});

// Delete a payment
export const remove = mutation({
  args: { paymentId: v.id("ownerPayments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.paymentId);
    return { success: true };
  },
});
