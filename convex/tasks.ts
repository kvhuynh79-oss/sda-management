import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireTenant } from "./authHelpers";

// Create a new task
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.string(),
    reminderDate: v.optional(v.string()),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    category: v.union(
      v.literal("funding"),
      v.literal("plan_approval"),
      v.literal("documentation"),
      v.literal("follow_up"),
      v.literal("general")
    ),
    linkedParticipantId: v.optional(v.id("participants")),
    linkedPropertyId: v.optional(v.id("properties")),
    linkedCommunicationId: v.optional(v.id("communications")),
    assignedToUserId: v.optional(v.id("users")),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.createdBy, "tasks", "create");
    const { organizationId } = await requireTenant(ctx, args.createdBy);

    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      ...args,
      organizationId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "task",
      entityId: taskId,
      entityName: args.title,
      metadata: JSON.stringify({
        category: args.category,
        priority: args.priority,
        dueDate: args.dueDate,
        linkedParticipantId: args.linkedParticipantId,
      }),
    });

    return taskId;
  },
});

// Update a task
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    reminderDate: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("urgent"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      )
    ),
    category: v.optional(
      v.union(
        v.literal("funding"),
        v.literal("plan_approval"),
        v.literal("documentation"),
        v.literal("follow_up"),
        v.literal("general")
      )
    ),
    linkedParticipantId: v.optional(v.id("participants")),
    linkedPropertyId: v.optional(v.id("properties")),
    linkedCommunicationId: v.optional(v.id("communications")),
    assignedToUserId: v.optional(v.id("users")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;
    const user = await requirePermission(ctx, userId, "tasks", "update");
    const { organizationId } = await requireTenant(ctx, userId);

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Task not found");
    }

    // Verify org ownership
    if (existing.organizationId !== organizationId) {
      throw new Error("Access denied: Task belongs to different organization");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "task",
      entityId: id,
      entityName: updates.title || existing.title,
      changes: JSON.stringify(updates),
    });

    return id;
  },
});

// Quick status update
export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "tasks", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    // Verify org ownership
    if (task.organizationId !== organizationId) {
      throw new Error("Access denied: Task belongs to different organization");
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    // If completing, set completion date
    if (args.status === "completed") {
      updates.completedDate = new Date().toISOString().split("T")[0];
      updates.completedBy = args.userId;
    }

    await ctx.db.patch(args.id, updates);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "task",
      entityId: args.id,
      entityName: task.title,
      changes: JSON.stringify({ status: args.status }),
    });

    return args.id;
  },
});

// Mark task as completed with notes
export const complete = mutation({
  args: {
    id: v.id("tasks"),
    completionNotes: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "tasks", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    // Verify org ownership
    if (task.organizationId !== organizationId) {
      throw new Error("Access denied: Task belongs to different organization");
    }

    await ctx.db.patch(args.id, {
      status: "completed",
      completedDate: new Date().toISOString().split("T")[0],
      completedBy: args.userId,
      completionNotes: args.completionNotes,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "task",
      entityId: args.id,
      entityName: task.title,
      changes: JSON.stringify({ status: "completed", completionNotes: args.completionNotes }),
    });

    return args.id;
  },
});

// Delete a task
export const remove = mutation({
  args: {
    id: v.id("tasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "tasks", "delete");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    // Verify org ownership
    if (task.organizationId !== organizationId) {
      throw new Error("Access denied: Task belongs to different organization");
    }

    await ctx.db.delete(args.id);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "delete",
      entityType: "task",
      entityId: args.id,
      entityName: task.title,
    });
  },
});

// Get all tasks with enriched data
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .collect();

    // Collect unique IDs for batch fetching
    const participantIds = [...new Set(tasks.map((t) => t.linkedParticipantId).filter(Boolean))];
    const propertyIds = [...new Set(tasks.map((t) => t.linkedPropertyId).filter(Boolean))];
    const communicationIds = [...new Set(tasks.map((t) => t.linkedCommunicationId).filter(Boolean))];
    const userIds = [...new Set([
      ...tasks.map((t) => t.createdBy),
      ...tasks.map((t) => t.assignedToUserId).filter(Boolean),
    ])];

    // Batch fetch related entities
    const [participants, properties, communications, users] = await Promise.all([
      Promise.all(participantIds.map((id) => ctx.db.get(id!))),
      Promise.all(propertyIds.map((id) => ctx.db.get(id!))),
      Promise.all(communicationIds.map((id) => ctx.db.get(id!))),
      Promise.all(userIds.map((id) => ctx.db.get(id!))),
    ]);

    // Create lookup maps
    const participantMap = new Map(participants.filter(Boolean).map((p) => [p!._id, p]));
    const propertyMap = new Map(properties.filter(Boolean).map((p) => [p!._id, p]));
    const communicationMap = new Map(communications.filter(Boolean).map((c) => [c!._id, c]));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u]));

    // Calculate if overdue
    const today = new Date().toISOString().split("T")[0];

    return tasks.map((task) => ({
      ...task,
      participant: task.linkedParticipantId ? participantMap.get(task.linkedParticipantId) : null,
      property: task.linkedPropertyId ? propertyMap.get(task.linkedPropertyId) : null,
      communication: task.linkedCommunicationId ? communicationMap.get(task.linkedCommunicationId) : null,
      createdByUser: userMap.get(task.createdBy),
      assignedToUser: task.assignedToUserId ? userMap.get(task.assignedToUserId) : null,
      isOverdue: task.status !== "completed" && task.status !== "cancelled" && task.dueDate < today,
    }));
  },
});

// Get task by ID
export const getById = query({
  args: { id: v.id("tasks"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const task = await ctx.db.get(args.id);
    if (!task) return null;

    // Verify org ownership
    if (task.organizationId !== organizationId) {
      throw new Error("Access denied: Task belongs to different organization");
    }

    const [participant, property, communication, createdByUser, assignedToUser, completedByUser] = await Promise.all([
      task.linkedParticipantId ? ctx.db.get(task.linkedParticipantId) : null,
      task.linkedPropertyId ? ctx.db.get(task.linkedPropertyId) : null,
      task.linkedCommunicationId ? ctx.db.get(task.linkedCommunicationId) : null,
      ctx.db.get(task.createdBy),
      task.assignedToUserId ? ctx.db.get(task.assignedToUserId) : null,
      task.completedBy ? ctx.db.get(task.completedBy) : null,
    ]);

    const today = new Date().toISOString().split("T")[0];

    return {
      ...task,
      participant,
      property,
      communication,
      createdByUser,
      assignedToUser,
      completedByUser,
      isOverdue: task.status !== "completed" && task.status !== "cancelled" && task.dueDate < today,
    };
  },
});

// Get tasks by participant
export const getByParticipant = query({
  args: { participantId: v.id("participants"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_participant", (q) => q.eq("linkedParticipantId", args.participantId))
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .order("desc")
      .collect();

    const today = new Date().toISOString().split("T")[0];

    return tasks.map((task) => ({
      ...task,
      isOverdue: task.status !== "completed" && task.status !== "cancelled" && task.dueDate < today,
    }));
  },
});

// Get tasks by communication
export const getByCommunication = query({
  args: { communicationId: v.id("communications"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_communication", (q) => q.eq("linkedCommunicationId", args.communicationId))
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .order("desc")
      .collect();

    return tasks;
  },
});

// Get tasks assigned to a user
export const getMyTasks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignedTo", (q) => q.eq("assignedToUserId", args.userId))
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .order("desc")
      .collect();

    // Batch fetch participants
    const participantIds = [...new Set(tasks.map((t) => t.linkedParticipantId).filter(Boolean))];
    const participants = await Promise.all(participantIds.map((id) => ctx.db.get(id!)));
    const participantMap = new Map(participants.filter(Boolean).map((p) => [p!._id, p]));

    const today = new Date().toISOString().split("T")[0];

    return tasks.map((task) => ({
      ...task,
      participant: task.linkedParticipantId ? participantMap.get(task.linkedParticipantId) : null,
      isOverdue: task.status !== "completed" && task.status !== "cancelled" && task.dueDate < today,
    }));
  },
});

// Get overdue tasks
export const getOverdue = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const today = new Date().toISOString().split("T")[0];

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .collect();

    const inProgressTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .collect();

    const allActiveTasks = [...tasks, ...inProgressTasks];
    const overdueTasks = allActiveTasks.filter((t) => t.dueDate < today);

    // Batch fetch participants
    const participantIds = [...new Set(overdueTasks.map((t) => t.linkedParticipantId).filter(Boolean))];
    const participants = await Promise.all(participantIds.map((id) => ctx.db.get(id!)));
    const participantMap = new Map(participants.filter(Boolean).map((p) => [p!._id, p]));

    return overdueTasks
      .map((task) => ({
        ...task,
        participant: task.linkedParticipantId ? participantMap.get(task.linkedParticipantId) : null,
        isOverdue: true,
      }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
});

// Get upcoming tasks (due within next X days)
export const getUpcoming = query({
  args: { userId: v.id("users"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const days = args.days || 7;
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const todayStr = today.toISOString().split("T")[0];
    const futureDateStr = futureDate.toISOString().split("T")[0];

    // Get pending and in_progress tasks
    const pendingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .collect();

    const inProgressTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .collect();

    const allActiveTasks = [...pendingTasks, ...inProgressTasks];
    const upcomingTasks = allActiveTasks.filter(
      (t) => t.dueDate >= todayStr && t.dueDate <= futureDateStr
    );

    // Batch fetch participants
    const participantIds = [...new Set(upcomingTasks.map((t) => t.linkedParticipantId).filter(Boolean))];
    const participants = await Promise.all(participantIds.map((id) => ctx.db.get(id!)));
    const participantMap = new Map(participants.filter(Boolean).map((p) => [p!._id, p]));

    return upcomingTasks
      .map((task) => ({
        ...task,
        participant: task.linkedParticipantId ? participantMap.get(task.linkedParticipantId) : null,
        isOverdue: task.dueDate < todayStr,
      }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
});

// Get task statistics
export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const openTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
    const overdueTasks = openTasks.filter((t) => t.dueDate < today);
    const completedThisWeek = tasks.filter(
      (t) => t.status === "completed" && t.completedDate && t.completedDate >= weekAgo
    );

    const stats = {
      total: tasks.length,
      open: openTasks.length,
      overdue: overdueTasks.length,
      completedThisWeek: completedThisWeek.length,
      byStatus: {
        pending: tasks.filter((t) => t.status === "pending").length,
        in_progress: tasks.filter((t) => t.status === "in_progress").length,
        completed: tasks.filter((t) => t.status === "completed").length,
        cancelled: tasks.filter((t) => t.status === "cancelled").length,
      },
      byPriority: {
        urgent: openTasks.filter((t) => t.priority === "urgent").length,
        high: openTasks.filter((t) => t.priority === "high").length,
        medium: openTasks.filter((t) => t.priority === "medium").length,
        low: openTasks.filter((t) => t.priority === "low").length,
      },
      byCategory: {
        funding: openTasks.filter((t) => t.category === "funding").length,
        plan_approval: openTasks.filter((t) => t.category === "plan_approval").length,
        documentation: openTasks.filter((t) => t.category === "documentation").length,
        follow_up: openTasks.filter((t) => t.category === "follow_up").length,
        general: openTasks.filter((t) => t.category === "general").length,
      },
    };

    return stats;
  },
});

// CONSULTATION GATE AUTO-TASK (Task 3.3)

/**
 * Internal mutation: Create follow-up task from Consultation Gate trigger
 * Called automatically when gate triggers - no permission check needed
 */
export const createFollowUpTask = internalMutation({
  args: {
    communicationId: v.id("communications"),
    organizationId: v.id("organizations"), // Inherit from communication
    userId: v.id("users"), // User who created the communication
    participantId: v.optional(v.id("participants")),
    propertyId: v.optional(v.id("properties")),
    subject: v.optional(v.string()),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("normal")),
    dueDateOffset: v.number(), // Milliseconds from now
    category: v.union(
      v.literal("funding"),
      v.literal("plan_approval"),
      v.literal("documentation"),
      v.literal("follow_up"),
      v.literal("general")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dueDate = new Date(now + args.dueDateOffset).toISOString().split("T")[0];

    // Create task title from communication subject
    const title = args.subject
      ? `Follow up: ${args.subject}`
      : "Follow up on communication";

    // Map priority: "normal" → "medium" (tasks don't have "normal")
    const taskPriority: "high" | "medium" | "low" = args.priority === "normal" ? "medium" : args.priority;

    // Create the task (inherit organizationId from communication)
    const taskId = await ctx.db.insert("tasks", {
      title,
      description: `Auto-generated from Consultation Gate. See communication ${args.communicationId}`,
      dueDate,
      priority: taskPriority,
      category: args.category,
      linkedParticipantId: args.participantId,
      linkedPropertyId: args.propertyId,
      linkedCommunicationId: args.communicationId,
      assignedToUserId: args.userId, // Assign to communication creator
      createdBy: args.userId,
      organizationId: args.organizationId, // Inherit from communication
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: "", // Will be filled by system
      userName: "Consultation Gate (Auto)",
      action: "create",
      entityType: "task",
      entityId: taskId,
      entityName: title,
      metadata: JSON.stringify({
        autoGenerated: true,
        triggeredBy: "consultation_gate",
        communicationId: args.communicationId,
        category: args.category,
        priority: args.priority,
        dueDate,
      }),
    });

    return taskId;
  },
});
