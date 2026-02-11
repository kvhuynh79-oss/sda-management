import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireTenant, requirePermission, getUserFullName } from "./authHelpers";

// Generate a signed upload URL for policy document files
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get all active policies with optional status/category filters
export const getAll = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allPolicies = await ctx.db
      .query("policies")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Filter to active records only
    let policies = allPolicies.filter((p) => p.isActive !== false);

    // Apply optional status filter
    if (args.status) {
      policies = policies.filter((p) => p.status === args.status);
    }

    // Apply optional category filter
    if (args.category) {
      policies = policies.filter((p) => p.category === args.category);
    }

    // Sort alphabetically by title
    policies.sort((a, b) => a.title.localeCompare(b.title));

    return policies;
  },
});

// Get a single policy by ID with resolved document URL
export const getById = query({
  args: {
    userId: v.id("users"),
    policyId: v.id("policies"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const policy = await ctx.db.get(args.policyId);
    if (!policy) return null;

    if (policy.organizationId !== organizationId) {
      throw new Error("Access denied: Policy belongs to different organization");
    }

    // Resolve document download URL from storage if a file is attached
    const documentUrl = policy.documentStorageId
      ? await ctx.storage.getUrl(policy.documentStorageId)
      : null;

    return { ...policy, documentUrl };
  },
});

// Create a new policy document
export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    documentStorageId: v.optional(v.id("_storage")),
    documentFileName: v.optional(v.string()),
    version: v.optional(v.string()),
    effectiveDate: v.optional(v.string()),
    reviewDueDate: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("under_review"),
      v.literal("archived")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "policies", "create");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const { userId, ...policyData } = args;
    const now = Date.now();

    const policyId = await ctx.db.insert("policies", {
      ...policyData,
      organizationId,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "policy",
      entityId: policyId,
      entityName: args.title,
    });

    return policyId;
  },
});

// Update an existing policy
export const update = mutation({
  args: {
    userId: v.id("users"),
    policyId: v.id("policies"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    documentStorageId: v.optional(v.id("_storage")),
    documentFileName: v.optional(v.string()),
    version: v.optional(v.string()),
    effectiveDate: v.optional(v.string()),
    reviewDueDate: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("under_review"),
        v.literal("archived")
      )
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "policies", "update");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const policy = await ctx.db.get(args.policyId);
    if (!policy) throw new Error("Policy not found");
    if (policy.organizationId !== organizationId) {
      throw new Error("Access denied: Policy belongs to different organization");
    }

    const { policyId, userId, ...updates } = args;

    // Build update object with only defined values
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(args.policyId, filteredUpdates);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "update",
      entityType: "policy",
      entityId: args.policyId,
      entityName: args.title ?? policy.title,
    });

    return { success: true };
  },
});

// Soft delete a policy (sets isActive to false)
export const remove = mutation({
  args: {
    userId: v.id("users"),
    policyId: v.id("policies"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "policies", "delete");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const policy = await ctx.db.get(args.policyId);
    if (!policy) throw new Error("Policy not found");
    if (policy.organizationId !== organizationId) {
      throw new Error("Access denied: Policy belongs to different organization");
    }

    // Soft delete
    await ctx.db.patch(args.policyId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "delete",
      entityType: "policy",
      entityId: args.policyId,
      entityName: policy.title,
    });
  },
});

// Get aggregate statistics for the policies dashboard
export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allPolicies = await ctx.db
      .query("policies")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Only count non-deleted records
    const policies = allPolicies.filter((p) => p.isActive !== false);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const active = policies.filter((p) => p.status === "active");
    const draft = policies.filter((p) => p.status === "draft");
    const underReview = policies.filter((p) => p.status === "under_review");
    const archived = policies.filter((p) => p.status === "archived");

    // Policies with review due date that has passed (exclude archived)
    const overdueReview = policies.filter((p) => {
      if (p.status === "archived") return false;
      if (!p.reviewDueDate) return false;
      return new Date(p.reviewDueDate) < now;
    });

    // Policies with review due date within the next 30 days (exclude archived and already overdue)
    const reviewingSoon = policies.filter((p) => {
      if (p.status === "archived") return false;
      if (!p.reviewDueDate) return false;
      const reviewDate = new Date(p.reviewDueDate);
      return reviewDate >= now && reviewDate <= thirtyDaysFromNow;
    });

    return {
      total: policies.length,
      active: active.length,
      draft: draft.length,
      underReview: underReview.length,
      archived: archived.length,
      overdueReview: overdueReview.length,
      reviewingSoon: reviewingSoon.length,
    };
  },
});

// Get unique policy categories for filter dropdowns
export const getCategories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allPolicies = await ctx.db
      .query("policies")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const policies = allPolicies.filter((p) => p.isActive !== false);

    // Extract unique categories and sort alphabetically
    const categories = [...new Set(policies.map((p) => p.category))].sort();

    return categories;
  },
});
