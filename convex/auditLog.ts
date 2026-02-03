import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Type for audit log actions
export type AuditAction = "create" | "update" | "delete" | "view" | "login" | "logout" | "export" | "import";

// Type for entity types that can be audited
export type AuditEntityType =
  | "property"
  | "dwelling"
  | "participant"
  | "participantPlan"
  | "payment"
  | "maintenanceRequest"
  | "document"
  | "incident"
  | "incidentAction"
  | "contractor"
  | "quoteRequest"
  | "inspection"
  | "owner"
  | "user"
  | "alert"
  | "claim"
  | "ownerPayment"
  | "system";

// Internal mutation for logging - used by other mutations
export const log = internalMutation({
  args: {
    userId: v.id("users"),
    userEmail: v.string(),
    userName: v.string(),
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("view"),
      v.literal("login"),
      v.literal("logout"),
      v.literal("export"),
      v.literal("import")
    ),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    entityName: v.optional(v.string()),
    changes: v.optional(v.string()),
    previousValues: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      userEmail: args.userEmail,
      userName: args.userName,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      entityName: args.entityName,
      changes: args.changes,
      previousValues: args.previousValues,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

// Public mutation for logging (used from client-side when needed)
export const createLog = mutation({
  args: {
    userId: v.id("users"),
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("view"),
      v.literal("login"),
      v.literal("logout"),
      v.literal("export"),
      v.literal("import")
    ),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    entityName: v.optional(v.string()),
    changes: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user details
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      entityName: args.entityName,
      changes: args.changes,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

// Query audit logs with filters (admin only)
export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    entityType: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    action: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    // Get all logs, ordered by timestamp descending
    let logsQuery = ctx.db.query("auditLogs").order("desc");

    // If filtering by entityType, use the index
    if (args.entityType) {
      logsQuery = ctx.db
        .query("auditLogs")
        .withIndex("by_entityType", (q) => q.eq("entityType", args.entityType!))
        .order("desc");
    }

    // If filtering by userId, use the index
    if (args.userId) {
      logsQuery = ctx.db
        .query("auditLogs")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
        .order("desc");
    }

    const allLogs = await logsQuery.collect();

    // Apply additional filters
    let filteredLogs = allLogs.filter((log) => {
      // Date range filter
      if (args.startDate && log.timestamp < args.startDate) return false;
      if (args.endDate && log.timestamp > args.endDate) return false;

      // Action filter
      if (args.action && log.action !== args.action) return false;

      // Search term filter (searches in entityName, userEmail, userName)
      if (args.searchTerm) {
        const term = args.searchTerm.toLowerCase();
        const matches =
          log.entityName?.toLowerCase().includes(term) ||
          log.userEmail.toLowerCase().includes(term) ||
          log.userName.toLowerCase().includes(term) ||
          log.entityType.toLowerCase().includes(term);
        if (!matches) return false;
      }

      return true;
    });

    // Get total count before pagination
    const totalCount = filteredLogs.length;

    // Apply pagination
    filteredLogs = filteredLogs.slice(offset, offset + limit);

    return {
      logs: filteredLogs,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  },
});

// Get audit log statistics
export const getAuditStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db.query("auditLogs").collect();

    // Filter by date if provided
    const filteredLogs = logs.filter((log) => {
      if (args.startDate && log.timestamp < args.startDate) return false;
      if (args.endDate && log.timestamp > args.endDate) return false;
      return true;
    });

    // Count by action type
    const actionCounts: Record<string, number> = {};
    const entityTypeCounts: Record<string, number> = {};
    const userActivityCounts: Record<string, number> = {};

    for (const log of filteredLogs) {
      // Action counts
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;

      // Entity type counts
      entityTypeCounts[log.entityType] = (entityTypeCounts[log.entityType] || 0) + 1;

      // User activity counts
      userActivityCounts[log.userEmail] = (userActivityCounts[log.userEmail] || 0) + 1;
    }

    return {
      totalLogs: filteredLogs.length,
      actionCounts,
      entityTypeCounts,
      userActivityCounts,
      dateRange: {
        start: args.startDate || null,
        end: args.endDate || null,
      },
    };
  },
});

// Get recent activity for a specific entity
export const getEntityHistory = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_entityType_entityId", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .order("desc")
      .take(args.limit || 20);

    return logs;
  },
});

// Get user's recent activity
export const getUserActivity = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);

    return logs;
  },
});

// Helper function to format changes for logging
export function formatChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { changes: string; previousValues: string } {
  const changedFields: Record<string, unknown> = {};
  const previousFields: Record<string, unknown> = {};

  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedFields[key] = after[key];
      previousFields[key] = before[key];
    }
  }

  return {
    changes: JSON.stringify(changedFields),
    previousValues: JSON.stringify(previousFields),
  };
}