import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission, requireAuth } from "./authHelpers";

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

    return organization;
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
