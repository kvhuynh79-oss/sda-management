import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth } from "./authHelpers";

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
    incidentId: v.optional(v.id("incidents")),
    incidentActionId: v.optional(v.id("incidentActions")),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify user has permission
    const user = await requirePermission(ctx, args.createdBy, "maintenance", "create");

    const now = Date.now();
    const requestId = await ctx.db.insert("maintenanceRequests", {
      ...args,
      status: "reported",
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "maintenanceRequest",
      entityId: requestId,
      entityName: args.title,
      metadata: JSON.stringify({
        category: args.category,
        priority: args.priority,
        requestType: args.requestType,
      }),
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
        const assignedContractor = request.assignedContractorId
          ? await ctx.db.get(request.assignedContractorId)
          : null;

        return {
          ...request,
          dwelling,
          property,
          createdByUser,
          assignedContractor,
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
    const assignedContractor = request.assignedContractorId
      ? await ctx.db.get(request.assignedContractorId)
      : null;

    return {
      ...request,
      dwelling,
      property,
      createdByUser,
      assignedContractor,
    };
  },
});

// Update maintenance request
export const update = mutation({
  args: {
    userId: v.id("users"),
    requestId: v.id("maintenanceRequests"),
    status: v.optional(
      v.union(
        v.literal("reported"),
        v.literal("awaiting_quotes"),
        v.literal("quoted"),
        v.literal("approved"),
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
    assignedContractorId: v.optional(v.id("contractors")),
    quotedAmount: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    invoiceNumber: v.optional(v.string()),
    completionNotes: v.optional(v.string()),
    warrantyPeriodMonths: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { requestId, userId, ...updates } = args;

    // Verify user has permission to update maintenance requests
    await requirePermission(ctx, userId, "maintenance", "update");

    // Get the request for audit logging
    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Maintenance request not found");

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // If assignedContractorId is provided, auto-populate contractor name/contact
    if (updates.assignedContractorId) {
      const contractor = await ctx.db.get(updates.assignedContractorId);
      if (contractor) {
        filteredUpdates.contractorName = contractor.companyName;
        filteredUpdates.contractorContact = contractor.phone || contractor.email;
      }
    }
    // If contractorName is provided without ID, try to find matching contractor
    else if (updates.contractorName && !updates.assignedContractorId) {
      const contractors = await ctx.db.query("contractors").collect();
      const matchingContractor = contractors.find(
        (c) => c.companyName.toLowerCase() === updates.contractorName!.toLowerCase()
      );
      if (matchingContractor) {
        filteredUpdates.assignedContractorId = matchingContractor._id;
      }
    }

    // Auto-set completed date if status changed to completed
    if (updates.status === "completed" && !updates.completedDate) {
      filteredUpdates.completedDate = new Date().toISOString().split("T")[0];
    }

    // Calculate warranty expiry date if completing with warranty period
    if (updates.status === "completed" && updates.warrantyPeriodMonths) {
      const completedDate = updates.completedDate || new Date().toISOString().split("T")[0];
      const expiryDate = new Date(completedDate);
      expiryDate.setMonth(expiryDate.getMonth() + updates.warrantyPeriodMonths);
      filteredUpdates.warrantyExpiryDate = expiryDate.toISOString().split("T")[0];
    }

    await ctx.db.patch(requestId, filteredUpdates);

    // Audit log if userId provided
    if (userId) {
      const user = await ctx.db.get(userId);
      if (user) {
        await ctx.runMutation(internal.auditLog.log, {
          userId: user._id,
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          action: "update",
          entityType: "maintenanceRequest",
          entityId: requestId,
          entityName: request.title,
          changes: JSON.stringify(filteredUpdates),
        });
      }
    }

    return { success: true };
  },
});

// Complete a maintenance request with confirmation details
export const completeRequest = mutation({
  args: {
    userId: v.id("users"),
    requestId: v.id("maintenanceRequests"),
    completedDate: v.string(),
    actualCost: v.optional(v.number()),
    invoiceNumber: v.optional(v.string()),
    completionNotes: v.string(), // How it was confirmed (email/phone/photo)
    warrantyPeriodMonths: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify user has permission to update maintenance requests
    await requirePermission(ctx, args.userId, "maintenance", "update");
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    // Calculate warranty expiry if warranty period provided
    let warrantyExpiryDate: string | undefined;
    if (args.warrantyPeriodMonths) {
      const expiryDate = new Date(args.completedDate);
      expiryDate.setMonth(expiryDate.getMonth() + args.warrantyPeriodMonths);
      warrantyExpiryDate = expiryDate.toISOString().split("T")[0];
    }

    await ctx.db.patch(args.requestId, {
      status: "completed",
      completedDate: args.completedDate,
      actualCost: args.actualCost,
      invoiceNumber: args.invoiceNumber,
      completionNotes: args.completionNotes,
      warrantyPeriodMonths: args.warrantyPeriodMonths,
      warrantyExpiryDate,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete maintenance request
export const remove = mutation({
  args: {
    userId: v.id("users"),
    requestId: v.id("maintenanceRequests"),
  },
  handler: async (ctx, args) => {
    // Verify user has permission to delete maintenance requests
    await requirePermission(ctx, args.userId, "maintenance", "delete");
    await ctx.db.delete(args.requestId);
    return { success: true };
  },
});

// Get requests by status
export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("reported"),
      v.literal("awaiting_quotes"),
      v.literal("quoted"),
      v.literal("approved"),
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
        q.and(
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "cancelled")
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

// Get maintenance requests by contractor
export const getByContractor = query({
  args: { contractorId: v.id("contractors") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_contractor", (q) => q.eq("assignedContractorId", args.contractorId))
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

// Get contractors used at a property (for contractor suggestions)
export const getContractorsUsedAtProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    // Get all dwellings for this property
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    const dwellingIds = new Set(dwellings.map((d) => d._id));

    // Get all maintenance requests with assigned contractors for these dwellings
    const allRequests = await ctx.db.query("maintenanceRequests").collect();
    const relevantRequests = allRequests.filter(
      (req) => dwellingIds.has(req.dwellingId) && req.assignedContractorId
    );

    // Count jobs per contractor
    const contractorStats = new Map<string, { count: number; lastUsed: number }>();
    for (const req of relevantRequests) {
      if (!req.assignedContractorId) continue;
      const id = req.assignedContractorId;
      const existing = contractorStats.get(id) || { count: 0, lastUsed: 0 };
      contractorStats.set(id, {
        count: existing.count + 1,
        lastUsed: Math.max(existing.lastUsed, req.createdAt),
      });
    }

    // Get contractor details
    const contractorsWithStats = await Promise.all(
      Array.from(contractorStats.entries()).map(async ([contractorId, stats]) => {
        const contractor = await ctx.db.get(contractorId as any);
        if (!contractor) return null;
        return {
          ...contractor,
          jobCount: stats.count,
          lastUsed: stats.lastUsed,
        };
      })
    );

    return contractorsWithStats
      .filter((c) => c !== null)
      .sort((a, b) => b!.jobCount - a!.jobCount);
  },
});

// Migration: Link existing maintenance requests to contractors by matching name
export const migrateContractorLinks = mutation({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("maintenanceRequests").collect();
    const contractors = await ctx.db.query("contractors").collect();

    const results = {
      linked: 0,
      skipped: 0,
      noMatch: 0,
    };

    for (const request of requests) {
      // Skip if already linked
      if (request.assignedContractorId) {
        results.skipped++;
        continue;
      }

      // Skip if no contractor name
      if (!request.contractorName) {
        results.noMatch++;
        continue;
      }

      // Try to find matching contractor
      const normalizedName = request.contractorName.toLowerCase().trim();
      const matchingContractor = contractors.find(
        (c) => c.companyName.toLowerCase().trim() === normalizedName
      );

      if (matchingContractor) {
        await ctx.db.patch(request._id, {
          assignedContractorId: matchingContractor._id,
          updatedAt: Date.now(),
        });
        results.linked++;
      } else {
        results.noMatch++;
      }
    }

    return results;
  },
});
