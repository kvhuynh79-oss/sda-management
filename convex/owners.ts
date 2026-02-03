import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, getUserFullName } from "./authHelpers";

// Create a new owner
export const create = mutation({
  args: {
    userId: v.id("users"),
    ownerType: v.union(
      v.literal("individual"),
      v.literal("company"),
      v.literal("trust"),
      v.literal("self")
    ),
    companyName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    state: v.optional(v.string()),
    abn: v.optional(v.string()),
    bankBsb: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check - requires property create permission (admin/property_manager)
    const user = await requirePermission(ctx, args.userId, "properties", "create");
    const { userId, ...ownerData } = args;
    const now = Date.now();
    const ownerId = await ctx.db.insert("owners", {
      ...ownerData,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "owner",
      entityId: ownerId,
      entityName: args.companyName || `${args.firstName} ${args.lastName}`,
    });

    return ownerId;
  },
});

// Get all owners
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const owners = await ctx.db
      .query("owners")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return owners;
  },
});

// Get owner by ID
export const getById = query({
  args: { ownerId: v.id("owners") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.ownerId);
  },
});

// Update owner
export const update = mutation({
  args: {
    userId: v.id("users"),
    ownerId: v.id("owners"),
    ownerType: v.optional(v.union(
      v.literal("individual"),
      v.literal("company"),
      v.literal("trust"),
      v.literal("self")
    )),
    companyName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    state: v.optional(v.string()),
    abn: v.optional(v.string()),
    bankBsb: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requirePermission(ctx, args.userId, "properties", "update");
    const { ownerId, userId, ...updates } = args;
    
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(ownerId, filteredUpdates);
    return { success: true };
  },
});

// Delete (soft delete) owner
export const remove = mutation({
  args: {
    userId: v.id("users"),
    ownerId: v.id("owners"),
  },
  handler: async (ctx, args) => {
    // Permission check - only admin can delete
    await requirePermission(ctx, args.userId, "properties", "delete");
    await ctx.db.patch(args.ownerId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
