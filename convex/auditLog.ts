import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Type for audit log actions
export type AuditAction = "create" | "update" | "delete" | "view" | "login" | "logout" | "export" | "import" | "thread_merge" | "thread_split" | "consultation_gate" | "bulk_mark_read" | "bulk_categorize" | "bulk_thread" | "bulk_flag" | "mfa_enabled" | "mfa_disabled" | "mfa_backup_used" | "mfa_backup_regenerated" | "mfa_lockout" | "data_encrypted" | "restore" | "thread_status_change";

/**
 * Calculate SHA-256 hash of audit log entry for hash chain
 * This creates an immutable audit trail - any tampering will break the chain
 *
 * @param entry - The audit log entry to hash
 * @returns Hex string of SHA-256 hash
 */
async function hashLogEntry(entry: {
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  changes?: string;
  previousValues?: string;
  metadata?: string;
  timestamp: number;
  previousHash?: string;
  sequenceNumber?: number;
}): Promise<string> {
  // Create deterministic string representation of the entry
  const dataToHash = JSON.stringify({
    userId: entry.userId,
    userEmail: entry.userEmail,
    userName: entry.userName,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId || "",
    entityName: entry.entityName || "",
    changes: entry.changes || "",
    previousValues: entry.previousValues || "",
    metadata: entry.metadata || "",
    timestamp: entry.timestamp,
    previousHash: entry.previousHash || "",
    sequenceNumber: entry.sequenceNumber || 0,
  });

  // Convert string to Uint8Array for hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);

  // Calculate SHA-256 hash using Web Crypto API
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert hash to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

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
  | "communication"
  | "task"
  | "complaint"
  | "lead"
  | "system";

// Internal mutation for logging - used by other mutations
// Implements hash chain for immutability (NDIS 7-year retention compliance)
// NOTE: organizationId MUST be passed in from calling mutation
export const log = internalMutation({
  args: {
    organizationId: v.optional(v.id("organizations")), // Multi-tenant: Organization for audit log (optional during migration)
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
      v.literal("import"),
      v.literal("thread_merge"),
      v.literal("thread_split"),
      v.literal("consultation_gate"),
      v.literal("bulk_mark_read"),
      v.literal("bulk_categorize"),
      v.literal("bulk_thread"),
      v.literal("bulk_flag"),
      v.literal("mfa_enabled"),
      v.literal("mfa_disabled"),
      v.literal("mfa_backup_used"),
      v.literal("mfa_backup_regenerated"),
      v.literal("mfa_lockout"),
      v.literal("data_encrypted"),
      v.literal("restore"),
      v.literal("thread_status_change")
    ),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    entityName: v.optional(v.string()),
    changes: v.optional(v.string()),
    previousValues: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the most recent audit log entry for hash chain (PER ORGANIZATION)
    // NOTE: Each organization has its own hash chain for audit integrity
    const allLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_sequenceNumber")
      .order("desc")
      .collect();
    const previousLog = allLogs.find(log => log.organizationId === args.organizationId);

    // Calculate sequence number (per organization)
    const sequenceNumber = previousLog ? (previousLog.sequenceNumber || 0) + 1 : 1;

    // Get previous hash for chain (empty string for first entry)
    const previousHash = previousLog?.currentHash || "";

    // Create the entry data (without hash yet)
    const timestamp = Date.now();
    const entryData = {
      organizationId: args.organizationId,
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
      timestamp,
      previousHash,
      sequenceNumber,
    };

    // Calculate hash of this entry
    const currentHash = await hashLogEntry(entryData as any);

    // Insert the log with hash chain
    await ctx.db.insert("auditLogs", {
      ...entryData,
      currentHash,
      isIntegrityVerified: false, // Will be verified by daily cron
    });
  },
});

// Public mutation for logging (used from client-side when needed)
// Implements hash chain for immutability (NDIS 7-year retention compliance)
// NOTE: Gets organizationId from user
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
      v.literal("import"),
      v.literal("thread_merge"),
      v.literal("thread_split"),
      v.literal("consultation_gate"),
      v.literal("bulk_mark_read"),
      v.literal("bulk_categorize"),
      v.literal("bulk_thread"),
      v.literal("bulk_flag"),
      v.literal("mfa_enabled"),
      v.literal("mfa_disabled"),
      v.literal("mfa_backup_used"),
      v.literal("mfa_backup_regenerated"),
      v.literal("mfa_lockout"),
      v.literal("data_encrypted"),
      v.literal("restore"),
      v.literal("thread_status_change")
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
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new Error("User does not have organizationId");
    }

    // Get the most recent audit log entry for hash chain (PER ORGANIZATION)
    const allLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_sequenceNumber")
      .order("desc")
      .collect();
    const previousLog = allLogs.find(log => log.organizationId === organizationId);

    // Calculate sequence number (per organization)
    const sequenceNumber = previousLog ? (previousLog.sequenceNumber || 0) + 1 : 1;

    // Get previous hash for chain (empty string for first entry)
    const previousHash = previousLog?.currentHash || "";

    // Create the entry data (without hash yet)
    const timestamp = Date.now();
    const entryData = {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      entityName: args.entityName,
      changes: args.changes,
      metadata: args.metadata,
      timestamp,
      previousHash,
      sequenceNumber,
    };

    // Calculate hash of this entry
    const currentHash = await hashLogEntry(entryData as any);

    // Insert the log with hash chain
    await ctx.db.insert("auditLogs", {
      ...entryData,
      currentHash,
      isIntegrityVerified: false, // Will be verified by daily cron
    });
  },
});

// Query audit logs with filters (admin only)
export const getAuditLogs = query({
  args: {
    requestingUserId: v.id("users"), // Required for permission check
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    entityType: v.optional(v.string()),
    userId: v.optional(v.id("users")), // Optional filter by user
    action: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Admin-only permission check
    const requestingUser = await ctx.db.get(args.requestingUserId);
    if (!requestingUser) {
      throw new Error("User not found");
    }
    if (requestingUser.role !== "admin") {
      throw new Error("Access denied: Admin permission required to view audit logs");
    }
    const organizationId = requestingUser.organizationId;
    if (!organizationId) {
      throw new Error("User does not have organizationId");
    }

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
    // Filter to current organization
    const orgLogs = allLogs.filter(log => log.organizationId === organizationId);

    // Apply additional filters
    let filteredLogs = orgLogs.filter((log) => {
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
    requestingUserId: v.id("users"), // Required for permission check
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Admin-only permission check
    const requestingUser = await ctx.db.get(args.requestingUserId);
    if (!requestingUser) {
      throw new Error("User not found");
    }
    if (requestingUser.role !== "admin") {
      throw new Error("Access denied: Admin permission required to view audit statistics");
    }
    const organizationId = requestingUser.organizationId;
    if (!organizationId) {
      throw new Error("User does not have organizationId");
    }

    const allLogs = await ctx.db.query("auditLogs").collect();
    const logs = allLogs.filter(log => log.organizationId === organizationId);

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
    requestingUserId: v.id("users"), // Required for permission check
    entityType: v.string(),
    entityId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Admin-only permission check
    const requestingUser = await ctx.db.get(args.requestingUserId);
    if (!requestingUser) {
      throw new Error("User not found");
    }
    if (requestingUser.role !== "admin") {
      throw new Error("Access denied: Admin permission required to view entity history");
    }

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
    requestingUserId: v.id("users"), // Required for permission check
    userId: v.id("users"), // User whose activity to retrieve
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Admin-only permission check
    const requestingUser = await ctx.db.get(args.requestingUserId);
    if (!requestingUser) {
      throw new Error("User not found");
    }
    if (requestingUser.role !== "admin") {
      throw new Error("Access denied: Admin permission required to view user activity");
    }

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

// DELETION PREVENTION - Audit logs are immutable for NDIS 7-year retention compliance
export const deleteAuditLog = mutation({
  args: {
    logId: v.id("auditLogs"),
  },
  handler: async (ctx, args) => {
    throw new Error(
      "IMMUTABILITY VIOLATION: Audit logs cannot be deleted. " +
      "This is required for NDIS 7-year retention compliance and audit trail integrity. " +
      "All audit records must be preserved to maintain the hash chain. " +
      "If you need to mark a log as incorrect, create a new corrective entry instead."
    );
  },
});

// DELETION PREVENTION - Batch deletion also blocked
export const deleteMultipleAuditLogs = mutation({
  args: {
    logIds: v.array(v.id("auditLogs")),
  },
  handler: async (ctx, args) => {
    throw new Error(
      "IMMUTABILITY VIOLATION: Audit logs cannot be deleted. " +
      "This is required for NDIS 7-year retention compliance and audit trail integrity. " +
      "All audit records must be preserved to maintain the hash chain."
    );
  },
});

// Verify integrity of audit log hash chain
// Returns details of any broken links in the chain
export const verifyHashChainIntegrity = internalMutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_sequenceNumber")
      .order("asc")
      .collect();

    const violations: Array<{
      logId: string;
      sequenceNumber: number;
      issue: string;
      timestamp: number;
    }> = [];

    let verifiedCount = 0;
    let previousLog = null;

    for (const log of logs) {
      // Skip if already verified
      if (log.isIntegrityVerified) {
        previousLog = log;
        continue;
      }

      // Check 1: Verify sequence number is sequential
      if (previousLog && log.sequenceNumber !== (previousLog.sequenceNumber || 0) + 1) {
        violations.push({
          logId: log._id,
          sequenceNumber: log.sequenceNumber || 0,
          issue: `Sequence number gap detected. Expected ${(previousLog.sequenceNumber || 0) + 1}, got ${log.sequenceNumber}`,
          timestamp: log.timestamp,
        });
      }

      // Check 2: Verify previousHash matches previous entry's currentHash
      if (previousLog) {
        if (log.previousHash !== previousLog.currentHash) {
          violations.push({
            logId: log._id,
            sequenceNumber: log.sequenceNumber || 0,
            issue: `Hash chain broken. Previous hash mismatch.`,
            timestamp: log.timestamp,
          });
        }
      } else if (log.sequenceNumber === 1 && log.previousHash !== "") {
        violations.push({
          logId: log._id,
          sequenceNumber: log.sequenceNumber || 0,
          issue: `First entry should have empty previousHash`,
          timestamp: log.timestamp,
        });
      }

      // Check 3: Verify currentHash is correct by recalculating
      const calculatedHash = await hashLogEntry({
        userId: log.userId,
        userEmail: log.userEmail,
        userName: log.userName,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        entityName: log.entityName,
        changes: log.changes,
        previousValues: log.previousValues,
        metadata: log.metadata,
        timestamp: log.timestamp,
        previousHash: log.previousHash,
        sequenceNumber: log.sequenceNumber,
      });

      if (calculatedHash !== log.currentHash) {
        violations.push({
          logId: log._id,
          sequenceNumber: log.sequenceNumber || 0,
          issue: `Hash mismatch. Entry may have been tampered with.`,
          timestamp: log.timestamp,
        });
      }

      // If no violations for this log, mark as verified
      if (!violations.some(v => v.logId === log._id)) {
        await ctx.db.patch(log._id, { isIntegrityVerified: true });
        verifiedCount++;
      }

      previousLog = log;
    }

    return {
      totalLogs: logs.length,
      verifiedCount,
      violationsFound: violations.length,
      violations,
      timestamp: Date.now(),
    };
  },
});

// Public query to check integrity status (admin only)
export const getIntegrityStatus = query({
  args: {
    requestingUserId: v.id("users"), // Required for permission check
  },
  handler: async (ctx, args) => {
    // Admin-only permission check
    const requestingUser = await ctx.db.get(args.requestingUserId);
    if (!requestingUser) {
      throw new Error("User not found");
    }
    if (requestingUser.role !== "admin") {
      throw new Error("Access denied: Admin permission required to view integrity status");
    }
    const organizationId = requestingUser.organizationId;
    if (!organizationId) {
      throw new Error("User does not have organizationId");
    }

    const allLogs = await ctx.db.query("auditLogs").collect();
    const totalLogs = allLogs.filter(log => log.organizationId === organizationId);
    const verifiedLogs = totalLogs.filter(log => log.isIntegrityVerified === true);
    const unverifiedLogs = totalLogs.filter(log => !log.isIntegrityVerified);

    return {
      totalLogs: totalLogs.length,
      verifiedLogs: verifiedLogs.length,
      unverifiedLogs: unverifiedLogs.length,
      integrityPercentage: totalLogs.length > 0
        ? ((verifiedLogs.length / totalLogs.length) * 100).toFixed(2)
        : "0",
      oldestUnverifiedLog: unverifiedLogs.length > 0
        ? unverifiedLogs.sort((a, b) => a.timestamp - b.timestamp)[0].timestamp
        : null,
    };
  },
});