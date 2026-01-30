import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all quotes for a maintenance request
export const getByMaintenanceRequest = query({
  args: { maintenanceRequestId: v.id("maintenanceRequests") },
  handler: async (ctx, args) => {
    const quotes = await ctx.db
      .query("maintenanceQuotes")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", args.maintenanceRequestId)
      )
      .collect();

    // Sort by quote amount (lowest first)
    return quotes.sort((a, b) => a.quoteAmount - b.quoteAmount);
  },
});

// Get a single quote by ID
export const getById = query({
  args: { quoteId: v.id("maintenanceQuotes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.quoteId);
  },
});

// Add a new quote
export const addQuote = mutation({
  args: {
    maintenanceRequestId: v.id("maintenanceRequests"),
    contractorName: v.string(),
    contractorContact: v.optional(v.string()),
    contractorEmail: v.optional(v.string()),
    quoteAmount: v.number(),
    quoteDate: v.string(),
    validUntil: v.optional(v.string()),
    estimatedDays: v.optional(v.number()),
    warrantyMonths: v.optional(v.number()),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create the quote
    const quoteId = await ctx.db.insert("maintenanceQuotes", {
      maintenanceRequestId: args.maintenanceRequestId,
      contractorName: args.contractorName,
      contractorContact: args.contractorContact,
      contractorEmail: args.contractorEmail,
      quoteAmount: args.quoteAmount,
      quoteDate: args.quoteDate,
      validUntil: args.validUntil,
      estimatedDays: args.estimatedDays,
      warrantyMonths: args.warrantyMonths,
      description: args.description,
      status: "pending",
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    // Update the maintenance request status to "awaiting_quotes" or "quoted"
    const request = await ctx.db.get(args.maintenanceRequestId);
    if (request && (request.status === "reported" || request.status === "awaiting_quotes")) {
      await ctx.db.patch(args.maintenanceRequestId, {
        status: "quoted",
        updatedAt: now,
      });
    }

    return quoteId;
  },
});

// Update a quote
export const updateQuote = mutation({
  args: {
    quoteId: v.id("maintenanceQuotes"),
    contractorName: v.optional(v.string()),
    contractorContact: v.optional(v.string()),
    contractorEmail: v.optional(v.string()),
    quoteAmount: v.optional(v.number()),
    quoteDate: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    estimatedDays: v.optional(v.number()),
    warrantyMonths: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { quoteId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    return await ctx.db.patch(quoteId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Accept a quote - this awards the work to that contractor
export const acceptQuote = mutation({
  args: {
    quoteId: v.id("maintenanceQuotes"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error("Quote not found");

    // Update this quote to accepted
    await ctx.db.patch(args.quoteId, {
      status: "accepted",
      acceptedDate: today,
      updatedAt: now,
    });

    // Reject all other pending quotes for this request
    const otherQuotes = await ctx.db
      .query("maintenanceQuotes")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", quote.maintenanceRequestId)
      )
      .filter((q) => q.neq(q.field("_id"), args.quoteId))
      .collect();

    for (const otherQuote of otherQuotes) {
      if (otherQuote.status === "pending") {
        await ctx.db.patch(otherQuote._id, {
          status: "rejected",
          rejectionReason: "Another quote was accepted",
          updatedAt: now,
        });
      }
    }

    // Update the maintenance request with contractor details
    await ctx.db.patch(quote.maintenanceRequestId, {
      status: "approved",
      contractorName: quote.contractorName,
      contractorContact: quote.contractorContact || undefined,
      quotedAmount: quote.quoteAmount,
      warrantyPeriodMonths: quote.warrantyMonths || undefined,
      updatedAt: now,
    });

    return args.quoteId;
  },
});

// Reject a quote
export const rejectQuote = mutation({
  args: {
    quoteId: v.id("maintenanceQuotes"),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.quoteId, {
      status: "rejected",
      rejectionReason: args.rejectionReason,
      updatedAt: Date.now(),
    });
  },
});

// Delete a quote
export const deleteQuote = mutation({
  args: { quoteId: v.id("maintenanceQuotes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.quoteId);
  },
});

// Mark request as awaiting quotes
export const setAwaitingQuotes = mutation({
  args: { maintenanceRequestId: v.id("maintenanceRequests") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.maintenanceRequestId, {
      status: "awaiting_quotes",
      updatedAt: Date.now(),
    });
  },
});
