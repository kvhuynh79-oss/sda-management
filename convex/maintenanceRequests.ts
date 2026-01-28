import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new maintenance request
export const create = mutation({
  args: {
    dwellingId: v.id("dwellings"),
    requestType: v.union(v.literal("reactive"), v.literal("preventative")),
    category: v.union(
      v.literal("plumbing"),
      v.literal("electrical"),
      v.literal("appliances"),
      v.literal("building"),
      v.literal("grounds"),
      v.literal("safety"),
      v.literal("general")
    ),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    title: v.string(),
    description: v.string(),
    reportedBy: v.optional(v.string()),
    reportedDate: v.string(),
    contractorName: v.optional(v.string()),
    contractorContact: v.optional(v.string()),
    quotedAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const requestId = await ctx.db.insert("maintenanceRequests", {
      ...args,
      status: "reported",
      createdAt: now,
      updatedAt: now,
    });

    return requestId;
  },
});

// Get all maintenance requests with dwelling and property details
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("maintenanceRequests").collect();

    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const dwelling = await ctx.db.get(request.dwellingId);
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;
        const createdByUser = await ctx.db.get(request.createdBy);

        return {
          ...request,
          dwelling,
          property,
          createdByUser,
        };
      })
    );

    return requestsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get maintenance requests by dwelling
export const getByDwelling = query({
  args: { dwellingId: v.id("dwellings") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId))
      .collect();

    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const createdByUser = await ctx.db.get(request.createdBy);
        return {
          ...request,
          createdByUser,
        };
      })
    );

    return requestsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get maintenance requests by property
export const getByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    // Get all dwellings for this property
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    const dwellingIds = dwellings.map((d) => d._id);

    // Get all maintenance requests for these dwellings
    const allRequests = await ctx.db.query("maintenanceRequests").collect();
    const requests = allRequests.filter((req) =>
      dwellingIds.includes(req.dwellingId)
    );

    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const dwelling = await ctx.db.get(request.dwellingId);
        const createdByUser = await ctx.db.get(request.createdBy);

        return {
          ...request,
          dwelling,
          createdByUser,
        };
      })
    );

    return requestsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get maintenance request by ID
export const getById = query({
  args: { requestId: v.id("maintenanceRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    const dwelling = await ctx.db.get(request.dwellingId);
    const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;
    const createdByUser = await ctx.db.get(request.createdBy);

    return {
      ...request,
      dwelling,
      property,
      createdByUser,
    };
  },
});

// Update maintenance request
export const update = mutation({
  args: {
    requestId: v.id("maintenanceRequests"),
    status: v.optional(
      v.union(
        v.literal("reported"),
        v.literal("scheduled"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("urgent"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      )
    ),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    contractorName: v.optional(v.string()),
    contractorContact: v.optional(v.string()),
    quotedAmount: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    invoiceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { requestId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // Auto-set completed date if status changed to completed
    if (updates.status === "completed" && !updates.completedDate) {
      filteredUpdates.completedDate = new Date().toISOString().split("T")[0];
    }

    await ctx.db.patch(requestId, filteredUpdates);
    return { success: true };
  },
});

// Delete maintenance request
export const remove = mutation({
  args: { requestId: v.id("maintenanceRequests") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.requestId);
    return { success: true };
  },
});

// Get requests by status
export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("reported"),
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();

    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const dwelling = await ctx.db.get(request.dwellingId);
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        return {
          ...request,
          dwelling,
          property,
        };
      })
    );

    return requestsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get requests by priority
export const getByPriority = query({
  args: {
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_priority", (q) => q.eq("priority", args.priority))
      .collect();

    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const dwelling = await ctx.db.get(request.dwellingId);
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        return {
          ...request,
          dwelling,
          property,
        };
      })
    );

    return requestsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get urgent requests (for alerts/dashboard)
export const getUrgent = query({
  args: {},
  handler: async (ctx) => {
    const urgentRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_priority", (q) => q.eq("priority", "urgent"))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "reported"),
          q.eq(q.field("status"), "scheduled"),
          q.eq(q.field("status"), "in_progress")
        )
      )
      .collect();

    const requestsWithDetails = await Promise.all(
      urgentRequests.map(async (request) => {
        const dwelling = await ctx.db.get(request.dwellingId);
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        return {
          ...request,
          dwelling,
          property,
        };
      })
    );

    return requestsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get open requests (not completed or cancelled)
export const getOpen = query({
  args: {},
  handler: async (ctx) => {
    const allRequests = await ctx.db.query("maintenanceRequests").collect();
    const openRequests = allRequests.filter(
      (req) => req.status !== "completed" && req.status !== "cancelled"
    );

    const requestsWithDetails = await Promise.all(
      openRequests.map(async (request) => {
        const dwelling = await ctx.db.get(request.dwellingId);
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        return {
          ...request,
          dwelling,
          property,
        };
      })
    );

    return requestsWithDetails.sort((a, b) => {
      // Sort by priority first (urgent > high > medium > low)
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff =
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by creation date
      return b.createdAt - a.createdAt;
    });
  },
});

// Get maintenance statistics
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allRequests = await ctx.db.query("maintenanceRequests").collect();

    const stats = {
      total: allRequests.length,
      open:
        allRequests.filter(
          (r) => r.status !== "completed" && r.status !== "cancelled"
        ).length,
      urgent: allRequests.filter((r) => r.priority === "urgent").length,
      completed: allRequests.filter((r) => r.status === "completed").length,
      totalCost: allRequests.reduce((sum, r) => sum + (r.actualCost || 0), 0),
      averageCost:
        allRequests.filter((r) => r.actualCost).length > 0
          ? allRequests.reduce((sum, r) => sum + (r.actualCost || 0), 0) /
            allRequests.filter((r) => r.actualCost).length
          : 0,
    };

    return stats;
  },
});

// Get recent maintenance requests (for dashboard)
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const requests = await ctx.db.query("maintenanceRequests").collect();

    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const dwelling = await ctx.db.get(request.dwellingId);
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        return {
          ...request,
          dwelling,
          property,
        };
      })
    );

    return requestsWithDetails
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});
