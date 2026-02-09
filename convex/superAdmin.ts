import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Super-Admin Module - Platform-level administration for MySDAManager SaaS
 *
 * This module provides cross-tenant queries and mutations for platform super-admins.
 * Super-admin is a platform-level privilege (isSuperAdmin flag on users table),
 * separate from the org-level role system (admin, property_manager, etc.).
 *
 * SECURITY: All functions in this module require isSuperAdmin === true.
 * These functions intentionally bypass requireTenant() because super-admins
 * operate across all organizations.
 *
 * Sprint 6 of SaaS Transformation
 */

// ============================================================================
// HELPER
// ============================================================================

/**
 * Verify the calling user is a platform super-admin.
 * Throws if user not found, inactive, or not a super-admin.
 */
async function requireSuperAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
) {
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  if (!user.isActive) throw new Error("Account is disabled");
  if (!user.isSuperAdmin) throw new Error("Super-admin access required");
  return user;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all organizations with enriched usage stats.
 * Returns org details + counts of users, properties, dwellings, participants,
 * active maintenance requests, incidents, and the most recent user login timestamp.
 * Sorted by most recent activity (last login) descending.
 */
export const getAllOrganizations = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const organizations = await ctx.db.query("organizations").collect();

    // Build enriched org list with stats
    const enrichedOrgs = await Promise.all(
      organizations.map(async (org) => {
        // Count users in this org
        const users = await ctx.db
          .query("users")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", org._id)
          )
          .collect();

        // Count properties in this org
        const properties = await ctx.db
          .query("properties")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", org._id)
          )
          .collect();

        // Count dwellings in this org
        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", org._id)
          )
          .collect();

        // Count participants in this org
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", org._id)
          )
          .collect();

        // Count active maintenance requests
        const maintenanceRequests = await ctx.db
          .query("maintenanceRequests")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", org._id)
          )
          .collect();
        const activeMaintenanceCount = maintenanceRequests.filter(
          (m) => m.status !== "completed" && m.status !== "cancelled"
        ).length;

        // Count incidents
        const incidents = await ctx.db
          .query("incidents")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", org._id)
          )
          .collect();

        // Find most recent user login in this org
        const lastLoginTimestamp = users.reduce<number | null>((latest, u) => {
          if (!u.lastLogin) return latest;
          if (latest === null) return u.lastLogin;
          return u.lastLogin > latest ? u.lastLogin : latest;
        }, null);

        return {
          ...org,
          stats: {
            userCount: users.length,
            activeUserCount: users.filter((u) => u.isActive).length,
            propertyCount: properties.length,
            activePropertyCount: properties.filter((p) => p.isActive !== false)
              .length,
            dwellingCount: dwellings.length,
            participantCount: participants.length,
            activeParticipantCount: participants.filter(
              (p) => p.status === "active" || p.status === "pending_move_in"
            ).length,
            activeMaintenanceCount,
            incidentCount: incidents.length,
          },
          lastLoginTimestamp,
        };
      })
    );

    // Sort by most recent activity (last login) descending, nulls last
    enrichedOrgs.sort((a, b) => {
      if (a.lastLoginTimestamp === null && b.lastLoginTimestamp === null)
        return 0;
      if (a.lastLoginTimestamp === null) return 1;
      if (b.lastLoginTimestamp === null) return -1;
      return b.lastLoginTimestamp - a.lastLoginTimestamp;
    });

    return enrichedOrgs;
  },
});

/**
 * Get detailed information for a single organization.
 * Returns org details, all users, entity counts, and recent audit log entries.
 */
export const getOrganizationDetail = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Get all users in this org
    const users = await ctx.db
      .query("users")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Sanitize users - remove passwordHash and MFA secrets
    const sanitizedUsers = users.map((u) => ({
      _id: u._id,
      _creationTime: u._creationTime,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      phone: u.phone,
      isActive: u.isActive,
      lastLogin: u.lastLogin,
      isSuperAdmin: u.isSuperAdmin,
      mfaEnabled: u.mfaEnabled,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    // Count properties
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Count dwellings
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Count participants
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Count documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Get recent audit logs for this org (last 10)
    const auditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(10);

    return {
      organization: org,
      users: sanitizedUsers,
      counts: {
        properties: properties.length,
        activeProperties: properties.filter((p) => p.isActive !== false).length,
        dwellings: dwellings.length,
        participants: participants.length,
        activeParticipants: participants.filter(
          (p) => p.status === "active" || p.status === "pending_move_in"
        ).length,
        documents: documents.length,
      },
      recentAuditLogs: auditLogs,
    };
  },
});

/**
 * Get platform-level metrics for the super-admin dashboard.
 * Aggregates counts across all organizations.
 */
export const getPlatformMetrics = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    // Count organizations
    const organizations = await ctx.db.query("organizations").collect();
    const activeOrganizations = organizations.filter((o) => o.isActive);

    // Count all users across all orgs
    const allUsers = await ctx.db.query("users").collect();
    const activeUsers = allUsers.filter((u) => u.isActive);

    // Count all properties across all orgs
    const allProperties = await ctx.db.query("properties").collect();

    // Count all dwellings across all orgs
    const allDwellings = await ctx.db.query("dwellings").collect();

    // Count all participants across all orgs
    const allParticipants = await ctx.db.query("participants").collect();

    // Revenue by plan: count organizations per plan tier
    const revenueByPlan = {
      starter: {
        count: organizations.filter((o) => o.plan === "starter").length,
        activeCount: activeOrganizations.filter((o) => o.plan === "starter")
          .length,
      },
      professional: {
        count: organizations.filter((o) => o.plan === "professional").length,
        activeCount: activeOrganizations.filter(
          (o) => o.plan === "professional"
        ).length,
      },
      enterprise: {
        count: organizations.filter((o) => o.plan === "enterprise").length,
        activeCount: activeOrganizations.filter((o) => o.plan === "enterprise")
          .length,
      },
    };

    // Subscription status breakdown
    const subscriptionBreakdown = {
      active: organizations.filter((o) => o.subscriptionStatus === "active")
        .length,
      trialing: organizations.filter((o) => o.subscriptionStatus === "trialing")
        .length,
      past_due: organizations.filter(
        (o) => o.subscriptionStatus === "past_due"
      ).length,
      canceled: organizations.filter(
        (o) => o.subscriptionStatus === "canceled"
      ).length,
    };

    return {
      totalOrganizations: organizations.length,
      activeOrganizations: activeOrganizations.length,
      totalUsers: allUsers.length,
      activeUsers: activeUsers.length,
      totalProperties: allProperties.length,
      totalDwellings: allDwellings.length,
      totalParticipants: allParticipants.length,
      revenueByPlan,
      subscriptionBreakdown,
    };
  },
});

/**
 * Get all users in a specific organization.
 * Returns sanitized user records (no password hashes or MFA secrets).
 */
export const getOrganizationUsers = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const users = await ctx.db
      .query("users")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Return sanitized user list
    return users.map((u) => ({
      _id: u._id,
      _creationTime: u._creationTime,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      phone: u.phone,
      isActive: u.isActive,
      lastLogin: u.lastLogin,
      isSuperAdmin: u.isSuperAdmin,
      mfaEnabled: u.mfaEnabled,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Toggle an organization's active status (suspend or reactivate).
 * Suspending sets isActive=false and subscriptionStatus=canceled.
 * Reactivating sets isActive=true and subscriptionStatus=active.
 */
export const toggleOrgActive = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    await ctx.db.patch(args.organizationId, {
      isActive: args.isActive,
      subscriptionStatus: args.isActive ? "active" : "canceled",
    });

    return {
      success: true,
      organizationId: args.organizationId,
      isActive: args.isActive,
    };
  },
});

/**
 * Extend or set a trial period for an organization.
 * Adds the specified number of days to the current trialEndsAt,
 * or creates a new trial period from now if no trial exists.
 */
export const extendTrial = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    additionalDays: v.number(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    if (args.additionalDays <= 0 || args.additionalDays > 365) {
      throw new Error("Additional days must be between 1 and 365");
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    const msPerDay = 24 * 60 * 60 * 1000;
    const additionalMs = args.additionalDays * msPerDay;

    // If org already has a trial end date, extend from that date.
    // Otherwise, extend from now.
    const baseTimestamp = org.trialEndsAt ?? Date.now();
    const newTrialEndsAt = baseTimestamp + additionalMs;

    await ctx.db.patch(args.organizationId, {
      trialEndsAt: newTrialEndsAt,
      subscriptionStatus: "trialing",
    });

    return {
      success: true,
      organizationId: args.organizationId,
      trialEndsAt: newTrialEndsAt,
      trialEndsAtISO: new Date(newTrialEndsAt).toISOString(),
    };
  },
});

/**
 * Override plan limits for an organization.
 * Allows super-admins to grant custom limits beyond standard plan tiers.
 * Only patches fields that are provided.
 */
export const adjustPlanLimits = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    maxUsers: v.optional(v.number()),
    maxProperties: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    const updates: { maxUsers?: number; maxProperties?: number } = {};

    if (args.maxUsers !== undefined) {
      if (args.maxUsers < 1 || args.maxUsers > 999999) {
        throw new Error("maxUsers must be between 1 and 999999");
      }
      updates.maxUsers = args.maxUsers;
    }

    if (args.maxProperties !== undefined) {
      if (args.maxProperties < 1 || args.maxProperties > 999999) {
        throw new Error("maxProperties must be between 1 and 999999");
      }
      updates.maxProperties = args.maxProperties;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("At least one limit (maxUsers or maxProperties) must be provided");
    }

    await ctx.db.patch(args.organizationId, updates);

    return {
      success: true,
      organizationId: args.organizationId,
      updatedLimits: updates,
    };
  },
});

/**
 * Set or remove super-admin privilege on a user.
 * Can only be performed by an existing super-admin.
 * A super-admin cannot remove their own super-admin status (safety check).
 */
export const setSuperAdmin = mutation({
  args: {
    userId: v.id("users"),
    targetUserId: v.id("users"),
    isSuperAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    // Safety: prevent super-admin from revoking their own access
    if (
      args.userId === args.targetUserId &&
      args.isSuperAdmin === false
    ) {
      throw new Error(
        "Cannot remove your own super-admin access. Another super-admin must do this."
      );
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw new Error("Target user not found");

    await ctx.db.patch(args.targetUserId, {
      isSuperAdmin: args.isSuperAdmin,
    });

    return {
      success: true,
      targetUserId: args.targetUserId,
      targetEmail: targetUser.email,
      isSuperAdmin: args.isSuperAdmin,
    };
  },
});

/**
 * Impersonate an organization - returns a read-only snapshot of an org's data.
 * Used by super-admins to view an organization's state for support/debugging.
 * This is strictly READ-ONLY - no mutations are performed.
 */
export const impersonateOrganization = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Properties (all, with dwelling counts)
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const propertySummaries = properties.map((p) => ({
      _id: p._id,
      propertyName: p.propertyName,
      addressLine1: p.addressLine1,
      suburb: p.suburb,
      state: p.state,
      postcode: p.postcode,
      propertyStatus: p.propertyStatus,
      isActive: p.isActive,
      createdAt: p.createdAt,
    }));

    // Participants
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const participantSummaries = participants.map((p) => ({
      _id: p._id,
      firstName: p.firstName,
      lastName: p.lastName,
      ndisNumber: p.ndisNumber,
      status: p.status,
      createdAt: p.createdAt,
    }));

    // Recent maintenance requests (last 20)
    const maintenanceRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(20);

    const maintenanceSummaries = maintenanceRequests.map((m) => ({
      _id: m._id,
      title: m.title,
      status: m.status,
      priority: m.priority,
      category: m.category,
      createdAt: m.createdAt,
    }));

    // Recent incidents (last 20)
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(20);

    const incidentSummaries = incidents.map((i) => ({
      _id: i._id,
      title: i.title,
      status: i.status,
      severity: i.severity,
      isNdisReportable: i.isNdisReportable,
      createdAt: i.createdAt,
    }));

    // Recent payments (last 20)
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(20);

    const paymentSummaries = payments.map((p) => ({
      _id: p._id,
      expectedAmount: p.expectedAmount,
      actualAmount: p.actualAmount,
      variance: p.variance,
      paymentDate: p.paymentDate,
      paymentSource: p.paymentSource,
    }));

    return {
      organization: org,
      properties: propertySummaries,
      participants: participantSummaries,
      recentMaintenance: maintenanceSummaries,
      recentIncidents: incidentSummaries,
      recentPayments: paymentSummaries,
    };
  },
});

// ============================================================================
// TEMPORARY CLI MUTATION
// ============================================================================

// setFirstSuperAdminCli removed after execution (khen set as super-admin)
