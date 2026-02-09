import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuth, requireTenant } from "./authHelpers";

// Get all actions for an incident
export const getByIncident = query({
  args: {
    userId: v.id("users"),
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify incident belongs to this organization
    const incident = await ctx.db.get(args.incidentId);
    if (!incident || incident.organizationId !== organizationId) {
      return [];
    }

    const actions = await ctx.db
      .query("incidentActions")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    // Get linked maintenance requests for each action
    const actionsWithMR = await Promise.all(
      actions.map(async (action) => {
        let maintenanceRequest = null;
        if (action.maintenanceRequestId) {
          maintenanceRequest = await ctx.db.get(action.maintenanceRequestId);
        }
        return {
          ...action,
          maintenanceRequest,
        };
      })
    );

    return actionsWithMR;
  },
});

// Get a single action by ID
export const getById = query({
  args: {
    userId: v.id("users"),
    actionId: v.id("incidentActions"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const action = await ctx.db.get(args.actionId);
    if (!action) return null;
    // Verify org ownership
    if (action.organizationId !== organizationId) return null;

    // Get incident
    const incident = await ctx.db.get(action.incidentId);

    // Get linked maintenance request if exists
    let maintenanceRequest = null;
    if (action.maintenanceRequestId) {
      maintenanceRequest = await ctx.db.get(action.maintenanceRequestId);
    }

    return {
      ...action,
      incident,
      maintenanceRequest,
    };
  },
});

// Create a new action
export const create = mutation({
  args: {
    userId: v.id("users"),
    incidentId: v.id("incidents"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("plumbing"),
      v.literal("electrical"),
      v.literal("appliances"),
      v.literal("building"),
      v.literal("grounds"),
      v.literal("safety"),
      v.literal("general")
    ),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    estimatedCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Permission check
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    // Verify incident belongs to this organization
    const incident = await ctx.db.get(args.incidentId);
    if (!incident || incident.organizationId !== organizationId) {
      throw new Error("Incident not found or does not belong to this organization");
    }

    const actionId = await ctx.db.insert("incidentActions", {
      organizationId,
      incidentId: args.incidentId,
      title: args.title,
      description: args.description,
      category: args.category,
      priority: args.priority,
      status: "pending",
      assignmentType: "pending",
      estimatedCost: args.estimatedCost,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return actionId;
  },
});

// Update an action
export const update = mutation({
  args: {
    userId: v.id("users"),
    actionId: v.id("incidentActions"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("plumbing"),
        v.literal("electrical"),
        v.literal("appliances"),
        v.literal("building"),
        v.literal("grounds"),
        v.literal("safety"),
        v.literal("general")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("urgent"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      )
    ),
    estimatedCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Permission check
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { actionId, userId, ...updates } = args;
    const action = await ctx.db.get(actionId);
    if (!action || action.organizationId !== organizationId) throw new Error("Action not found");

    // Only allow updates if status is pending
    if (action.status !== "pending") {
      throw new Error("Cannot update action that is already in progress or completed");
    }

    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(actionId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return actionId;
  },
});

// Mark action as in-house
export const markInHouse = mutation({
  args: {
    userId: v.id("users"),
    actionId: v.id("incidentActions"),
    assignedTo: v.string(),
    inHouseNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    const { organizationId } = await requireTenant(ctx, args.userId);
    const action = await ctx.db.get(args.actionId);
    if (!action || action.organizationId !== organizationId) throw new Error("Action not found");

    if (action.status !== "pending") {
      throw new Error("Action is not in pending status");
    }

    await ctx.db.patch(args.actionId, {
      status: "in_progress",
      assignmentType: "in_house",
      assignedTo: args.assignedTo,
      inHouseNotes: args.inHouseNotes,
      updatedAt: Date.now(),
    });

    return args.actionId;
  },
});

// Complete an action (for in-house actions)
export const complete = mutation({
  args: {
    userId: v.id("users"),
    actionId: v.id("incidentActions"),
    completionNotes: v.optional(v.string()),
    actualCost: v.optional(v.number()),
    completedDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    const { organizationId } = await requireTenant(ctx, args.userId);
    const action = await ctx.db.get(args.actionId);
    if (!action || action.organizationId !== organizationId) throw new Error("Action not found");

    if (action.status !== "in_progress") {
      throw new Error("Action is not in progress");
    }

    await ctx.db.patch(args.actionId, {
      status: "completed",
      completedBy: args.userId,
      completionNotes: args.completionNotes,
      actualCost: args.actualCost,
      completedDate: args.completedDate || new Date().toISOString().split("T")[0],
      updatedAt: Date.now(),
    });

    return args.actionId;
  },
});

// Cancel an action
export const cancel = mutation({
  args: {
    userId: v.id("users"),
    actionId: v.id("incidentActions"),
  },
  handler: async (ctx, args) => {
    // Permission check
    const { organizationId } = await requireTenant(ctx, args.userId);
    const action = await ctx.db.get(args.actionId);
    if (!action || action.organizationId !== organizationId) throw new Error("Action not found");

    if (action.status === "completed") {
      throw new Error("Cannot cancel a completed action");
    }

    await ctx.db.patch(args.actionId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return args.actionId;
  },
});

// Link an existing maintenance request to an action
export const linkMaintenanceRequest = mutation({
  args: {
    userId: v.id("users"),
    actionId: v.id("incidentActions"),
    maintenanceRequestId: v.id("maintenanceRequests"),
  },
  handler: async (ctx, args) => {
    // Permission check
    const { organizationId } = await requireTenant(ctx, args.userId);
    const action = await ctx.db.get(args.actionId);
    if (!action || action.organizationId !== organizationId) throw new Error("Action not found");

    const mr = await ctx.db.get(args.maintenanceRequestId);
    if (!mr || mr.organizationId !== organizationId) throw new Error("Maintenance request not found");

    await ctx.db.patch(args.actionId, {
      status: "in_progress",
      assignmentType: "contractor",
      maintenanceRequestId: args.maintenanceRequestId,
      updatedAt: Date.now(),
    });

    // Also update the maintenance request to link back to the action
    await ctx.db.patch(args.maintenanceRequestId, {
      incidentActionId: args.actionId,
      updatedAt: Date.now(),
    });

    return args.actionId;
  },
});

// Delete an action (only if pending or cancelled)
export const remove = mutation({
  args: {
    userId: v.id("users"),
    actionId: v.id("incidentActions"),
  },
  handler: async (ctx, args) => {
    // Permission check
    const { organizationId } = await requireTenant(ctx, args.userId);
    const action = await ctx.db.get(args.actionId);
    if (!action || action.organizationId !== organizationId) throw new Error("Action not found");

    if (action.status !== "pending" && action.status !== "cancelled") {
      throw new Error("Can only delete pending or cancelled actions");
    }

    await ctx.db.delete(args.actionId);

    return args.actionId;
  },
});

// Mark action as completed when its linked maintenance request is completed
export const completeFromMaintenanceRequest = mutation({
  args: {
    userId: v.id("users"),
    maintenanceRequestId: v.id("maintenanceRequests"),
  },
  handler: async (ctx, args) => {
    // Permission check
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify the maintenance request belongs to this organization
    const mrRecord = await ctx.db.get(args.maintenanceRequestId);
    if (!mrRecord || mrRecord.organizationId !== organizationId) {
      throw new Error("Maintenance request not found");
    }

    // Find the action linked to this maintenance request
    const actions = await ctx.db
      .query("incidentActions")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", args.maintenanceRequestId)
      )
      .collect();

    if (actions.length === 0) return null;

    const action = actions[0];

    // Get the maintenance request to check actual cost
    const mr = await ctx.db.get(args.maintenanceRequestId);

    await ctx.db.patch(action._id, {
      status: "completed",
      completedBy: args.userId,
      actualCost: mr?.quotedAmount,
      completedDate: new Date().toISOString().split("T")[0],
      updatedAt: Date.now(),
    });

    return action._id;
  },
});
