import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Create a new alert
export const create = mutation({
  args: {
    alertType: v.union(
      v.literal("plan_expiry"),
      v.literal("low_funding"),
      v.literal("payment_missing"),
      v.literal("maintenance_due"),
      v.literal("document_expiry"),
      v.literal("vacancy"),
      v.literal("preventative_schedule_due")
    ),
    severity: v.union(v.literal("critical"), v.literal("warning"), v.literal("info")),
    title: v.string(),
    message: v.string(),
    linkedParticipantId: v.optional(v.id("participants")),
    linkedPropertyId: v.optional(v.id("properties")),
    linkedDwellingId: v.optional(v.id("dwellings")),
    linkedMaintenanceId: v.optional(v.id("maintenanceRequests")),
    linkedPreventativeScheduleId: v.optional(v.id("preventativeSchedule")),
    triggerDate: v.string(),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if similar alert already exists
    const existingAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_alertType", (q) => q.eq("alertType", args.alertType))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const duplicate = existingAlerts.find((alert) => {
      return (
        alert.linkedParticipantId === args.linkedParticipantId &&
        alert.linkedPropertyId === args.linkedPropertyId &&
        alert.linkedDwellingId === args.linkedDwellingId &&
        alert.linkedMaintenanceId === args.linkedMaintenanceId
      );
    });

    if (duplicate) {
      return duplicate._id; // Don't create duplicate alert
    }

    const now = Date.now();
    const alertId = await ctx.db.insert("alerts", {
      ...args,
      status: "active",
      createdAt: now,
    });

    // Trigger notifications for all users (will check preferences inside actions)
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      // Schedule email notification
      await ctx.scheduler.runAfter(0, internal.notifications.sendEmailNotification, {
        userId: user._id,
        alertId: alertId,
      });

      // Schedule SMS notification
      await ctx.scheduler.runAfter(0, internal.notifications.sendSMSNotification, {
        userId: user._id,
        alertId: alertId,
      });
    }

    return alertId;
  },
});

// Get all alerts
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const alerts = await ctx.db.query("alerts").collect();

    const alertsWithDetails = await Promise.all(
      alerts.map(async (alert) => {
        const participant = alert.linkedParticipantId
          ? await ctx.db.get(alert.linkedParticipantId)
          : null;
        const property = alert.linkedPropertyId
          ? await ctx.db.get(alert.linkedPropertyId)
          : null;
        const dwelling = alert.linkedDwellingId
          ? await ctx.db.get(alert.linkedDwellingId)
          : null;
        const maintenance = alert.linkedMaintenanceId
          ? await ctx.db.get(alert.linkedMaintenanceId)
          : null;
        const preventativeSchedule = alert.linkedPreventativeScheduleId
          ? await ctx.db.get(alert.linkedPreventativeScheduleId)
          : null;

        return {
          ...alert,
          participant,
          property,
          dwelling,
          maintenance,
          preventativeSchedule,
        };
      })
    );

    return alertsWithDetails.sort((a, b) => {
      // Sort by severity first
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityDiff =
        severityOrder[a.severity as keyof typeof severityOrder] -
        severityOrder[b.severity as keyof typeof severityOrder];
      if (severityDiff !== 0) return severityDiff;

      // Then by creation date
      return b.createdAt - a.createdAt;
    });
  },
});

// Get active alerts only
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const alertsWithDetails = await Promise.all(
      alerts.map(async (alert) => {
        const participant = alert.linkedParticipantId
          ? await ctx.db.get(alert.linkedParticipantId)
          : null;
        const property = alert.linkedPropertyId
          ? await ctx.db.get(alert.linkedPropertyId)
          : null;
        const dwelling = alert.linkedDwellingId
          ? await ctx.db.get(alert.linkedDwellingId)
          : null;
        const preventativeSchedule = alert.linkedPreventativeScheduleId
          ? await ctx.db.get(alert.linkedPreventativeScheduleId)
          : null;

        return {
          ...alert,
          participant,
          property,
          dwelling,
          preventativeSchedule,
        };
      })
    );

    return alertsWithDetails.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityDiff =
        severityOrder[a.severity as keyof typeof severityOrder] -
        severityOrder[b.severity as keyof typeof severityOrder];
      if (severityDiff !== 0) return severityDiff;
      return b.createdAt - a.createdAt;
    });
  },
});

// Get alerts by severity
export const getBySeverity = query({
  args: {
    severity: v.union(v.literal("critical"), v.literal("warning"), v.literal("info")),
  },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_severity", (q) => q.eq("severity", args.severity))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return alerts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get alerts by type
export const getByType = query({
  args: {
    alertType: v.union(
      v.literal("plan_expiry"),
      v.literal("low_funding"),
      v.literal("payment_missing"),
      v.literal("maintenance_due"),
      v.literal("document_expiry"),
      v.literal("vacancy"),
      v.literal("preventative_schedule_due")
    ),
  },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_alertType", (q) => q.eq("alertType", args.alertType))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const alertsWithDetails = await Promise.all(
      alerts.map(async (alert) => {
        const participant = alert.linkedParticipantId
          ? await ctx.db.get(alert.linkedParticipantId)
          : null;
        const property = alert.linkedPropertyId
          ? await ctx.db.get(alert.linkedPropertyId)
          : null;

        return {
          ...alert,
          participant,
          property,
        };
      })
    );

    return alertsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Acknowledge an alert
export const acknowledge = mutation({
  args: {
    alertId: v.id("alerts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      status: "acknowledged",
      acknowledgedBy: args.userId,
      acknowledgedAt: Date.now(),
    });
    return { success: true };
  },
});

// Resolve an alert
export const resolve = mutation({
  args: {
    alertId: v.id("alerts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      status: "resolved",
      resolvedBy: args.userId,
      resolvedAt: Date.now(),
    });
    return { success: true };
  },
});

// Dismiss an alert
export const dismiss = mutation({
  args: {
    alertId: v.id("alerts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      status: "dismissed",
    });
    return { success: true };
  },
});

// Delete alert
export const remove = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.alertId);
    return { success: true };
  },
});

// Get alert statistics
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allAlerts = await ctx.db.query("alerts").collect();
    const activeAlerts = allAlerts.filter((a) => a.status === "active");

    return {
      total: allAlerts.length,
      active: activeAlerts.length,
      critical: activeAlerts.filter((a) => a.severity === "critical").length,
      warning: activeAlerts.filter((a) => a.severity === "warning").length,
      info: activeAlerts.filter((a) => a.severity === "info").length,
      byType: {
        plan_expiry: activeAlerts.filter((a) => a.alertType === "plan_expiry")
          .length,
        low_funding: activeAlerts.filter((a) => a.alertType === "low_funding")
          .length,
        payment_missing: activeAlerts.filter(
          (a) => a.alertType === "payment_missing"
        ).length,
        maintenance_due: activeAlerts.filter(
          (a) => a.alertType === "maintenance_due"
        ).length,
        document_expiry: activeAlerts.filter(
          (a) => a.alertType === "document_expiry"
        ).length,
        vacancy: activeAlerts.filter((a) => a.alertType === "vacancy").length,
        preventative_schedule_due: activeAlerts.filter(
          (a) => a.alertType === "preventative_schedule_due"
        ).length,
      },
    };
  },
});

// Helper function to create alert (internal use)
async function createAlertInternal(
  ctx: any,
  args: {
    alertType:
      | "plan_expiry"
      | "low_funding"
      | "payment_missing"
      | "maintenance_due"
      | "document_expiry"
      | "vacancy"
      | "preventative_schedule_due";
    severity: "critical" | "warning" | "info";
    title: string;
    message: string;
    linkedParticipantId?: any;
    linkedPropertyId?: any;
    linkedDwellingId?: any;
    linkedMaintenanceId?: any;
    linkedPreventativeScheduleId?: any;
    triggerDate: string;
    dueDate?: string;
  }
) {
  // Check if similar alert already exists
  const existingAlerts = await ctx.db
    .query("alerts")
    .withIndex("by_alertType", (q: any) => q.eq("alertType", args.alertType))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect();

  const duplicate = existingAlerts.find((alert: any) => {
    return (
      alert.linkedParticipantId === args.linkedParticipantId &&
      alert.linkedPropertyId === args.linkedPropertyId &&
      alert.linkedDwellingId === args.linkedDwellingId &&
      alert.linkedMaintenanceId === args.linkedMaintenanceId &&
      alert.linkedPreventativeScheduleId === args.linkedPreventativeScheduleId
    );
  });

  if (duplicate) {
    return null; // Don't create duplicate alert
  }

  const now = Date.now();
  const alertId = await ctx.db.insert("alerts", {
    ...args,
    status: "active",
    createdAt: now,
  });

  return alertId;
}

// Generate alerts based on current data (should be run periodically)
export const generateAlerts = mutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    let alertsCreated = 0;

    // 1. Check for expiring plans
    const plans = await ctx.db
      .query("participantPlans")
      .withIndex("by_status", (q) => q.eq("planStatus", "current"))
      .collect();

    for (const plan of plans) {
      const endDate = new Date(plan.planEndDate);
      if (endDate <= thirtyDaysFromNow && endDate >= today) {
        const participant = await ctx.db.get(plan.participantId);
        const daysUntil = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const alertId = await createAlertInternal(ctx, {
          alertType: "plan_expiry",
          severity: daysUntil <= 7 ? "critical" : "warning",
          title: `NDIS Plan Expiring Soon`,
          message: `NDIS plan for ${participant?.firstName} ${participant?.lastName} expires in ${daysUntil} days on ${plan.planEndDate}`,
          linkedParticipantId: plan.participantId,
          triggerDate: todayStr,
          dueDate: plan.planEndDate,
        });

        if (alertId) alertsCreated++;
      }
    }

    // 2. Check for expiring documents
    const documents = await ctx.db.query("documents").collect();
    const documentsWithExpiry = documents.filter((doc) => doc.expiryDate);

    for (const doc of documentsWithExpiry) {
      if (!doc.expiryDate) continue;
      const expiryDate = new Date(doc.expiryDate);
      if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
        const daysUntil = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const alertId = await createAlertInternal(ctx, {
          alertType: "document_expiry",
          severity: daysUntil <= 7 ? "critical" : "warning",
          title: `Document Expiring Soon`,
          message: `${doc.fileName} expires in ${daysUntil} days on ${doc.expiryDate}`,
          linkedParticipantId: doc.linkedParticipantId,
          linkedPropertyId: doc.linkedPropertyId,
          triggerDate: todayStr,
          dueDate: doc.expiryDate,
        });

        if (alertId) alertsCreated++;
      }
    }

    // 3. Check for vacant dwellings
    const dwellings = await ctx.db.query("dwellings").collect();
    for (const dwelling of dwellings) {
      if (dwelling.occupancyStatus === "vacant" && dwelling.isActive) {
        const property = await ctx.db.get(dwelling.propertyId);
        const alertId = await createAlertInternal(ctx, {
          alertType: "vacancy",
          severity: "info",
          title: `Vacant Dwelling`,
          message: `${dwelling.dwellingName} at ${property?.addressLine1} is currently vacant (${dwelling.maxParticipants} capacity)`,
          linkedDwellingId: dwelling._id,
          linkedPropertyId: dwelling.propertyId,
          triggerDate: todayStr,
        });

        if (alertId) alertsCreated++;
      }
    }

    // 4. Check for urgent maintenance
    const maintenanceRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_priority", (q) => q.eq("priority", "urgent"))
      .filter((q) => q.neq(q.field("status"), "completed"))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    for (const request of maintenanceRequests) {
      const dwelling = await ctx.db.get(request.dwellingId);
      const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

      const alertId = await createAlertInternal(ctx, {
        alertType: "maintenance_due",
        severity: "critical",
        title: `Urgent Maintenance Required`,
        message: `${request.title} at ${property?.addressLine1} - ${dwelling?.dwellingName}`,
        linkedMaintenanceId: request._id,
        linkedDwellingId: request.dwellingId,
        linkedPropertyId: property?._id,
        triggerDate: todayStr,
      });

      if (alertId) alertsCreated++;
    }

    // 5. Check for overdue/due-soon preventative schedules
    const preventativeSchedules = await ctx.db
      .query("preventativeSchedule")
      .collect();
    const activeSchedules = preventativeSchedules.filter((s) => s.isActive);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    for (const schedule of activeSchedules) {
      const dueDate = new Date(schedule.nextDueDate);

      // Calculate days difference (positive = future, negative = overdue)
      const daysUntil = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const isOverdue = daysUntil < 0;
      const isDueSoon = daysUntil >= 0 && daysUntil <= 7;

      // Create alerts for overdue schedules or schedules due within 7 days
      if (isOverdue || isDueSoon) {
        const property = await ctx.db.get(schedule.propertyId);
        const dwelling = schedule.dwellingId
          ? await ctx.db.get(schedule.dwellingId)
          : null;

        const location = dwelling
          ? `${dwelling.dwellingName} at ${property?.addressLine1}`
          : property?.addressLine1;

        let severity: "critical" | "warning" | "info";
        if (isOverdue) {
          severity = "critical";
        } else if (daysUntil <= 3) {
          severity = "warning";
        } else {
          severity = "info";
        }

        const alertId = await createAlertInternal(ctx, {
          alertType: "preventative_schedule_due",
          severity,
          title: isOverdue
            ? `Overdue Preventative Maintenance`
            : `Preventative Maintenance Due Soon`,
          message: `${schedule.taskName} at ${location} is ${
            isOverdue
              ? `overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""}`
              : `due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`
          }`,
          linkedPreventativeScheduleId: schedule._id,
          linkedPropertyId: schedule.propertyId,
          linkedDwellingId: schedule.dwellingId,
          triggerDate: todayStr,
          dueDate: schedule.nextDueDate,
        });

        if (alertId) alertsCreated++;
      }
    }

    return { success: true, alertsCreated };
  },
});

// Internal mutation for cron job - runs the same logic as generateAlerts
export const generateAlertsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    let alertsCreated = 0;

    // 1. Check for expiring plans
    const plans = await ctx.db
      .query("participantPlans")
      .withIndex("by_status", (q) => q.eq("planStatus", "current"))
      .collect();

    for (const plan of plans) {
      const endDate = new Date(plan.planEndDate);
      if (endDate <= thirtyDaysFromNow && endDate >= today) {
        const participant = await ctx.db.get(plan.participantId);
        const daysUntil = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const alertId = await createAlertInternal(ctx, {
          alertType: "plan_expiry",
          severity: daysUntil <= 7 ? "critical" : "warning",
          title: `NDIS Plan Expiring Soon`,
          message: `NDIS plan for ${participant?.firstName} ${participant?.lastName} expires in ${daysUntil} days on ${plan.planEndDate}`,
          linkedParticipantId: plan.participantId,
          triggerDate: todayStr,
          dueDate: plan.planEndDate,
        });

        if (alertId) alertsCreated++;
      }
    }

    // 2. Check for expiring documents
    const documents = await ctx.db.query("documents").collect();
    const documentsWithExpiry = documents.filter((doc) => doc.expiryDate);

    for (const doc of documentsWithExpiry) {
      if (!doc.expiryDate) continue;
      const expiryDate = new Date(doc.expiryDate);
      if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
        const daysUntil = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const alertId = await createAlertInternal(ctx, {
          alertType: "document_expiry",
          severity: daysUntil <= 7 ? "critical" : "warning",
          title: `Document Expiring Soon`,
          message: `${doc.fileName} expires in ${daysUntil} days on ${doc.expiryDate}`,
          linkedParticipantId: doc.linkedParticipantId,
          linkedPropertyId: doc.linkedPropertyId,
          triggerDate: todayStr,
          dueDate: doc.expiryDate,
        });

        if (alertId) alertsCreated++;
      }
    }

    // 3. Check for vacant dwellings
    const dwellings = await ctx.db.query("dwellings").collect();
    for (const dwelling of dwellings) {
      if (dwelling.occupancyStatus === "vacant" && dwelling.isActive) {
        const property = await ctx.db.get(dwelling.propertyId);
        const alertId = await createAlertInternal(ctx, {
          alertType: "vacancy",
          severity: "info",
          title: `Vacant Dwelling`,
          message: `${dwelling.dwellingName} at ${property?.addressLine1} is currently vacant (${dwelling.maxParticipants} capacity)`,
          linkedDwellingId: dwelling._id,
          linkedPropertyId: dwelling.propertyId,
          triggerDate: todayStr,
        });

        if (alertId) alertsCreated++;
      }
    }

    // 4. Check for urgent maintenance
    const maintenanceRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_priority", (q) => q.eq("priority", "urgent"))
      .filter((q) => q.neq(q.field("status"), "completed"))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    for (const request of maintenanceRequests) {
      const dwelling = await ctx.db.get(request.dwellingId);
      const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

      const alertId = await createAlertInternal(ctx, {
        alertType: "maintenance_due",
        severity: "critical",
        title: `Urgent Maintenance Required`,
        message: `${request.title} at ${property?.addressLine1} - ${dwelling?.dwellingName}`,
        linkedMaintenanceId: request._id,
        linkedDwellingId: request.dwellingId,
        linkedPropertyId: property?._id,
        triggerDate: todayStr,
      });

      if (alertId) alertsCreated++;
    }

    // 5. Check for overdue/due-soon preventative schedules
    const preventativeSchedules = await ctx.db
      .query("preventativeSchedule")
      .collect();
    const activeSchedules = preventativeSchedules.filter((s) => s.isActive);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    for (const schedule of activeSchedules) {
      const dueDate = new Date(schedule.nextDueDate);

      // Calculate days difference (positive = future, negative = overdue)
      const daysUntil = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const isOverdue = daysUntil < 0;
      const isDueSoon = daysUntil >= 0 && daysUntil <= 7;

      // Create alerts for overdue schedules or schedules due within 7 days
      if (isOverdue || isDueSoon) {
        const property = await ctx.db.get(schedule.propertyId);
        const dwelling = schedule.dwellingId
          ? await ctx.db.get(schedule.dwellingId)
          : null;

        const location = dwelling
          ? `${dwelling.dwellingName} at ${property?.addressLine1}`
          : property?.addressLine1;

        let severity: "critical" | "warning" | "info";
        if (isOverdue) {
          severity = "critical";
        } else if (daysUntil <= 3) {
          severity = "warning";
        } else {
          severity = "info";
        }

        const alertId = await createAlertInternal(ctx, {
          alertType: "preventative_schedule_due",
          severity,
          title: isOverdue
            ? `Overdue Preventative Maintenance`
            : `Preventative Maintenance Due Soon`,
          message: `${schedule.taskName} at ${location} is ${
            isOverdue
              ? `overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""}`
              : `due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`
          }`,
          linkedPreventativeScheduleId: schedule._id,
          linkedPropertyId: schedule.propertyId,
          linkedDwellingId: schedule.dwellingId,
          triggerDate: todayStr,
          dueDate: schedule.nextDueDate,
        });

        if (alertId) alertsCreated++;
      }
    }

    return { success: true, alertsCreated };
  },
});
