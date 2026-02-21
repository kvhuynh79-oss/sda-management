import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth, requireTenant, requireActiveSubscription } from "./authHelpers";
import { paginationArgs } from "./paginationHelpers";

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
    // Verify user has permission and get organizationId
    const user = await requirePermission(ctx, args.createdBy, "maintenance", "create");
    const { organizationId } = await requireTenant(ctx, args.createdBy);
    // B5 FIX: Require active subscription for write operations
    await requireActiveSubscription(ctx, organizationId);

    const now = Date.now();
    const requestId = await ctx.db.insert("maintenanceRequests", {
      ...args,
      organizationId,
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

    // Trigger webhook
    await ctx.scheduler.runAfter(0, internal.webhooks.triggerWebhook, {
      organizationId,
      event: "maintenance.created",
      payload: { requestId, title: args.title, priority: args.priority },
    });

    return requestId;
  },
});

// Get all maintenance requests with dwelling and property details
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const requests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", q => q.eq("organizationId", organizationId))
      .collect();

    // Batch fetch all dwellings
    const dwellingIds = [...new Set(requests.map((r) => r.dwellingId))];
    const dwellings = await Promise.all(dwellingIds.map((id) => ctx.db.get(id)));
    const dwellingMap = new Map(dwellings.map((d, i) => [dwellingIds[i], d]));

    // Batch fetch all properties
    const propertyIds = [...new Set(dwellings.filter(Boolean).map((d) => d!.propertyId))];
    const properties = await Promise.all(propertyIds.map((id) => ctx.db.get(id)));
    const propertyMap = new Map(properties.map((p, i) => [propertyIds[i], p]));

    // Batch fetch all users
    const userIds = [...new Set(requests.map((r) => r.createdBy))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(users.map((u, i) => [userIds[i], u]));

    // Batch fetch all contractors
    const contractorIds = [...new Set(requests.filter((r) => r.assignedContractorId).map((r) => r.assignedContractorId!))];
    const contractors = await Promise.all(contractorIds.map((id) => ctx.db.get(id)));
    const contractorMap = new Map(contractors.map((c, i) => [contractorIds[i], c]));

    // Build result with pre-fetched data
    const requestsWithDetails = requests.map((request) => {
      const dwelling = dwellingMap.get(request.dwellingId);
      const property = dwelling ? propertyMap.get(dwelling.propertyId) : null;
      const createdByUser = userMap.get(request.createdBy);
      const assignedContractor = request.assignedContractorId
        ? contractorMap.get(request.assignedContractorId)
        : null;

      return {
        ...request,
        dwelling,
        property,
        createdByUser,
        assignedContractor,
      };
    });

    return requestsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get maintenance requests by dwelling
export const getByDwelling = query({
  args: { userId: v.id("users"), dwellingId: v.id("dwellings") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId))
      .collect();

    // Filter to organization
    const requests = allRequests.filter(r => r.organizationId === organizationId);

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
  args: { userId: v.id("users"), propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Get all dwellings for this property
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    const dwellingIds = dwellings.map((d) => d._id);

    // Get all maintenance requests for these dwellings (scoped to organization)
    const allRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", q => q.eq("organizationId", organizationId))
      .collect();
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
  args: { userId: v.id("users"), requestId: v.id("maintenanceRequests") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;
    if (request.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

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

    // Verify user has permission to update maintenance requests and get organizationId
    await requirePermission(ctx, userId, "maintenance", "update");
    const { organizationId } = await requireTenant(ctx, userId);

    // Get the request for audit logging and verify ownership
    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Maintenance request not found");
    if (request.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

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

    // Trigger webhook
    await ctx.scheduler.runAfter(0, internal.webhooks.triggerWebhook, {
      organizationId,
      event: "maintenance.updated",
      payload: { requestId: args.requestId },
    });

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
    // Verify user has permission to update maintenance requests and get organizationId
    await requirePermission(ctx, args.userId, "maintenance", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

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

    // Trigger webhook
    await ctx.scheduler.runAfter(0, internal.webhooks.triggerWebhook, {
      organizationId,
      event: "maintenance.completed",
      payload: { requestId: args.requestId },
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
    const { organizationId } = await requireTenant(ctx, args.userId);

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Maintenance request not found");
    if (request.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    await ctx.db.delete(args.requestId);
    return { success: true };
  },
});

// Get requests by status
export const getByStatus = query({
  args: {
    userId: v.id("users"),
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
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();

    const requests = allRequests.filter(r => r.organizationId === organizationId);

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
    userId: v.id("users"),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_priority", (q) => q.eq("priority", args.priority))
      .collect();

    const requests = allRequests.filter(r => r.organizationId === organizationId);

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
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_priority", (q) => q.eq("priority", "urgent"))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    const urgentRequests = allRequests.filter(r => r.organizationId === organizationId);

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
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", q => q.eq("organizationId", organizationId))
      .collect();
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
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", q => q.eq("organizationId", organizationId))
      .collect();

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
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const limit = args.limit || 10;
    const requests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", q => q.eq("organizationId", organizationId))
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

    return requestsWithDetails
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

// Get maintenance requests by contractor
export const getByContractor = query({
  args: { userId: v.id("users"), contractorId: v.id("contractors") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_contractor", (q) => q.eq("assignedContractorId", args.contractorId))
      .collect();

    const requests = allRequests.filter(r => r.organizationId === organizationId);

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
  args: { userId: v.id("users"), propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Get all dwellings for this property
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    const dwellingIds = new Set(dwellings.map((d) => d._id));

    // Get all maintenance requests with assigned contractors for these dwellings (scoped to organization)
    const allRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", q => q.eq("organizationId", organizationId))
      .collect();
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

// Get maintenance requests with pagination
export const getAllPaginated = query({
  args: {
    userId: v.id("users"),
    ...paginationArgs,
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    dwellingId: v.optional(v.id("dwellings")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Build query based on filters - use organizationId index first
    let result;

    if (args.dwellingId) {
      // Filter by dwelling (fetch all then filter in-memory for org)
      const dwellingQuery = ctx.db
        .query("maintenanceRequests")
        .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId!));
      const allResults = await dwellingQuery.order("desc").paginate(args.paginationOpts);
      result = {
        ...allResults,
        page: allResults.page.filter(r => r.organizationId === organizationId),
      };
    } else if (args.status) {
      // Filter by status (fetch all then filter in-memory for org)
      const statusQuery = ctx.db
        .query("maintenanceRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status as any));
      const allResults = await statusQuery.order("desc").paginate(args.paginationOpts);
      result = {
        ...allResults,
        page: allResults.page.filter(r => r.organizationId === organizationId),
      };
    } else if (args.priority) {
      // Filter by priority (fetch all then filter in-memory for org)
      const priorityQuery = ctx.db
        .query("maintenanceRequests")
        .withIndex("by_priority", (q) => q.eq("priority", args.priority as any));
      const allResults = await priorityQuery.order("desc").paginate(args.paginationOpts);
      result = {
        ...allResults,
        page: allResults.page.filter(r => r.organizationId === organizationId),
      };
    } else {
      // Default: all requests scoped to organization
      const defaultQuery = ctx.db
        .query("maintenanceRequests")
        .withIndex("by_organizationId", q => q.eq("organizationId", organizationId));
      result = await defaultQuery.order("desc").paginate(args.paginationOpts);
    }

    // Enrich with dwelling, property, and contractor data
    const enrichedPage = await Promise.all(
      result.page.map(async (request) => {
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

    return {
      ...result,
      page: enrichedPage,
    };
  },
});

// Create a maintenance request from a failed inspection item (server-to-server, no auth check)
export const createFromInspection = internalMutation({
  args: {
    dwellingId: v.id("dwellings"),
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
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
    inspectionId: v.id("inspections"),
    inspectionItemId: v.id("inspectionItems"),
    createdBy: v.id("users"),
    reportedDate: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const requestId = await ctx.db.insert("maintenanceRequests", {
      dwellingId: args.dwellingId,
      organizationId: args.organizationId,
      requestType: "reactive",
      category: args.category,
      priority: args.priority,
      title: args.title,
      description: args.description,
      reportedBy: "Inspection System",
      reportedDate: args.reportedDate,
      status: "reported",
      inspectionId: args.inspectionId,
      inspectionItemId: args.inspectionItemId,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    // Copy inspection item photos to maintenance request
    const inspectionPhotos = await ctx.db
      .query("inspectionPhotos")
      .withIndex("by_item", (q) => q.eq("inspectionItemId", args.inspectionItemId))
      .collect();

    for (const photo of inspectionPhotos) {
      await ctx.db.insert("maintenancePhotos", {
        maintenanceRequestId: requestId,
        organizationId: args.organizationId,
        storageId: photo.storageId,
        fileName: photo.fileName,
        fileSize: photo.fileSize,
        fileType: photo.fileType,
        description: photo.description,
        photoType: "issue",
        uploadedBy: photo.uploadedBy,
        createdAt: now,
      });
    }

    // Audit log
    const user = await ctx.db.get(args.createdBy);
    if (user) {
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
          requestType: "reactive",
          source: "inspection",
          inspectionId: args.inspectionId,
          inspectionItemId: args.inspectionItemId,
        }),
      });
    }

    // Trigger webhook
    await ctx.scheduler.runAfter(0, internal.webhooks.triggerWebhook, {
      organizationId: args.organizationId,
      event: "maintenance.created",
      payload: { requestId, title: args.title, priority: args.priority },
    });

    return requestId;
  },
});
