import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission, requireAuth, requireTenant } from "./authHelpers";

/**
 * Organizations Module - Multi-tenant SaaS organization management
 *
 * This module provides CRUD operations for organizations (tenants) in the multi-tenant SaaS.
 * Organizations represent distinct SDA providers using the MySDAManager platform.
 *
 * Sprint 1 of SaaS Transformation
 */

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get organization by ID
 * Returns the organization details for the given ID
 */
export const getById = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId); // Must be authenticated

    const organization = await ctx.db.get(args.organizationId);

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Resolve logoUrl from storageId to actual URL
    let resolvedLogoUrl: string | undefined;
    if (organization.logoUrl) {
      try {
        const url = await ctx.storage.getUrl(organization.logoUrl as any);
        resolvedLogoUrl = url ?? undefined;
      } catch {
        // Storage ID invalid or file deleted
      }
    }

    return { ...organization, resolvedLogoUrl };
  },
});

/**
 * Get organization by slug
 * Used for public-facing URLs and organization lookup
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!organization) {
      throw new Error(`Organization not found: ${args.slug}`);
    }

    return organization;
  },
});

/**
 * Get all organizations (super-admin only)
 * Used in the platform super-admin dashboard
 */
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // TODO: Once super-admin role is implemented, add requireSuperAdmin check
    await requirePermission(ctx, args.userId, "users", "view");

    const organizations = await ctx.db
      .query("organizations")
      .order("desc")
      .collect();

    return organizations;
  },
});

/**
 * Get active organizations only
 * Used for org selection dropdowns
 */
export const getActive = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "users", "view");

    const organizations = await ctx.db
      .query("organizations")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    return organizations;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new organization
 * Used during signup flow (Sprint 3) and by super-admins
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    plan: v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise")),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId); // Must be authenticated

    // Validate slug is unique
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existingOrg) {
      throw new Error(`Organization slug already exists: ${args.slug}`);
    }

    // Validate slug format (URL-safe)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(args.slug)) {
      throw new Error("Slug must be lowercase, alphanumeric with hyphens only (e.g., 'better-living-solutions')");
    }

    // Set plan limits based on tier
    let maxUsers: number;
    let maxProperties: number;

    switch (args.plan) {
      case "starter":
        maxUsers = 5;
        maxProperties = 50;
        break;
      case "professional":
        maxUsers = 20;
        maxProperties = 200;
        break;
      case "enterprise":
        maxUsers = 999999; // "Unlimited" (practical limit)
        maxProperties = 999999;
        break;
    }

    const now = Date.now();

    const organizationId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      plan: args.plan,
      subscriptionStatus: "trialing", // New orgs start in trial
      maxUsers,
      maxProperties,
      primaryColor: args.primaryColor,
      logoUrl: args.logoUrl,
      isActive: true,
      createdAt: now,
    });

    return organizationId;
  },
});

/**
 * Update organization details
 * Used for org settings, plan upgrades, branding changes
 */
export const update = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    plan: v.optional(v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise"))),
    subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("trialing"), v.literal("past_due"), v.literal("canceled"))),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    settings: v.optional(v.object({
      timezone: v.optional(v.string()),
      dateFormat: v.optional(v.string()),
      currency: v.optional(v.string()),
      fiscalYearStart: v.optional(v.string()),
      complianceRegion: v.optional(v.string()),
      onboardingComplete: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const organization = await ctx.db.get(args.organizationId);

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Build update object
    const updates: any = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.primaryColor !== undefined) updates.primaryColor = args.primaryColor;
    if (args.logoUrl !== undefined) updates.logoUrl = args.logoUrl;
    if (args.subscriptionStatus !== undefined) updates.subscriptionStatus = args.subscriptionStatus;
    if (args.stripeCustomerId !== undefined) updates.stripeCustomerId = args.stripeCustomerId;
    if (args.stripeSubscriptionId !== undefined) updates.stripeSubscriptionId = args.stripeSubscriptionId;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.settings !== undefined) updates.settings = args.settings;

    // If plan is being changed, update limits
    if (args.plan !== undefined && args.plan !== organization.plan) {
      updates.plan = args.plan;

      switch (args.plan) {
        case "starter":
          updates.maxUsers = 5;
          updates.maxProperties = 50;
          break;
        case "professional":
          updates.maxUsers = 20;
          updates.maxProperties = 200;
          break;
        case "enterprise":
          updates.maxUsers = 999999;
          updates.maxProperties = 999999;
          break;
      }
    }

    await ctx.db.patch(args.organizationId, updates);

    return { success: true };
  },
});

/**
 * Deactivate organization (soft delete)
 * Used when subscription is canceled or org needs to be suspended
 */
export const deactivate = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "users", "delete");

    await ctx.db.patch(args.organizationId, {
      isActive: false,
      subscriptionStatus: "canceled",
    });

    return { success: true };
  },
});

/**
 * Reactivate organization
 * Used when org resubscribes or suspension is lifted
 */
export const reactivate = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "users", "update");

    await ctx.db.patch(args.organizationId, {
      isActive: true,
      subscriptionStatus: "active",
    });

    return { success: true };
  },
});

// ============================================================================
// PLAN ENFORCEMENT QUERIES (Sprint 3)
// ============================================================================

/**
 * Plan limits configuration.
 * Centralized definition of what each plan tier allows.
 * Used by getPlanLimits and checkPlanLimit.
 */
type PlanTier = "starter" | "professional" | "enterprise";

interface PlanLimitConfig {
  maxProperties: number;
  maxUsers: number;
  maxDwellings: number;
}

const PLAN_LIMITS: Record<PlanTier, PlanLimitConfig> = {
  starter: { maxProperties: 10, maxUsers: 5, maxDwellings: 20 },
  professional: { maxProperties: 25, maxUsers: 15, maxDwellings: 75 },
  enterprise: { maxProperties: 50, maxUsers: 50, maxDwellings: 200 },
};

/**
 * Get the plan limits for a given plan tier.
 * Returns the maximum allowed counts for properties, users, and dwellings.
 *
 * This is a public query (no auth) so it can be used on the pricing page.
 */
export const getPlanLimits = query({
  args: {
    plan: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise")
    ),
  },
  handler: async (_ctx, args): Promise<PlanLimitConfig & { plan: string }> => {
    const limits = PLAN_LIMITS[args.plan];
    return { ...limits, plan: args.plan };
  },
});

/**
 * Check whether the organization has reached a specific plan limit.
 * Used before creating new properties, users, or dwellings to enforce quotas.
 *
 * Returns:
 * - allowed: boolean - whether the action is allowed
 * - current: number - current count of the resource
 * - limit: number - maximum allowed by the plan
 * - resource: string - which resource was checked
 */
export const checkPlanLimit = query({
  args: {
    userId: v.id("users"),
    resource: v.union(
      v.literal("properties"),
      v.literal("users"),
      v.literal("dwellings")
    ),
  },
  handler: async (ctx, args): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    resource: string;
    plan: string;
  }> => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const org = await ctx.db.get(organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const limits = PLAN_LIMITS[org.plan as PlanTier] ?? PLAN_LIMITS.starter;

    let current = 0;
    let limit = 0;

    switch (args.resource) {
      case "properties": {
        const properties = await ctx.db
          .query("properties")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", organizationId)
          )
          .collect();
        // Only count active properties
        current = properties.filter((p) => p.isActive !== false).length;
        limit = limits.maxProperties;
        break;
      }

      case "users": {
        const users = await ctx.db
          .query("users")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", organizationId)
          )
          .collect();
        // Only count active users
        current = users.filter((u) => u.isActive).length;
        limit = limits.maxUsers;
        break;
      }

      case "dwellings": {
        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", organizationId)
          )
          .collect();
        // Only count active dwellings
        current = dwellings.filter((d) => d.isActive !== false).length;
        limit = limits.maxDwellings;
        break;
      }
    }

    return {
      allowed: current < limit,
      current,
      limit,
      resource: args.resource,
      plan: org.plan,
    };
  },
});

/**
 * Get usage statistics for an organization.
 * Shows current counts vs plan limits for properties, users, and dwellings.
 * Used in the admin dashboard and settings page for quota visualization.
 */
export const getUsageStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    plan: string;
    subscriptionStatus: string;
    properties: { current: number; limit: number; percentage: number };
    users: { current: number; limit: number; percentage: number };
    dwellings: { current: number; limit: number; percentage: number };
    participants: { current: number };
    maintenanceRequests: { active: number };
  }> => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const org = await ctx.db.get(organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const limits = PLAN_LIMITS[org.plan as PlanTier] ?? PLAN_LIMITS.starter;

    // Count active properties
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();
    const activeProperties = properties.filter((p) => p.isActive !== false).length;

    // Count active users
    const users = await ctx.db
      .query("users")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();
    const activeUsers = users.filter((u) => u.isActive).length;

    // Count active dwellings
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();
    const activeDwellings = dwellings.filter((d) => d.isActive !== false).length;

    // Count participants (informational, not plan-limited)
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();
    const activeParticipants = participants.filter(
      (p) => p.status === "active" || p.status === "pending_move_in"
    ).length;

    // Count active maintenance requests (informational)
    const maintenanceRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();
    const activeMaintenanceRequests = maintenanceRequests.filter(
      (m) => m.status !== "completed" && m.status !== "cancelled"
    ).length;

    // Calculate percentages (capped at 100)
    const calcPercentage = (current: number, limit: number) =>
      limit > 0 ? Math.min(Math.round((current / limit) * 100), 100) : 0;

    return {
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      properties: {
        current: activeProperties,
        limit: limits.maxProperties,
        percentage: calcPercentage(activeProperties, limits.maxProperties),
      },
      users: {
        current: activeUsers,
        limit: limits.maxUsers,
        percentage: calcPercentage(activeUsers, limits.maxUsers),
      },
      dwellings: {
        current: activeDwellings,
        limit: limits.maxDwellings,
        percentage: calcPercentage(activeDwellings, limits.maxDwellings),
      },
      participants: { current: activeParticipants },
      maintenanceRequests: { active: activeMaintenanceRequests },
    };
  },
});

// ============================================================================
// EMAIL FORWARDING
// ============================================================================

/**
 * Generate a unique inbound email forwarding address for the organization.
 * Format: {slug}-{6-char-random}@inbound.mysdamanager.com
 */
export const generateInboundEmailAddress = mutation({
  args: { userId: v.id("users"), organizationId: v.optional(v.id("organizations")) },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "users", "update");

    const org = await ctx.db.get(organizationId);
    if (!org) throw new Error("Organization not found");

    // Generate 6-char random suffix
    const randomBytes = new Uint8Array(4);
    crypto.getRandomValues(randomBytes);
    const suffix = Array.from(randomBytes)
      .map((b) => b.toString(36))
      .join("")
      .substring(0, 6);

    const address = `${org.slug}-${suffix}@inbound.mysdamanager.com`;

    await ctx.db.patch(organizationId, {
      inboundEmailAddress: address,
      inboundEmailEnabled: true,
    });

    return { address };
  },
});

/**
 * Toggle inbound email forwarding on/off for the organization.
 */
export const updateInboundEmailSettings = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "users", "update");

    await ctx.db.patch(organizationId, {
      inboundEmailEnabled: args.enabled,
    });

    return { success: true };
  },
});

/**
 * Set the Postmark default hash address for fallback routing.
 * Used when MX records haven't propagated for the custom domain.
 */
export const setPostmarkHashAddress = mutation({
  args: {
    userId: v.id("users"),
    postmarkHashAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "users", "update");

    await ctx.db.patch(organizationId, {
      postmarkHashAddress: args.postmarkHashAddress.toLowerCase().trim(),
    });

    return { success: true };
  },
});

/**
 * Add a registered email forwarder for the organization.
 * Maps an email address to a user so we know who forwarded the email.
 */
export const addEmailForwarder = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "users", "update");

    // Check if already registered
    const existing = await ctx.db
      .query("emailForwarders")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      throw new Error("This email is already registered as a forwarder");
    }

    const id = await ctx.db.insert("emailForwarders", {
      organizationId,
      email: args.email.toLowerCase(),
      userId: args.userId,
      isActive: true,
      createdAt: Date.now(),
    });

    return { id };
  },
});

/**
 * Remove a registered email forwarder.
 */
export const removeEmailForwarder = mutation({
  args: {
    userId: v.id("users"),
    forwarderId: v.id("emailForwarders"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "users", "update");

    const forwarder = await ctx.db.get(args.forwarderId);
    if (!forwarder || forwarder.organizationId !== organizationId) {
      throw new Error("Forwarder not found");
    }

    await ctx.db.delete(args.forwarderId);
    return { success: true };
  },
});

/**
 * List registered email forwarders for the organization.
 */
export const getEmailForwarders = query({
  args: { userId: v.id("users"), organizationId: v.optional(v.id("organizations")) },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const forwarders = await ctx.db
      .query("emailForwarders")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Enrich with user names
    const enriched = await Promise.all(
      forwarders.map(async (f) => {
        const user = await ctx.db.get(f.userId);
        return {
          _id: f._id,
          email: f.email,
          userId: f.userId,
          userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
          isActive: f.isActive,
          createdAt: f.createdAt,
        };
      })
    );

    return enriched;
  },
});
