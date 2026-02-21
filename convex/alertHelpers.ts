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
  | "insurance_expiry"
  | "complaint_acknowledgment_overdue"
  | "new_website_complaint"
  | "consent_expiry"
  | "consent_missing"
  | "profile_incomplete"
  | "specialist_schedule_due"
  | "specialist_schedule_overdue"
  | "inspection_upcoming"
  | "rp_authorisation_expiring"
  | "rp_review_overdue"
  | "rp_unauthorised"
  | "rp_ndis_report_overdue"
  | "training_expiring"
  | "training_expired"
  | "training_mandatory_missing";

export type AlertSeverity = "critical" | "warning" | "info";

// Alert creation arguments
export interface CreateAlertArgs {
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  organizationId?: Id<"organizations">;
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

  const { organizationId, ...alertArgs } = args;
  const alertId = await ctx.db.insert("alerts", {
    ...alertArgs,
    ...(organizationId ? { organizationId } : {}),
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
        organizationId: participant?.organizationId,
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
        organizationId: doc.organizationId,
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
        organizationId: dwelling.organizationId,
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
      organizationId: request.organizationId,
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
        organizationId: schedule.organizationId,
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

// Certification type labels for human-readable messages
const CERT_TYPE_ALERT_LABELS: Record<string, string> = {
  ndis_practice_standards: "NDIS Practice Standards",
  ndis_verification_audit: "NDIS Verification Audit",
  sda_design_standard: "SDA Design Standard",
  sda_registration: "SDA Registration",
  ndis_worker_screening: "Worker Screening",
  fire_safety: "Fire Safety",
  building_compliance: "Building Compliance",
  other: "Other",
};

export async function generateCertificationExpiryAlerts(
  ctx: MutationCtx,
  todayStr: string
): Promise<number> {
  const { today } = getDateStrings();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  let alertsCreated = 0;

  const certifications = await ctx.db.query("complianceCertifications").collect();

  // Get existing active certification_expiry alerts to check duplicates by title
  const existingCertAlerts = await ctx.db
    .query("alerts")
    .withIndex("by_status_alertType", (q) =>
      q.eq("status", "active").eq("alertType", "certification_expiry")
    )
    .collect();
  const existingTitles = new Set(existingCertAlerts.map((a) => a.title));

  for (const cert of certifications) {
    const expiryDate = new Date(cert.expiryDate);
    const certTypeLabel =
      CERT_TYPE_ALERT_LABELS[cert.certificationType] ||
      cert.certificationType.replace(/_/g, " ");

    // Expired certifications → critical alert
    if (cert.status === "expired") {
      const title = `Expired Certification: ${cert.certificationName}`;
      if (existingTitles.has(title)) continue;

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "certification_expiry",
        severity: "critical",
        title,
        message: `The ${certTypeLabel} certificate expired on ${cert.expiryDate}. Immediate renewal required.`,
        organizationId: cert.organizationId,
        linkedPropertyId: cert.propertyId,
        triggerDate: todayStr,
        dueDate: cert.expiryDate,
      });

      if (alertId) {
        alertsCreated++;
        existingTitles.add(title);
      }
    }

    // Expiring within 30 days → warning alert
    if (expiryDate > today && expiryDate <= thirtyDaysFromNow) {
      const days = daysUntil(expiryDate, today);
      const title = `Certification Expiring: ${cert.certificationName}`;
      if (existingTitles.has(title)) continue;

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "certification_expiry",
        severity: "warning",
        title,
        message: `The ${certTypeLabel} certificate expires on ${cert.expiryDate} (${days} day${days !== 1 ? "s" : ""} remaining).`,
        organizationId: cert.organizationId,
        linkedPropertyId: cert.propertyId,
        triggerDate: todayStr,
        dueDate: cert.expiryDate,
      });

      if (alertId) {
        alertsCreated++;
        existingTitles.add(title);
      }
    }
  }

  return alertsCreated;
}

// Generate alerts for complaint acknowledgment deadlines
export async function generateComplaintAcknowledgmentAlerts(
  ctx: MutationCtx,
  todayStr: string
): Promise<number> {
  const complaints = await ctx.db.query("complaints").collect();
  const now = new Date();
  let alertsCreated = 0;

  // Get existing active complaint alerts to avoid duplicates
  const existingAlerts = await ctx.db
    .query("alerts")
    .withIndex("by_status_alertType", (q) =>
      q.eq("status", "active").eq("alertType", "complaint_acknowledgment_overdue")
    )
    .collect();
  const existingTitles = new Set(existingAlerts.map((a) => a.title));

  for (const complaint of complaints) {
    // Only check unacknowledged complaints in "received" status
    if (complaint.status !== "received" || complaint.acknowledgedDate) continue;

    const dueDate = complaint.acknowledgmentDueDate
      ? new Date(complaint.acknowledgmentDueDate)
      : new Date(new Date(complaint.receivedDate).getTime() + 24 * 60 * 60 * 1000);

    if (now <= dueDate) continue; // Not yet overdue

    const hoursOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60));
    const refNumber = complaint.referenceNumber || complaint._id;
    const title = `Complaint ${refNumber} - Acknowledgment Overdue`;

    if (existingTitles.has(title)) continue;

    const categoryLabel = complaint.category.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

    const alertId = await createAlertIfNotExists(ctx, {
      alertType: "complaint_acknowledgment_overdue",
      severity: "critical",
      title,
      message: `Complaint ${refNumber} (${categoryLabel}) has not been acknowledged. ${hoursOverdue} hours overdue. Complainant: ${complaint.complainantName || "Anonymous"}.`,
      organizationId: complaint.organizationId,
      linkedPropertyId: complaint.propertyId,
      linkedParticipantId: complaint.participantId,
      triggerDate: todayStr,
      dueDate: complaint.acknowledgmentDueDate || dueDate.toISOString(),
    });

    if (alertId) {
      alertsCreated++;
      existingTitles.add(title);
    }
  }

  return alertsCreated;
}

// Generate alerts for participant consent expiry
export async function generateConsentExpiryAlerts(
  ctx: MutationCtx,
  todayStr: string
): Promise<number> {
  const { today } = getDateStrings();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  let alertsCreated = 0;

  const participants = await ctx.db.query("participants").collect();

  const existingAlerts = await ctx.db
    .query("alerts")
    .withIndex("by_status_alertType", (q) =>
      q.eq("status", "active").eq("alertType", "consent_expiry")
    )
    .collect();
  const existingTitles = new Set(existingAlerts.map((a) => a.title));

  for (const participant of participants) {
    if (participant.status === "moved_out") continue;
    if (!participant.consentExpiryDate) continue;
    if (participant.consentStatus !== "active") continue;

    const expiryDate = new Date(participant.consentExpiryDate);
    const name = `${participant.firstName} ${participant.lastName}`;

    if (expiryDate < today) {
      const title = `Consent expired for ${name}`;
      if (existingTitles.has(title)) continue;

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "consent_expiry",
        severity: "critical",
        title,
        message: `Participant consent expired on ${participant.consentExpiryDate}. Renewal required to continue processing personal information.`,
        organizationId: participant.organizationId,
        linkedParticipantId: participant._id,
        triggerDate: todayStr,
        dueDate: participant.consentExpiryDate,
      });
      if (alertId) {
        alertsCreated++;
        existingTitles.add(title);
      }
    }

    if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
      const days = daysUntil(expiryDate, today);
      const title = `Consent expiring soon for ${name}`;
      if (existingTitles.has(title)) continue;

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "consent_expiry",
        severity: "warning",
        title,
        message: `Participant consent expires on ${participant.consentExpiryDate} (${days} day${days !== 1 ? "s" : ""} remaining).`,
        organizationId: participant.organizationId,
        linkedParticipantId: participant._id,
        triggerDate: todayStr,
        dueDate: participant.consentExpiryDate,
      });
      if (alertId) {
        alertsCreated++;
        existingTitles.add(title);
      }
    }
  }

  return alertsCreated;
}

// Generate alerts for participants with no consent recorded
export async function generateConsentMissingAlerts(
  ctx: MutationCtx,
  todayStr: string
): Promise<number> {
  let alertsCreated = 0;

  const participants = await ctx.db.query("participants").collect();

  const existingAlerts = await ctx.db
    .query("alerts")
    .withIndex("by_status_alertType", (q) =>
      q.eq("status", "active").eq("alertType", "consent_missing")
    )
    .collect();
  const existingTitles = new Set(existingAlerts.map((a) => a.title));

  for (const participant of participants) {
    if (participant.status !== "active" && participant.status !== "pending_move_in") continue;

    if (!participant.consentStatus || participant.consentStatus === "pending") {
      const name = `${participant.firstName} ${participant.lastName}`;
      const title = `No consent recorded for ${name}`;
      if (existingTitles.has(title)) continue;

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "consent_missing",
        severity: "warning",
        title,
        message: `Participant ${name} does not have a consent record. Written consent is required under the Australian Privacy Principles before processing personal information.`,
        organizationId: participant.organizationId,
        linkedParticipantId: participant._id,
        triggerDate: todayStr,
      });
      if (alertId) {
        alertsCreated++;
        existingTitles.add(title);
      }
    }
  }

  return alertsCreated;
}

// Specialist category labels for human-readable alert messages
const SPECIALIST_CATEGORY_LABELS: Record<string, string> = {
  fire_safety: "Fire Safety",
  smoke_alarms: "Smoke Alarms",
  sprinklers: "Sprinklers",
  electrical_safety: "Electrical Safety",
  pest_control: "Pest Control",
  other: "Specialist",
};

// Generate alerts for specialist schedules (fire safety, smoke alarms, sprinklers, etc.)
export async function generateSpecialistScheduleAlerts(
  ctx: MutationCtx,
  todayStr: string
): Promise<number> {
  const { today } = getDateStrings();
  const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  let alertsCreated = 0;

  // Query all active specialist schedules
  const allSchedules = await ctx.db
    .query("preventativeSchedule")
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  const specialistSchedules = allSchedules.filter((s) => s.isSpecialist === true);

  // Get existing active specialist alerts to check for duplicates by title
  const existingDueAlerts = await ctx.db
    .query("alerts")
    .withIndex("by_status_alertType", (q) =>
      q.eq("status", "active").eq("alertType", "specialist_schedule_due")
    )
    .collect();
  const existingOverdueAlerts = await ctx.db
    .query("alerts")
    .withIndex("by_status_alertType", (q) =>
      q.eq("status", "active").eq("alertType", "specialist_schedule_overdue")
    )
    .collect();
  const existingTitles = new Set([
    ...existingDueAlerts.map((a) => a.title),
    ...existingOverdueAlerts.map((a) => a.title),
  ]);

  for (const schedule of specialistSchedules) {
    const dueDate = new Date(schedule.nextDueDate);
    const property = await ctx.db.get(schedule.propertyId);
    const dwelling = schedule.dwellingId ? await ctx.db.get(schedule.dwellingId) : null;
    const categoryLabel =
      SPECIALIST_CATEGORY_LABELS[schedule.specialistCategory || "other"] || "Specialist";
    const locationStr = `${property?.addressLine1 || "Unknown"}${dwelling ? ` (${dwelling.dwellingName})` : ""}`;

    // Overdue: past due date
    if (dueDate < today) {
      const daysOverdue = Math.ceil(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const title = `Overdue ${categoryLabel}: ${schedule.taskName}`;
      if (existingTitles.has(title)) continue;

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "specialist_schedule_overdue",
        severity: "critical",
        title,
        message: `${categoryLabel} task "${schedule.taskName}" at ${locationStr} is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue (was due ${schedule.nextDueDate}).${schedule.contractorName ? ` Contractor: ${schedule.contractorName}.` : ""}`,
        organizationId: schedule.organizationId,
        linkedPreventativeScheduleId: schedule._id,
        linkedPropertyId: schedule.propertyId,
        linkedDwellingId: schedule.dwellingId,
        triggerDate: todayStr,
        dueDate: schedule.nextDueDate,
      });

      if (alertId) {
        alertsCreated++;
        existingTitles.add(title);
      }
    }

    // Due within 14 days (but not overdue)
    if (dueDate >= today && dueDate <= fourteenDaysFromNow) {
      const days = daysUntil(dueDate, today);
      const title = `${categoryLabel} Due: ${schedule.taskName}`;
      if (existingTitles.has(title)) continue;

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "specialist_schedule_due",
        severity: days <= 3 ? "critical" : "warning",
        title,
        message: `${categoryLabel} task "${schedule.taskName}" at ${locationStr} is due in ${days} day${days !== 1 ? "s" : ""} on ${schedule.nextDueDate}.${schedule.contractorName ? ` Contractor: ${schedule.contractorName}.` : ""}`,
        organizationId: schedule.organizationId,
        linkedPreventativeScheduleId: schedule._id,
        linkedPropertyId: schedule.propertyId,
        linkedDwellingId: schedule.dwellingId,
        triggerDate: todayStr,
        dueDate: schedule.nextDueDate,
      });

      if (alertId) {
        alertsCreated++;
        existingTitles.add(title);
      }
    }
  }

  return alertsCreated;
}

// Generate alerts for upcoming scheduled inspections (within 7 days)
export async function generateInspectionAlerts(
  ctx: MutationCtx,
  todayStr: string
): Promise<number> {
  const { today, sevenDaysFromNow } = getDateStrings();
  let alertsCreated = 0;

  // Query all scheduled inspections (not completed or cancelled)
  const inspections = await ctx.db
    .query("inspections")
    .collect();

  const scheduledInspections = inspections.filter(
    (i) => i.status === "scheduled"
  );

  // Get existing active inspection_upcoming alerts to check for duplicates
  const existingAlerts = await ctx.db
    .query("alerts")
    .withIndex("by_status_alertType", (q) =>
      q.eq("status", "active").eq("alertType", "inspection_upcoming")
    )
    .collect();
  const existingTitles = new Set(existingAlerts.map((a) => a.title));

  for (const inspection of scheduledInspections) {
    const scheduledDate = new Date(inspection.scheduledDate);

    // Only alert for inspections within the next 7 days
    if (scheduledDate >= today && scheduledDate <= sevenDaysFromNow) {
      const days = daysUntil(scheduledDate, today);
      const property = await ctx.db.get(inspection.propertyId);
      const dwelling = inspection.dwellingId ? await ctx.db.get(inspection.dwellingId) : null;
      const template = await ctx.db.get(inspection.templateId);
      const inspector = await ctx.db.get(inspection.inspectorId);

      const locationStr = `${property?.addressLine1 || "Unknown"}${dwelling ? ` (${dwelling.dwellingName})` : ""}`;
      const templateName = template?.name || "Inspection";
      const inspectorName = inspector ? `${inspector.firstName} ${inspector.lastName}` : "Unassigned";

      const title = `Inspection Upcoming: ${templateName} at ${property?.addressLine1 || "Unknown"}`;
      if (existingTitles.has(title)) continue;

      const alertId = await createAlertIfNotExists(ctx, {
        alertType: "inspection_upcoming",
        severity: days <= 1 ? "warning" : "info",
        title,
        message: `${templateName} at ${locationStr} is scheduled for ${inspection.scheduledDate} (${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}). Inspector: ${inspectorName}.`,
        organizationId: inspection.organizationId,
        linkedPropertyId: inspection.propertyId,
        linkedDwellingId: inspection.dwellingId,
        triggerDate: todayStr,
        dueDate: inspection.scheduledDate,
      });

      if (alertId) {
        alertsCreated++;
        existingTitles.add(title);
      }
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
  alertsCreated += await generateCertificationExpiryAlerts(ctx, todayStr);
  alertsCreated += await generateComplaintAcknowledgmentAlerts(ctx, todayStr);
  alertsCreated += await generateConsentExpiryAlerts(ctx, todayStr);
  alertsCreated += await generateConsentMissingAlerts(ctx, todayStr);
  alertsCreated += await generateSpecialistScheduleAlerts(ctx, todayStr);
  alertsCreated += await generateInspectionAlerts(ctx, todayStr);

  return { success: true, alertsCreated };
}
