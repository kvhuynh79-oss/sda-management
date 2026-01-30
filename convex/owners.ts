import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new owner
export const create = mutation({
  args: {
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
    const now = Date.now();
    const ownerId = await ctx.db.insert("owners", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
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
    const { ownerId, ...updates } = args;
    
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
  args: { ownerId: v.id("owners") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ownerId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
