import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new preventative maintenance schedule
export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    dwellingId: v.optional(v.id("dwellings")),
    taskName: v.string(),
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
    frequencyType: v.union(
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("biannually"),
      v.literal("annually")
    ),
    frequencyInterval: v.number(),
    nextDueDate: v.string(),
    estimatedCost: v.optional(v.number()),
    contractorName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const scheduleId = await ctx.db.insert("preventativeSchedule", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return scheduleId;
  },
});

// Get all preventative schedules with property and dwelling details
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const schedules = await ctx.db.query("preventativeSchedule").collect();

    const schedulesWithDetails = await Promise.all(
      schedules.map(async (schedule) => {
        const property = await ctx.db.get(schedule.propertyId);
        const dwelling = schedule.dwellingId
          ? await ctx.db.get(schedule.dwellingId)
          : null;

        return {
          ...schedule,
          property,
          dwelling,
        };
      })
    );

    return schedulesWithDetails.sort((a, b) => {
      // Sort by next due date
      return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
    });
  },
});

// Get preventative schedules by property
export const getByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const schedules = await ctx.db
      .query("preventativeSchedule")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    const schedulesWithDetails = await Promise.all(
      schedules.map(async (schedule) => {
        const dwelling = schedule.dwellingId
          ? await ctx.db.get(schedule.dwellingId)
          : null;

        return {
          ...schedule,
          dwelling,
        };
      })
    );

    return schedulesWithDetails.sort((a, b) => {
      return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
    });
  },
});

// Get schedule by ID
export const getById = query({
  args: { scheduleId: v.id("preventativeSchedule") },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) return null;

    const property = await ctx.db.get(schedule.propertyId);
    const dwelling = schedule.dwellingId
      ? await ctx.db.get(schedule.dwellingId)
      : null;

    return {
      ...schedule,
      property,
      dwelling,
    };
  },
});

// Update preventative schedule
export const update = mutation({
  args: {
    scheduleId: v.id("preventativeSchedule"),
    taskName: v.optional(v.string()),
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
    frequencyType: v.optional(
      v.union(
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("quarterly"),
        v.literal("biannually"),
        v.literal("annually")
      )
    ),
    frequencyInterval: v.optional(v.number()),
    nextDueDate: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    contractorName: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { scheduleId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(scheduleId, filteredUpdates);
    return { success: true };
  },
});

// Delete preventative schedule
export const remove = mutation({
  args: { scheduleId: v.id("preventativeSchedule") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.scheduleId);
    return { success: true };
  },
});

// Mark schedule as completed and calculate next due date
export const complete = mutation({
  args: {
    scheduleId: v.id("preventativeSchedule"),
    completedDate: v.string(),
    actualCost: v.optional(v.number()),
    notes: v.optional(v.string()),
    createMaintenanceRecord: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) throw new Error("Schedule not found");

    // Calculate next due date based on frequency
    const completedDate = new Date(args.completedDate);
    let nextDueDate = new Date(completedDate);

    switch (schedule.frequencyType) {
      case "weekly":
        nextDueDate.setDate(completedDate.getDate() + (7 * schedule.frequencyInterval));
        break;
      case "monthly":
        nextDueDate.setMonth(completedDate.getMonth() + schedule.frequencyInterval);
        break;
      case "quarterly":
        nextDueDate.setMonth(completedDate.getMonth() + (3 * schedule.frequencyInterval));
        break;
      case "biannually":
        nextDueDate.setMonth(completedDate.getMonth() + (6 * schedule.frequencyInterval));
        break;
      case "annually":
        nextDueDate.setFullYear(completedDate.getFullYear() + schedule.frequencyInterval);
        break;
    }

    const nextDueDateStr = nextDueDate.toISOString().split("T")[0];

    // Update the schedule
    await ctx.db.patch(args.scheduleId, {
      lastCompletedDate: args.completedDate,
      nextDueDate: nextDueDateStr,
      updatedAt: Date.now(),
    });

    // Optionally create a maintenance record for this completion
    if (args.createMaintenanceRecord && schedule.dwellingId) {
      // Get the property to find a user to attribute the creation to
      const users = await ctx.db.query("users").collect();
      const adminUser = users.find((u) => u.role === "admin") || users[0];

      if (adminUser) {
        await ctx.db.insert("maintenanceRequests", {
          dwellingId: schedule.dwellingId,
          requestType: "preventative",
          category: schedule.category,
          priority: "medium",
          title: schedule.taskName,
          description: schedule.description || `Preventative maintenance: ${schedule.taskName}`,
          reportedBy: "System",
          reportedDate: args.completedDate,
          status: "completed",
          completedDate: args.completedDate,
          contractorName: schedule.contractorName,
          actualCost: args.actualCost,
          notes: args.notes,
          createdBy: adminUser._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true, nextDueDate: nextDueDateStr };
  },
});

// Get schedules due within a certain number of days (for alerts)
export const getDueSchedules = query({
  args: { daysAhead: v.number() },
  handler: async (ctx, args) => {
    const allSchedules = await ctx.db.query("preventativeSchedule").collect();
    const activeSchedules = allSchedules.filter((s) => s.isActive);

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + args.daysAhead);

    const dueSchedules = await Promise.all(
      activeSchedules
        .filter((schedule) => {
          const dueDate = new Date(schedule.nextDueDate);
          return dueDate <= futureDate && dueDate >= today;
        })
        .map(async (schedule) => {
          const property = await ctx.db.get(schedule.propertyId);
          const dwelling = schedule.dwellingId
            ? await ctx.db.get(schedule.dwellingId)
            : null;

          const daysUntilDue = Math.ceil(
            (new Date(schedule.nextDueDate).getTime() - today.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          return {
            ...schedule,
            property,
            dwelling,
            daysUntilDue,
          };
        })
    );

    return dueSchedules.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  },
});

// Get upcoming schedules (for dashboard/overview)
export const getUpcoming = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const allSchedules = await ctx.db.query("preventativeSchedule").collect();
    const activeSchedules = allSchedules.filter((s) => s.isActive);

    const today = new Date();
    const schedulesWithDetails = await Promise.all(
      activeSchedules.map(async (schedule) => {
        const property = await ctx.db.get(schedule.propertyId);
        const dwelling = schedule.dwellingId
          ? await ctx.db.get(schedule.dwellingId)
          : null;

        const daysUntilDue = Math.ceil(
          (new Date(schedule.nextDueDate).getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return {
          ...schedule,
          property,
          dwelling,
          daysUntilDue,
        };
      })
    );

    return schedulesWithDetails
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, limit);
  },
});

// Get overdue schedules
export const getOverdue = query({
  args: {},
  handler: async (ctx) => {
    const allSchedules = await ctx.db.query("preventativeSchedule").collect();
    const activeSchedules = allSchedules.filter((s) => s.isActive);

    const today = new Date();
    const overdueSchedules = await Promise.all(
      activeSchedules
        .filter((schedule) => {
          const dueDate = new Date(schedule.nextDueDate);
          return dueDate < today;
        })
        .map(async (schedule) => {
          const property = await ctx.db.get(schedule.propertyId);
          const dwelling = schedule.dwellingId
            ? await ctx.db.get(schedule.dwellingId)
            : null;

          const daysOverdue = Math.ceil(
            (today.getTime() - new Date(schedule.nextDueDate).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          return {
            ...schedule,
            property,
            dwelling,
            daysOverdue,
          };
        })
    );

    return overdueSchedules.sort((a, b) => b.daysOverdue - a.daysOverdue);
  },
});

// Get schedule statistics
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allSchedules = await ctx.db.query("preventativeSchedule").collect();
    const activeSchedules = allSchedules.filter((s) => s.isActive);

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const dueWithin30Days = activeSchedules.filter((schedule) => {
      const dueDate = new Date(schedule.nextDueDate);
      return dueDate <= thirtyDaysFromNow && dueDate >= today;
    });

    const overdue = activeSchedules.filter((schedule) => {
      const dueDate = new Date(schedule.nextDueDate);
      return dueDate < today;
    });

    return {
      total: allSchedules.length,
      active: activeSchedules.length,
      inactive: allSchedules.length - activeSchedules.length,
      overdue: overdue.length,
      dueWithin30Days: dueWithin30Days.length,
      byCategory: {
        plumbing: activeSchedules.filter((s) => s.category === "plumbing").length,
        electrical: activeSchedules.filter((s) => s.category === "electrical").length,
        appliances: activeSchedules.filter((s) => s.category === "appliances").length,
        building: activeSchedules.filter((s) => s.category === "building").length,
        grounds: activeSchedules.filter((s) => s.category === "grounds").length,
        safety: activeSchedules.filter((s) => s.category === "safety").length,
        general: activeSchedules.filter((s) => s.category === "general").length,
      },
      byFrequency: {
        weekly: activeSchedules.filter((s) => s.frequencyType === "weekly").length,
        monthly: activeSchedules.filter((s) => s.frequencyType === "monthly").length,
        quarterly: activeSchedules.filter((s) => s.frequencyType === "quarterly").length,
        biannually: activeSchedules.filter((s) => s.frequencyType === "biannually").length,
        annually: activeSchedules.filter((s) => s.frequencyType === "annually").length,
      },
    };
  },
});
