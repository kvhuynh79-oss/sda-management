import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenant } from "./authHelpers";

// Create a new owner payment
export const create = mutation({
  args: {
    userId: v.id("users"),
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
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    // Verify property belongs to this organization
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.organizationId !== organizationId) {
      throw new Error("Property not found or does not belong to this organization");
    }

    const paymentId = await ctx.db.insert("ownerPayments", {
      organizationId,
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
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return paymentId;
  },
});

// Bulk create multiple payments (for importing bank statements)
export const bulkCreate = mutation({
  args: {
    userId: v.id("users"),
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
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();
    const paymentIds = [];

    for (const payment of args.payments) {
      // Verify each property belongs to this organization
      const property = await ctx.db.get(payment.propertyId);
      if (!property || property.organizationId !== organizationId) {
        throw new Error(`Property ${payment.propertyId} not found or does not belong to this organization`);
      }

      const paymentId = await ctx.db.insert("ownerPayments", {
        organizationId,
        ...payment,
        status: "paid",
        createdBy: args.userId,
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
    userId: v.id("users"),
    paymentType: v.optional(v.union(
      v.literal("interim"),
      v.literal("sda_share"),
      v.literal("rent_contribution"),
      v.literal("other")
    )),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    let payments = await ctx.db
      .query("ownerPayments")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    if (args.paymentType) {
      payments = payments.filter((p) => p.paymentType === args.paymentType);
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
  args: {
    userId: v.id("users"),
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify property belongs to this organization
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.organizationId !== organizationId) {
      return [];
    }

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
  args: {
    userId: v.id("users"),
    ownerId: v.id("owners"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify owner belongs to this organization
    const owner = await ctx.db.get(args.ownerId);
    if (!owner || owner.organizationId !== organizationId) {
      return [];
    }

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
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify participant belongs to this organization
    const participant = await ctx.db.get(args.participantId);
    if (!participant || participant.organizationId !== organizationId) {
      return [];
    }

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
  args: {
    userId: v.id("users"),
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify property belongs to this organization
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.organizationId !== organizationId) {
      return { totalPayments: 0, totalAmount: 0, byType: {} };
    }

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
    userId: v.id("users"),
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
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { paymentId, userId, ...updates } = args;

    // Verify payment belongs to this organization
    const payment = await ctx.db.get(paymentId);
    if (!payment || payment.organizationId !== organizationId) {
      throw new Error("Payment not found");
    }

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
  args: {
    userId: v.id("users"),
    paymentId: v.id("ownerPayments"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const payment = await ctx.db.get(args.paymentId);
    if (!payment || payment.organizationId !== organizationId) {
      throw new Error("Payment not found");
    }
    await ctx.db.delete(args.paymentId);
    return { success: true };
  },
});
