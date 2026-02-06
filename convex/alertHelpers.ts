import { MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

// Alert types
export type AlertType =
  | "plan_expiry"
  | "low_funding"
  | "payment_missing"
  | "maintenance_due"
  | "document_expiry"
  | "vacancy"
  | "preventative_schedule_due"
  | "claim_due"
  | "owner_payment_due"
  | "payment_overdue"
  | "payment_variance"
  | "ndis_notification_overdue"
  | "vacancy_notification_overdue"
  | "certification_expiry"
  | "insurance_expiry";

export type AlertSeverity = "critical" | "warning" | "info";

// Alert creation arguments
export interface CreateAlertArgs {
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  linkedParticipantId?: Id<"participants">;
  linkedPropertyId?: Id<"properties">;
  linkedDwellingId?: Id<"dwellings">;
  linkedMaintenanceId?: Id<"maintenanceRequests">;
  linkedPreventativeScheduleId?: Id<"preventativeSchedule">;
  linkedPlanId?: Id<"participantPlans">;
  linkedOwnerId?: Id<"owners">;
  triggerDate: string;
  dueDate?: string;
}

// Date utility functions
export function getDateStrings() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);

  return {
    today,
    todayStr,
    thirtyDaysFromNow,
    sevenDaysFromNow,
    thirtyDaysStr: thirtyDaysFromNow.toISOString().split("T")[0],
    sevenDaysStr: sevenDaysFromNow.toISOString().split("T")[0],
  };
}

export function daysUntil(date: Date, from: Date = new Date()): number {
  return Math.ceil((date.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function getSeverityFromDays(daysUntil: number, criticalThreshold: number = 7): AlertSeverity {
  if (daysUntil <= criticalThreshold) return "critical";
  return "warning";
}

// Check if alert already exists to avoid duplicates
export async function alertExists(
  ctx: MutationCtx,
  alertType: AlertType,
  linkedIds: {
    participantId?: Id<"participants">;
    propertyId?: Id<"properties">;
    dwellingId?: Id<"dwellings">;
    maintenanceId?: Id<"maintenanceRequests">;
    scheduleId?: Id<"preventativeSchedule">;
    planId?: Id<"participantPlans">;
    ownerId?: Id<"owners">;
  }
): Promise<boolean> {
  const existingAlerts = await ctx.db
    .query("alerts")
    .withIndex("by_status_alertType", (q) => q.eq("status", "active").eq("alertType", alertType))
    .collect();

  return existingAlerts.some((alert) => {
    return (
      alert.linkedParticipantId === linkedIds.participantId &&
      alert.linkedPropertyId === linkedIds.propertyId &&
      alert.linkedDwellingId === linkedIds.dwellingId &&
      alert.linkedMaintenanceId === linkedIds.maintenanceId &&
      alert.linkedPreventativeScheduleId === linkedIds.scheduleId &&
      alert.linkedPlanId === linkedIds.planId &&
      alert.linkedOwnerId === linkedIds.ownerId
    );
  });
}

// Create alert if it doesn't exist
export async function createAlertIfNotExists(
  ctx: MutationCtx,
  args: CreateAlertArgs
): Promise<Id<"alerts"> | null> {
  const exists = await alertExists(ctx, args.alertType, {
    participantId: args.linkedParticipantId,
    propertyId: args.linkedPropertyId,
    dwellingId: args.linkedDwellingId,
    maintenanceId: args.linkedMaintenanceId,
    scheduleId: args.linkedPreventativeScheduleId,
    planId: args.linkedPlanId,
    ownerId: args.linkedOwnerId,
  });

  if (exists) {
    return null;
  }

  const alertId = await ctx.db.insert("alerts", {
    ...args,
    status: "active",
    createdAt: Date.now(),
  });

  return alertId;
}

// Alert generation helpers for specific types

export async function generatePlanExpiryAlerts(
  ctx: MutationCtx,
  todayStr: string
): Promise<number> {
  const { today, thirtyDaysFromNow } = getDateStrings();
  let alertsCreated = 0;

  const plans = await ctx.db
    .query("participantPlans")
    .withIndex("by_status", (q) => q.eq("planStatus", "current"))
    .collect();

  for (const plan of plans) {
    const endDate = new Date(plan.planEndDate);
    if (endDate <= thirtyDaysFromNow && endDate >= today) {
      const participant = await ctx.db.get(plan.participantId);
      const days = daysUntil(endDate, today);

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "plan_expiry",
        severity: getSeverityFromDays(days),
        title: "NDIS Plan Expiring Soon",
        message: `NDIS plan for ${participant?.firstName} ${participant?.lastName} expires in ${days} days on ${plan.planEndDate}`,
        linkedParticipantId: plan.participantId,
        linkedPlanId: plan._id,
        triggerDate: todayStr,
        dueDate: plan.planEndDate,
      });

      if (alertId) alertsCreated++;
    }
  }

  return alertsCreated;
}

export async function generateDocumentExpiryAlerts(
  ctx: MutationCtx,
  todayStr: string
): Promise<number> {
  const { today, thirtyDaysFromNow } = getDateStrings();
  let alertsCreated = 0;

  const documents = await ctx.db.query("documents").collect();

  for (const doc of documents) {
    if (!doc.expiryDate) continue;
    const expiryDate = new Date(doc.expiryDate);
    if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
      const days = daysUntil(expiryDate, today);

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "document_expiry",
        severity: getSeverityFromDays(days),
        title: "Document Expiring Soon",
        message: `${doc.fileName} expires in ${days} days on ${doc.expiryDate}`,
        linkedParticipantId: doc.linkedParticipantId,
        linkedPropertyId: doc.linkedPropertyId,
        triggerDate: todayStr,
        dueDate: doc.expiryDate,
      });

      if (alertId) alertsCreated++;
    }
  }

  return alertsCreated;
}

export async function generateVacancyAlerts(
  ctx: MutationCtx,
  todayStr: string
): Promise<number> {
  let alertsCreated = 0;

  const dwellings = await ctx.db.query("dwellings").collect();

  for (const dwelling of dwellings) {
    if (dwelling.occupancyStatus === "vacant" && dwelling.isActive) {
      const property = await ctx.db.get(dwelling.propertyId);

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "vacancy",
        severity: "info",
        title: "Vacant Dwelling",
        message: `${dwelling.dwellingName} at ${property?.addressLine1} is currently vacant (${dwelling.maxParticipants} capacity)`,
        linkedDwellingId: dwelling._id,
        linkedPropertyId: dwelling.propertyId,
        triggerDate: todayStr,
      });

      if (alertId) alertsCreated++;
    }
  }

  return alertsCreated;
}

export async function generateMaintenanceAlerts(
  ctx: MutationCtx,
  todayStr: string
): Promise<number> {
  let alertsCreated = 0;

  const requests = await ctx.db
    .query("maintenanceRequests")
    .withIndex("by_priority", (q) => q.eq("priority", "urgent"))
    .filter((q) => q.neq(q.field("status"), "completed"))
    .filter((q) => q.neq(q.field("status"), "cancelled"))
    .collect();

  for (const request of requests) {
    const dwelling = await ctx.db.get(request.dwellingId);
    const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

    const alertId = await createAlertIfNotExists(ctx, {
      alertType: "maintenance_due",
      severity: "critical",
      title: "Urgent Maintenance Required",
      message: `${request.title} at ${property?.addressLine1 || "Unknown"} requires urgent attention`,
      linkedMaintenanceId: request._id,
      linkedDwellingId: request.dwellingId,
      linkedPropertyId: dwelling?.propertyId,
      triggerDate: todayStr,
    });

    if (alertId) alertsCreated++;
  }

  return alertsCreated;
}

export async function generatePreventativeScheduleAlerts(
  ctx: MutationCtx,
  todayStr: string
): Promise<number> {
  const { today, sevenDaysFromNow } = getDateStrings();
  let alertsCreated = 0;

  const schedules = await ctx.db
    .query("preventativeSchedule")
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  for (const schedule of schedules) {
    const dueDate = new Date(schedule.nextDueDate);
    if (dueDate <= sevenDaysFromNow && dueDate >= today) {
      const property = await ctx.db.get(schedule.propertyId);
      const dwelling = schedule.dwellingId ? await ctx.db.get(schedule.dwellingId) : null;
      const days = daysUntil(dueDate, today);

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "preventative_schedule_due",
        severity: days <= 3 ? "critical" : "warning",
        title: "Preventative Maintenance Due",
        message: `${schedule.taskName} at ${property?.addressLine1}${dwelling ? ` (${dwelling.dwellingName})` : ""} is due in ${days} days`,
        linkedPreventativeScheduleId: schedule._id,
        linkedPropertyId: schedule.propertyId,
        linkedDwellingId: schedule.dwellingId,
        triggerDate: todayStr,
        dueDate: schedule.nextDueDate,
      });

      if (alertId) alertsCreated++;
    }
  }

  return alertsCreated;
}

// Run all alert generators
export async function runAllAlertGenerators(ctx: MutationCtx): Promise<{ success: boolean; alertsCreated: number }> {
  const { todayStr } = getDateStrings();
  let alertsCreated = 0;

  alertsCreated += await generatePlanExpiryAlerts(ctx, todayStr);
  alertsCreated += await generateDocumentExpiryAlerts(ctx, todayStr);
  alertsCreated += await generateVacancyAlerts(ctx, todayStr);
  alertsCreated += await generateMaintenanceAlerts(ctx, todayStr);
  alertsCreated += await generatePreventativeScheduleAlerts(ctx, todayStr);

  return { success: true, alertsCreated };
}
