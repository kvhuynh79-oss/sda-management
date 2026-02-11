import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireTenant } from "./authHelpers";

// Get all emergency management plans with optional filters
export const getAll = query({
  args: {
    userId: v.id("users"),
    propertyId: v.optional(v.id("properties")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allPlans = await ctx.db
      .query("emergencyManagementPlans")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    let plans = allPlans;

    if (args.propertyId) {
      plans = plans.filter((p) => p.propertyId === args.propertyId);
    }
    if (args.status) {
      plans = plans.filter((p) => p.status === args.status);
    }

    // Enrich with property data
    const enriched = await Promise.all(
      plans.map(async (plan) => {
        const property = await ctx.db.get(plan.propertyId);
        const dwelling = plan.dwellingId ? await ctx.db.get(plan.dwellingId) : null;
        return { ...plan, property, dwelling };
      })
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Get emergency management plan by ID
export const getById = query({
  args: {
    userId: v.id("users"),
    id: v.id("emergencyManagementPlans"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const plan = await ctx.db.get(args.id);
    if (!plan) return null;
    if (plan.organizationId !== organizationId) {
      throw new Error("Access denied: Plan belongs to different organization");
    }

    const property = await ctx.db.get(plan.propertyId);
    const dwelling = plan.dwellingId ? await ctx.db.get(plan.dwellingId) : null;

    return { ...plan, property, dwelling };
  },
});

// Get all emergency management plans for a specific property
export const getByProperty = query({
  args: {
    userId: v.id("users"),
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allPlans = await ctx.db
      .query("emergencyManagementPlans")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    // Filter by organization for tenant isolation
    const plans = allPlans.filter((p) => p.organizationId === organizationId);

    // Enrich with property data
    const enriched = await Promise.all(
      plans.map(async (plan) => {
        const property = await ctx.db.get(plan.propertyId);
        const dwelling = plan.dwellingId ? await ctx.db.get(plan.dwellingId) : null;
        return { ...plan, property, dwelling };
      })
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Create a new emergency management plan
export const create = mutation({
  args: {
    userId: v.id("users"),
    propertyId: v.id("properties"),
    dwellingId: v.optional(v.id("dwellings")),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("under_review"), v.literal("archived"))),
    version: v.optional(v.string()),
    lastReviewDate: v.optional(v.string()),
    nextReviewDate: v.optional(v.string()),
    managementContacts: v.optional(v.array(v.object({
      name: v.string(),
      role: v.string(),
      phone: v.string(),
      email: v.optional(v.string()),
    }))),
    emergencyContacts: v.optional(v.array(v.object({
      service: v.string(),
      phone: v.string(),
      notes: v.optional(v.string()),
    }))),
    evacuationProcedure: v.optional(v.string()),
    assemblyPoint: v.optional(v.string()),
    emergencyKit: v.optional(v.array(v.object({
      item: v.string(),
      location: v.optional(v.string()),
      lastChecked: v.optional(v.string()),
    }))),
    emergencyTeam: v.optional(v.array(v.object({
      name: v.string(),
      role: v.string(),
      responsibilities: v.optional(v.string()),
      phone: v.string(),
    }))),
    procedures: v.optional(v.array(v.object({
      type: v.string(),
      steps: v.string(),
    }))),
    participantSpecificNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    const { userId, status, version, managementContacts, emergencyContacts, emergencyKit, emergencyTeam, procedures, ...rest } = args;

    return await ctx.db.insert("emergencyManagementPlans", {
      organizationId,
      ...rest,
      status: status ?? "draft",
      version: version ?? "1.0",
      managementContacts: managementContacts ?? [],
      emergencyContacts: emergencyContacts ?? [],
      emergencyKit: emergencyKit ?? [],
      emergencyTeam: emergencyTeam ?? [],
      procedures: procedures ?? [],
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing emergency management plan
export const update = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("emergencyManagementPlans"),
    propertyId: v.optional(v.id("properties")),
    dwellingId: v.optional(v.id("dwellings")),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("under_review"), v.literal("archived"))),
    version: v.optional(v.string()),
    lastReviewDate: v.optional(v.string()),
    nextReviewDate: v.optional(v.string()),
    managementContacts: v.optional(v.array(v.object({
      name: v.string(),
      role: v.string(),
      phone: v.string(),
      email: v.optional(v.string()),
    }))),
    emergencyContacts: v.optional(v.array(v.object({
      service: v.string(),
      phone: v.string(),
      notes: v.optional(v.string()),
    }))),
    evacuationProcedure: v.optional(v.string()),
    assemblyPoint: v.optional(v.string()),
    emergencyKit: v.optional(v.array(v.object({
      item: v.string(),
      location: v.optional(v.string()),
      lastChecked: v.optional(v.string()),
    }))),
    emergencyTeam: v.optional(v.array(v.object({
      name: v.string(),
      role: v.string(),
      responsibilities: v.optional(v.string()),
      phone: v.string(),
    }))),
    procedures: v.optional(v.array(v.object({
      type: v.string(),
      steps: v.string(),
    }))),
    participantSpecificNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { id, userId, ...updates } = args;

    const plan = await ctx.db.get(id);
    if (!plan) throw new Error("Emergency management plan not found");
    if (plan.organizationId !== organizationId) {
      throw new Error("Access denied: Plan belongs to different organization");
    }

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, filteredUpdates);
    return { success: true };
  },
});

// Update status of an emergency management plan
export const updateStatus = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("emergencyManagementPlans"),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("under_review"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const plan = await ctx.db.get(args.id);
    if (!plan) throw new Error("Emergency management plan not found");
    if (plan.organizationId !== organizationId) {
      throw new Error("Access denied: Plan belongs to different organization");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Delete an emergency management plan
export const remove = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("emergencyManagementPlans"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const plan = await ctx.db.get(args.id);
    if (!plan) throw new Error("Emergency management plan not found");
    if (plan.organizationId !== organizationId) {
      throw new Error("Access denied: Plan belongs to different organization");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Get statistics for emergency management plans
export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allPlans = await ctx.db
      .query("emergencyManagementPlans")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const today = new Date().toISOString().split("T")[0];

    const total = allPlans.length;
    const active = allPlans.filter((p) => p.status === "active").length;
    const draftCount = allPlans.filter((p) => p.status === "draft").length;
    const underReview = allPlans.filter((p) => p.status === "under_review").length;
    const overdueReview = allPlans.filter(
      (p) => p.nextReviewDate && p.nextReviewDate < today && p.status !== "archived"
    ).length;

    // Count properties without an active emergency management plan
    const allProperties = await ctx.db
      .query("properties")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const activeProperties = allProperties.filter((p) => p.isActive !== false);
    const propertiesWithActivePlan = new Set(
      allPlans.filter((p) => p.status === "active").map((p) => p.propertyId.toString())
    );
    const propertiesWithoutPlan = activeProperties.filter(
      (p) => !propertiesWithActivePlan.has(p._id.toString())
    ).length;

    return {
      total,
      active,
      draftCount,
      underReview,
      overdueReview,
      propertiesWithoutPlan,
    };
  },
});
