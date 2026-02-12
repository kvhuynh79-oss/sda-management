import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireTenant } from "./authHelpers";

export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    return await ctx.db
      .query("launchChecklist")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

export const toggleItem = mutation({
  args: {
    userId: v.id("users"),
    itemKey: v.string(),
    completed: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Find existing item
    const existing = await ctx.db
      .query("launchChecklist")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("itemKey"), args.itemKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        completed: args.completed,
        completedAt: args.completed ? Date.now() : undefined,
        completedBy: args.completed ? args.userId : undefined,
        notes: args.notes,
      });
    } else {
      await ctx.db.insert("launchChecklist", {
        organizationId,
        itemKey: args.itemKey,
        completed: args.completed,
        completedAt: args.completed ? Date.now() : undefined,
        completedBy: args.completed ? args.userId : undefined,
        notes: args.notes,
      });
    }
  },
});
