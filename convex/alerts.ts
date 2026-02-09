import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAuth, requireTenant } from "./authHelpers";
import { runAllAlertGenerators, createAlertIfNotExists, type CreateAlertArgs } from "./alertHelpers";

// Create a new alert
export const create = mutation({
  args: {
    userId: v.id("users"),
    alertType: v.union(
      v.literal("plan_expiry"),
      v.literal("low_funding"),
      v.literal("payment_missing"),
      v.literal("maintenance_due"),
      v.literal("document_expiry"),
      v.literal("vacancy"),
      v.literal("preventative_schedule_due"),
      v.literal("claim_due"),
      v.literal("payment_variance")
    ),
    severity: v.union(v.literal("critical"), v.literal("warning"), v.literal("info")),
    title: v.string(),
    message: v.string(),
    linkedParticipantId: v.optional(v.id("participants")),
    linkedPropertyId: v.optional(v.id("properties")),
    linkedDwellingId: v.optional(v.id("dwellings")),
    linkedMaintenanceId: v.optional(v.id("maintenanceRequests")),
    linkedPreventativeScheduleId: v.optional(v.id("preventativeSchedule")),
    linkedPlanId: v.optional(v.id("participantPlans")),
    triggerDate: v.string(),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { userId, ...alertData } = args;

    // Check if similar alert already exists (within organization)
    const existingAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_alertType", (q) => q.eq("alertType", args.alertType))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const orgAlerts = existingAlerts.filter(a => a.organizationId === organizationId);

    const duplicate = orgAlerts.find((alert) => {
      return (
        alert.linkedParticipantId === alertData.linkedParticipantId &&
        alert.linkedPropertyId === alertData.linkedPropertyId &&
        alert.linkedDwellingId === alertData.linkedDwellingId &&
        alert.linkedMaintenanceId === alertData.linkedMaintenanceId &&
        alert.linkedPlanId === alertData.linkedPlanId
      );
    });

    if (duplicate) {
      return duplicate._id; // Don't create duplicate alert
    }

    const now = Date.now();
    const alertId = await ctx.db.insert("alerts", {
      ...alertData,
      organizationId,
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

// Get all alerts (optimized batch fetch)
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    if (alerts.length === 0) return [];

    // Collect all unique IDs for batch fetching
    const participantIds = [...new Set(alerts.map((a) => a.linkedParticipantId).filter(Boolean))] as string[];
    const propertyIds = [...new Set(alerts.map((a) => a.linkedPropertyId).filter(Boolean))] as string[];
    const dwellingIds = [...new Set(alerts.map((a) => a.linkedDwellingId).filter(Boolean))] as string[];
    const maintenanceIds = [...new Set(alerts.map((a) => a.linkedMaintenanceId).filter(Boolean))] as string[];
    const preventativeIds = [...new Set(alerts.map((a) => a.linkedPreventativeScheduleId).filter(Boolean))] as string[];
    const planIds = [...new Set(alerts.map((a) => a.linkedPlanId).filter(Boolean))] as string[];

    // Parallel batch fetch all related records
    const [participants, properties, dwellings, maintenanceRequests, preventativeSchedules, plans] = await Promise.all([
      Promise.all(participantIds.map((id) => ctx.db.get(id as any))),
      Promise.all(propertyIds.map((id) => ctx.db.get(id as any))),
      Promise.all(dwellingIds.map((id) => ctx.db.get(id as any))),
      Promise.all(maintenanceIds.map((id) => ctx.db.get(id as any))),
      Promise.all(preventativeIds.map((id) => ctx.db.get(id as any))),
      Promise.all(planIds.map((id) => ctx.db.get(id as any))),
    ]);

    // Create lookup maps for O(1) access
    const participantMap = new Map(participants.filter(Boolean).map((p) => [p!._id, p]));
    const propertyMap = new Map(properties.filter(Boolean).map((p) => [p!._id, p]));
    const dwellingMap = new Map(dwellings.filter(Boolean).map((d) => [d!._id, d]));
    const maintenanceMap = new Map(maintenanceRequests.filter(Boolean).map((m) => [m!._id, m]));
    const preventativeMap = new Map(preventativeSchedules.filter(Boolean).map((p) => [p!._id, p]));
    const planMap = new Map(plans.filter(Boolean).map((p) => [p!._id, p]));

    // Enrich alerts using lookup maps
    const alertsWithDetails = alerts.map((alert) => ({
      ...alert,
      participant: alert.linkedParticipantId ? participantMap.get(alert.linkedParticipantId) || null : null,
      property: alert.linkedPropertyId ? propertyMap.get(alert.linkedPropertyId) || null : null,
      dwelling: alert.linkedDwellingId ? dwellingMap.get(alert.linkedDwellingId) || null : null,
      maintenance: alert.linkedMaintenanceId ? maintenanceMap.get(alert.linkedMaintenanceId) || null : null,
      preventativeSchedule: alert.linkedPreventativeScheduleId ? preventativeMap.get(alert.linkedPreventativeScheduleId) || null : null,
      plan: alert.linkedPlanId ? planMap.get(alert.linkedPlanId) || null : null,
    }));

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

// Get active alerts only (optimized batch fetch)
export const getActive = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const alerts = allAlerts.filter(a => a.organizationId === organizationId);

    if (alerts.length === 0) return [];

    // Collect all unique IDs for batch fetching
    const participantIds = [...new Set(alerts.map((a) => a.linkedParticipantId).filter(Boolean))] as string[];
    const propertyIds = [...new Set(alerts.map((a) => a.linkedPropertyId).filter(Boolean))] as string[];
    const dwellingIds = [...new Set(alerts.map((a) => a.linkedDwellingId).filter(Boolean))] as string[];
    const preventativeIds = [...new Set(alerts.map((a) => a.linkedPreventativeScheduleId).filter(Boolean))] as string[];

    // Parallel batch fetch
    const [participants, properties, dwellings, preventativeSchedules] = await Promise.all([
      Promise.all(participantIds.map((id) => ctx.db.get(id as any))),
      Promise.all(propertyIds.map((id) => ctx.db.get(id as any))),
      Promise.all(dwellingIds.map((id) => ctx.db.get(id as any))),
      Promise.all(preventativeIds.map((id) => ctx.db.get(id as any))),
    ]);

    // Create lookup maps
    const participantMap = new Map(participants.filter(Boolean).map((p) => [p!._id, p]));
    const propertyMap = new Map(properties.filter(Boolean).map((p) => [p!._id, p]));
    const dwellingMap = new Map(dwellings.filter(Boolean).map((d) => [d!._id, d]));
    const preventativeMap = new Map(preventativeSchedules.filter(Boolean).map((p) => [p!._id, p]));

    // Enrich alerts using lookup maps
    const alertsWithDetails = alerts.map((alert) => ({
      ...alert,
      participant: alert.linkedParticipantId ? participantMap.get(alert.linkedParticipantId) || null : null,
      property: alert.linkedPropertyId ? propertyMap.get(alert.linkedPropertyId) || null : null,
      dwelling: alert.linkedDwellingId ? dwellingMap.get(alert.linkedDwellingId) || null : null,
      preventativeSchedule: alert.linkedPreventativeScheduleId ? preventativeMap.get(alert.linkedPreventativeScheduleId) || null : null,
    }));

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
    userId: v.id("users"),
    severity: v.union(v.literal("critical"), v.literal("warning"), v.literal("info")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_severity", (q) => q.eq("severity", args.severity))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const alerts = allAlerts.filter(a => a.organizationId === organizationId);
    return alerts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get alerts by type (optimized batch fetch)
export const getByType = query({
  args: {
    userId: v.id("users"),
    alertType: v.union(
      v.literal("plan_expiry"),
      v.literal("low_funding"),
      v.literal("payment_missing"),
      v.literal("maintenance_due"),
      v.literal("document_expiry"),
      v.literal("vacancy"),
      v.literal("preventative_schedule_due"),
      v.literal("claim_due"),
      v.literal("payment_variance")
    ),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_alertType", (q) => q.eq("alertType", args.alertType))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const alerts = allAlerts.filter(a => a.organizationId === organizationId);

    if (alerts.length === 0) return [];

    // Collect unique IDs for batch fetching
    const participantIds = [...new Set(alerts.map((a) => a.linkedParticipantId).filter(Boolean))] as string[];
    const propertyIds = [...new Set(alerts.map((a) => a.linkedPropertyId).filter(Boolean))] as string[];

    // Parallel batch fetch
    const [participants, properties] = await Promise.all([
      Promise.all(participantIds.map((id) => ctx.db.get(id as any))),
      Promise.all(propertyIds.map((id) => ctx.db.get(id as any))),
    ]);

    // Create lookup maps
    const participantMap = new Map(participants.filter(Boolean).map((p) => [p!._id, p]));
    const propertyMap = new Map(properties.filter(Boolean).map((p) => [p!._id, p]));

    // Enrich alerts
    const alertsWithDetails = alerts.map((alert) => ({
      ...alert,
      participant: alert.linkedParticipantId ? participantMap.get(alert.linkedParticipantId) || null : null,
      property: alert.linkedPropertyId ? propertyMap.get(alert.linkedPropertyId) || null : null,
    }));

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
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify alert belongs to this organization
    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.organizationId !== organizationId) {
      throw new Error("Alert not found");
    }

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
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify alert belongs to this organization
    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.organizationId !== organizationId) {
      throw new Error("Alert not found");
    }

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
    userId: v.id("users"),
    alertId: v.id("alerts"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify alert belongs to this organization
    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.organizationId !== organizationId) {
      throw new Error("Alert not found");
    }

    await ctx.db.patch(args.alertId, {
      status: "dismissed",
    });
    return { success: true };
  },
});

// Delete alert
export const remove = mutation({
  args: {
    userId: v.id("users"),
    alertId: v.id("alerts"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify alert belongs to this organization
    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.organizationId !== organizationId) {
      throw new Error("Alert not found");
    }

    await ctx.db.delete(args.alertId);
    return { success: true };
  },
});

// Get alert statistics
export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
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
        claim_due: activeAlerts.filter((a) => a.alertType === "claim_due")
          .length,
      },
    };
  },
});

// Generate alerts based on current data (should be run periodically)
export const generateAlerts = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Require authenticated user for manual alert generation
    await requireTenant(ctx, args.userId);
    // Use the centralized alert generator from alertHelpers
    return await runAllAlertGenerators(ctx);
  },
});

// Internal mutation for cron job - runs the same logic as generateAlerts
export const generateAlertsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Use the centralized alert generator from alertHelpers
    return await runAllAlertGenerators(ctx);
  },
});

// Create owner payment reminders (called by cron on 2nd of month, 3 days before 5th)
export const createOwnerPaymentReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const periodMonth = `${year}-${String(month).padStart(2, "0")}`;
    const paymentDueDate = `${periodMonth}-05`; // Owner payments due on 5th

    let alertsCreated = 0;

    // Get expected owner disbursements for this month
    const expectedOwnerPayments = await ctx.db
      .query("expectedPayments")
      .withIndex("by_periodMonth", (q) => q.eq("periodMonth", periodMonth))
      .filter((q) =>
        q.and(
          q.eq(q.field("paymentType"), "owner_disbursement"),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    for (const payment of expectedOwnerPayments) {
      // Get owner and property details
      const owner = payment.ownerId ? await ctx.db.get(payment.ownerId) : null;
      const property = payment.propertyId ? await ctx.db.get(payment.propertyId) : null;

      if (!owner || !property) continue;

      const ownerName = owner.companyName || `${owner.firstName} ${owner.lastName}`;
      const propertyName = property.propertyName || property.addressLine1;

      // Create the alert using helper (handles duplicate checking)
      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "owner_payment_due",
        severity: "warning",
        title: `Owner Payment Due in 3 Days`,
        message: `Payment of $${payment.expectedAmount.toLocaleString("en-AU", { minimumFractionDigits: 2 })} due to ${ownerName} for ${propertyName}`,
        linkedPropertyId: property._id,
        triggerDate: todayStr,
        dueDate: paymentDueDate,
      });

      if (alertId) alertsCreated++;
    }

    return { success: true, alertsCreated };
  },
});

// Paginated version of getActive for large datasets
export const getActivePaginated = query({
  args: {
    userId: v.id("users"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const limit = args.limit || 25;

    const result = await ctx.db
      .query("alerts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .paginate({ numItems: limit, cursor: args.cursor ?? null });

    // Filter results to organization
    const filteredPage = result.page.filter(a => a.organizationId === organizationId);
    const filteredResult = {
      ...result,
      page: filteredPage,
    };

    if (filteredPage.length === 0) {
      return {
        page: [],
        isDone: filteredResult.isDone,
        continueCursor: filteredResult.continueCursor,
      };
    }

    // Batch fetch related data
    const participantIds = [...new Set(filteredPage.map((a) => a.linkedParticipantId).filter(Boolean))] as string[];
    const propertyIds = [...new Set(filteredPage.map((a) => a.linkedPropertyId).filter(Boolean))] as string[];
    const dwellingIds = [...new Set(filteredPage.map((a) => a.linkedDwellingId).filter(Boolean))] as string[];

    const [participants, properties, dwellings] = await Promise.all([
      Promise.all(participantIds.map((id) => ctx.db.get(id as any))),
      Promise.all(propertyIds.map((id) => ctx.db.get(id as any))),
      Promise.all(dwellingIds.map((id) => ctx.db.get(id as any))),
    ]);

    const participantMap = new Map(participants.filter(Boolean).map((p) => [p!._id, p]));
    const propertyMap = new Map(properties.filter(Boolean).map((p) => [p!._id, p]));
    const dwellingMap = new Map(dwellings.filter(Boolean).map((d) => [d!._id, d]));

    const alertsWithDetails = filteredPage.map((alert) => ({
      ...alert,
      participant: alert.linkedParticipantId ? participantMap.get(alert.linkedParticipantId) || null : null,
      property: alert.linkedPropertyId ? propertyMap.get(alert.linkedPropertyId) || null : null,
      dwelling: alert.linkedDwellingId ? dwellingMap.get(alert.linkedDwellingId) || null : null,
    }));

    // Sort by severity within the page
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const sortedAlerts = alertsWithDetails.sort((a, b) => {
      const severityDiff =
        severityOrder[a.severity as keyof typeof severityOrder] -
        severityOrder[b.severity as keyof typeof severityOrder];
      if (severityDiff !== 0) return severityDiff;
      return b.createdAt - a.createdAt;
    });

    return {
      page: sortedAlerts,
      isDone: filteredResult.isDone,
      continueCursor: filteredResult.continueCursor,
    };
  },
});

// Create payment variance alert (called by payments.create when variance > $500)
export const createVarianceAlert = internalMutation({
  args: {
    paymentId: v.id("payments"),
    participantId: v.id("participants"),
    expectedAmount: v.number(),
    actualAmount: v.number(),
    variance: v.number(),
    paymentDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get participant details
    const participant = await ctx.db.get(args.participantId);
    if (!participant) {
      console.error("Participant not found for variance alert");
      return null;
    }

    const participantName = `${participant.firstName} ${participant.lastName}`;
    const absVariance = Math.abs(args.variance);
    const variancePercent = ((absVariance / args.expectedAmount) * 100).toFixed(1);
    const varianceType = args.variance > 0 ? "overpayment" : "underpayment";

    // Determine severity based on variance amount
    let severity: "critical" | "warning" | "info";
    if (absVariance > 2000) {
      severity = "critical";
    } else if (absVariance > 1000) {
      severity = "warning";
    } else {
      severity = "warning"; // Default for >$500
    }

    const title = `Payment Variance: ${participantName}`;
    const message = `${varianceType.charAt(0).toUpperCase() + varianceType.slice(1)} of $${absVariance.toLocaleString("en-AU", {
      minimumFractionDigits: 2
    })} (${variancePercent}%) detected. Expected: $${args.expectedAmount.toLocaleString("en-AU", {
      minimumFractionDigits: 2
    })}, Actual: $${args.actualAmount.toLocaleString("en-AU", {
      minimumFractionDigits: 2
    })}`;

    // Create the alert using helper (handles duplicate checking)
    const alertId = await createAlertIfNotExists(ctx, {
      alertType: "payment_variance",
      severity,
      title,
      message,
      linkedParticipantId: args.participantId,
      triggerDate: args.paymentDate,
      dueDate: args.paymentDate, // Set due date to payment date for sorting
    });

    return alertId;
  },
});