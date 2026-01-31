import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { internal } from "./_generated/api";

// Generate a random token for quote submissions
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Get quote requests for a maintenance request
export const getByMaintenanceRequest = query({
  args: { maintenanceRequestId: v.id("maintenanceRequests") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("quoteRequests")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", args.maintenanceRequestId)
      )
      .collect();

    // Get contractor details for each request
    const requestsWithContractors = await Promise.all(
      requests.map(async (request) => {
        const contractor = await ctx.db.get(request.contractorId);
        return {
          ...request,
          contractor,
        };
      })
    );

    return requestsWithContractors;
  },
});

// Get quote request by token (for public quote submission page)
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("quoteRequests")
      .withIndex("by_token", (q) => q.eq("requestToken", args.token))
      .first();

    if (!request) return null;

    // Get maintenance request details
    const maintenanceRequest = await ctx.db.get(request.maintenanceRequestId);
    if (!maintenanceRequest) return null;

    // Get dwelling and property
    const dwelling = await ctx.db.get(maintenanceRequest.dwellingId);
    const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

    // Get photos
    const photos = await ctx.db
      .query("maintenancePhotos")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", maintenanceRequest._id)
      )
      .collect();

    // Get photo URLs
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        return { ...photo, url };
      })
    );

    // Get contractor
    const contractor = await ctx.db.get(request.contractorId);

    return {
      quoteRequest: request,
      maintenanceRequest,
      dwelling,
      property: property
        ? {
            _id: property._id,
            propertyName: property.propertyName,
            addressLine1: property.addressLine1,
            suburb: property.suburb,
            state: property.state,
            postcode: property.postcode,
          }
        : null,
      photos: photosWithUrls,
      contractor,
    };
  },
});

// Create a quote request (internal - called after sending email)
export const create = mutation({
  args: {
    maintenanceRequestId: v.id("maintenanceRequests"),
    contractorId: v.id("contractors"),
    emailSubject: v.string(),
    emailBody: v.string(),
    includesPhotos: v.boolean(),
    expiryDays: v.number(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const token = generateToken();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + args.expiryDays);

    const requestId = await ctx.db.insert("quoteRequests", {
      maintenanceRequestId: args.maintenanceRequestId,
      contractorId: args.contractorId,
      requestToken: token,
      emailSentAt: Date.now(),
      emailSubject: args.emailSubject,
      emailBody: args.emailBody,
      includesPhotos: args.includesPhotos,
      status: "sent",
      expiryDate: expiryDate.toISOString().split("T")[0],
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    // Update maintenance request status
    await ctx.db.patch(args.maintenanceRequestId, {
      status: "awaiting_quotes",
      updatedAt: Date.now(),
    });

    return { requestId, token };
  },
});

// Mark quote request as viewed
export const markViewed = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("quoteRequests")
      .withIndex("by_token", (q) => q.eq("requestToken", args.token))
      .first();

    if (request && request.status === "sent") {
      await ctx.db.patch(request._id, {
        status: "viewed",
        viewedAt: Date.now(),
      });
    }
  },
});

// Submit a quote via public link
export const submitQuote = mutation({
  args: {
    token: v.string(),
    quoteAmount: v.number(),
    laborCost: v.optional(v.number()),
    materialsCost: v.optional(v.number()),
    estimatedDays: v.optional(v.number()),
    availableDate: v.optional(v.string()),
    warrantyMonths: v.optional(v.number()),
    description: v.optional(v.string()),
    validDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("quoteRequests")
      .withIndex("by_token", (q) => q.eq("requestToken", args.token))
      .first();

    if (!request) throw new Error("Invalid quote request token");
    if (request.status === "expired") throw new Error("Quote request has expired");
    if (request.status === "quoted") throw new Error("Quote already submitted");

    // Check if expired by date
    if (new Date(request.expiryDate) < new Date()) {
      await ctx.db.patch(request._id, { status: "expired" });
      throw new Error("Quote request has expired");
    }

    const contractor = await ctx.db.get(request.contractorId);
    if (!contractor) throw new Error("Contractor not found");

    // Calculate valid until date
    const validUntil = args.validDays
      ? new Date(Date.now() + args.validDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      : undefined;

    // Create the quote
    const quoteId = await ctx.db.insert("maintenanceQuotes", {
      maintenanceRequestId: request.maintenanceRequestId,
      contractorId: request.contractorId,
      contractorName: contractor.companyName,
      contractorContact: contractor.phone,
      contractorEmail: contractor.email,
      quoteAmount: args.quoteAmount,
      laborCost: args.laborCost,
      materialsCost: args.materialsCost,
      quoteDate: new Date().toISOString().split("T")[0],
      validUntil,
      estimatedDays: args.estimatedDays,
      availableDate: args.availableDate,
      warrantyMonths: args.warrantyMonths,
      description: args.description,
      status: "pending",
      quoteRequestId: request._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update quote request status
    await ctx.db.patch(request._id, {
      status: "quoted",
      respondedAt: Date.now(),
    });

    // Check if all quote requests for this maintenance request have been responded to
    const allRequests = await ctx.db
      .query("quoteRequests")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", request.maintenanceRequestId)
      )
      .collect();

    const allResponded = allRequests.every(
      (r) => r.status === "quoted" || r.status === "declined" || r.status === "expired"
    );

    if (allResponded) {
      await ctx.db.patch(request.maintenanceRequestId, {
        status: "quoted",
        updatedAt: Date.now(),
      });
    }

    // Update contractor stats
    await ctx.db.patch(request.contractorId, {
      totalJobsCompleted: (contractor.totalJobsCompleted || 0) + 1,
      updatedAt: Date.now(),
    });

    return quoteId;
  },
});

// Decline to quote
export const declineQuote = mutation({
  args: {
    token: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("quoteRequests")
      .withIndex("by_token", (q) => q.eq("requestToken", args.token))
      .first();

    if (!request) throw new Error("Invalid quote request token");

    await ctx.db.patch(request._id, {
      status: "declined",
      respondedAt: Date.now(),
      notes: args.reason,
    });

    return true;
  },
});

// Get all pending quote requests (for admin dashboard)
export const getPending = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("quoteRequests")
      .withIndex("by_status", (q) => q.eq("status", "sent"))
      .collect();

    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const contractor = await ctx.db.get(request.contractorId);
        const maintenanceRequest = await ctx.db.get(request.maintenanceRequestId);
        const dwelling = maintenanceRequest
          ? await ctx.db.get(maintenanceRequest.dwellingId)
          : null;
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        return {
          ...request,
          contractor,
          maintenanceRequest,
          property: property
            ? {
                propertyName: property.propertyName,
                addressLine1: property.addressLine1,
                suburb: property.suburb,
              }
            : null,
        };
      })
    );

    return requestsWithDetails;
  },
});