import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth, requireTenant, requireActiveSubscription } from "./authHelpers";
import { encryptField, decryptField, isEncrypted } from "./lib/encryption";

// Decrypt sensitive incident fields (handles both encrypted and plaintext for migration)
async function decryptIncidentFields<T extends Record<string, any>>(i: T): Promise<T> {
  const [description, witnessNames, immediateActionTaken, followUpNotes] = await Promise.all([
    decryptField(i.description),
    decryptField(i.witnessNames),
    decryptField(i.immediateActionTaken),
    decryptField(i.followUpNotes),
  ]);
  return {
    ...i,
    description: description ?? i.description,
    witnessNames: witnessNames ?? i.witnessNames,
    immediateActionTaken: immediateActionTaken ?? i.immediateActionTaken,
    followUpNotes: followUpNotes ?? i.followUpNotes,
  };
}

// NDIS Reportable incident types that require Commission notification
const IMMEDIATE_NOTIFICATION_TYPES = [
  "death",
  "serious_injury",
  "unauthorized_restrictive_practice",
  "sexual_assault",
  "sexual_misconduct",
  "staff_assault",
];

const FIVE_DAY_NOTIFICATION_TYPES = [
  "abuse_neglect",
  "unlawful_conduct",
  "unexplained_injury",
  "missing_participant",
];

// Helper to determine if incident type is NDIS reportable and its timeframe
function getNdisReportableInfo(incidentType: string): { isReportable: boolean; timeframe: "24_hours" | "5_business_days" | null } {
  if (IMMEDIATE_NOTIFICATION_TYPES.includes(incidentType)) {
    return { isReportable: true, timeframe: "24_hours" };
  }
  if (FIVE_DAY_NOTIFICATION_TYPES.includes(incidentType)) {
    return { isReportable: true, timeframe: "5_business_days" };
  }
  return { isReportable: false, timeframe: null };
}

// Helper to calculate notification due date
function calculateDueDate(incidentDate: string, timeframe: "24_hours" | "5_business_days"): string {
  const date = new Date(incidentDate);
  if (timeframe === "24_hours") {
    date.setDate(date.getDate() + 1);
  } else {
    // 5 business days = approximately 7 calendar days
    date.setDate(date.getDate() + 7);
  }
  return date.toISOString().split("T")[0];
}

// Create a new incident report
export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    dwellingId: v.optional(v.id("dwellings")),
    participantId: v.optional(v.id("participants")),
    incidentType: v.union(
      // Standard incident types
      v.literal("injury"),
      v.literal("near_miss"),
      v.literal("property_damage"),
      v.literal("behavioral"),
      v.literal("medication"),
      v.literal("abuse_neglect"),
      v.literal("complaint"),
      // NDIS Reportable incident types
      v.literal("death"),
      v.literal("serious_injury"),
      v.literal("unauthorized_restrictive_practice"),
      v.literal("sexual_assault"),
      v.literal("sexual_misconduct"),
      v.literal("staff_assault"),
      v.literal("unlawful_conduct"),
      v.literal("unexplained_injury"),
      v.literal("missing_participant"),
      v.literal("other")
    ),
    severity: v.union(
      v.literal("minor"),
      v.literal("moderate"),
      v.literal("major"),
      v.literal("critical")
    ),
    title: v.string(),
    description: v.string(),
    incidentDate: v.string(),
    incidentTime: v.optional(v.string()),
    location: v.optional(v.string()),
    witnessNames: v.optional(v.string()),
    immediateActionTaken: v.optional(v.string()),
    followUpRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
    reportedToNdis: v.optional(v.boolean()),
    ndisReportDate: v.optional(v.string()),
    reportedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Verify user has permission and get organizationId
      const user = await requirePermission(ctx, args.reportedBy, "incidents", "create");
      const { organizationId } = await requireTenant(ctx, args.reportedBy);
      // B5 FIX: Require active subscription for write operations
      const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
      await requireActiveSubscription(ctx, organizationId, auditUser);

      const now = Date.now();

      // Determine if this is an NDIS reportable incident
      const { isReportable, timeframe } = getNdisReportableInfo(args.incidentType);

      // Encrypt sensitive fields
      const [encDescription, encWitnessNames, encImmediateAction, encFollowUpNotes] =
        await Promise.all([
          encryptField(args.description),
          encryptField(args.witnessNames),
          encryptField(args.immediateActionTaken),
          encryptField(args.followUpNotes),
        ]);

      // Build base incident data with encrypted fields
      const baseData = {
        ...args,
        organizationId,
        description: encDescription ?? args.description,
        witnessNames: encWitnessNames ?? args.witnessNames,
        immediateActionTaken: encImmediateAction ?? args.immediateActionTaken,
        followUpNotes: encFollowUpNotes ?? args.followUpNotes,
        status: "reported" as const,
        isNdisReportable: isReportable,
        createdAt: now,
        updatedAt: now,
      };

      let incidentId;

      // Add NDIS notification tracking if reportable
      if (isReportable && timeframe) {
        incidentId = await ctx.db.insert("incidents", {
          ...baseData,
          ndisNotificationTimeframe: timeframe,
          ndisNotificationDueDate: calculateDueDate(args.incidentDate, timeframe),
          ndisCommissionNotified: false,
          ndisNotificationOverdue: false,
          ndisNotificationStatus: "required_pending",
        });
      } else {
        incidentId = await ctx.db.insert("incidents", {
          ...baseData,
          ndisNotificationStatus: "not_required",
        });
      }

      // Audit log
      await ctx.runMutation(internal.auditLog.log, {
        userId: user._id,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        action: "create",
        entityType: "incident",
        entityId: incidentId,
        entityName: args.title,
        metadata: JSON.stringify({
          incidentType: args.incidentType,
          severity: args.severity,
          isNdisReportable: isReportable,
          incidentDate: args.incidentDate,
        }),
      });

      // Auto-create a linked communication entry for compliance tracking
      await ctx.runMutation(internal.communications.autoCreateForIncident, {
        organizationId, // Pass org context
        incidentId,
        incidentTitle: args.title,
        incidentDescription: args.description,
        incidentType: args.incidentType,
        severity: args.severity,
        incidentDate: args.incidentDate,
        incidentTime: args.incidentTime,
        propertyId: args.propertyId,
        participantId: args.participantId,
        isNdisReportable: isReportable,
        createdBy: args.reportedBy,
      });

      // Trigger webhook
      await ctx.scheduler.runAfter(0, internal.webhooks.triggerWebhook, {
        organizationId,
        event: "incident.created",
        payload: JSON.stringify({ incidentId, title: args.title, incidentType: args.incidentType, severity: args.severity }),
      });

      return incidentId;
    } catch (error) {
      // Log the error
      console.error("Failed to create incident:", error);

      // Send failure email to admin
      try {
        await ctx.scheduler.runAfter(0, internal.notifications.sendIncidentFailureEmail, {
          incidentData: {
            title: args.title,
            description: args.description,
            incidentType: args.incidentType,
            severity: args.severity,
            incidentDate: args.incidentDate,
            propertyId: args.propertyId,
            reportedByUserId: args.reportedBy,
          },
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } catch (emailError) {
        console.error("Failed to send incident failure email:", emailError);
      }

      // Re-throw the error so the user knows it failed
      throw error;
    }
  },
});

// Get all incidents for a property
export const getByProperty = query({
  args: { userId: v.id("users"), propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .collect();

    const incidents = allIncidents.filter(i => i.organizationId === organizationId);

    // Get participant details for each incident and decrypt
    const incidentsWithDetails = await Promise.all(
      incidents.map(async (incident) => {
        const decrypted = await decryptIncidentFields(incident);
        let participant = null;
        if (incident.participantId) {
          participant = await ctx.db.get(incident.participantId);
        }
        let dwelling = null;
        if (incident.dwellingId) {
          dwelling = await ctx.db.get(incident.dwellingId);
        }
        return {
          ...decrypted,
          participant,
          dwelling,
        };
      })
    );

    return incidentsWithDetails;
  },
});

// Get all incidents (with optional filters)
export const getAll = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    let allIncidents;
    if (args.status) {
      allIncidents = await ctx.db
        .query("incidents")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .order("desc")
        .collect();
    } else {
      allIncidents = await ctx.db
        .query("incidents")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .order("desc")
        .collect();
    }
    const incidents = allIncidents.filter(i => i.organizationId === organizationId);

    // Get details for each incident and decrypt
    const incidentsWithDetails = await Promise.all(
      incidents.map(async (incident) => {
        const decrypted = await decryptIncidentFields(incident);
        const property = await ctx.db.get(incident.propertyId);
        let participant = null;
        if (incident.participantId) {
          participant = await ctx.db.get(incident.participantId);
        }
        let dwelling = null;
        if (incident.dwellingId) {
          dwelling = await ctx.db.get(incident.dwellingId);
        }
        return {
          ...decrypted,
          property,
          participant,
          dwelling,
        };
      })
    );

    return incidentsWithDetails;
  },
});

// Get incident by ID
export const getById = query({
  args: { userId: v.id("users"), incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) return null;
    if (incident.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    const decrypted = await decryptIncidentFields(incident);
    const property = await ctx.db.get(incident.propertyId);
    let participant = null;
    if (incident.participantId) {
      participant = await ctx.db.get(incident.participantId);
    }
    let dwelling = null;
    if (incident.dwellingId) {
      dwelling = await ctx.db.get(incident.dwellingId);
    }

    // Get photos
    const photos = await ctx.db
      .query("incidentPhotos")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        return { ...photo, url };
      })
    );

    return {
      ...decrypted,
      property,
      participant,
      dwelling,
      photos: photosWithUrls,
    };
  },
});

// Update incident
export const update = mutation({
  args: {
    userId: v.id("users"),
    incidentId: v.id("incidents"),
    incidentType: v.optional(
      v.union(
        v.literal("injury"),
        v.literal("near_miss"),
        v.literal("property_damage"),
        v.literal("behavioral"),
        v.literal("medication"),
        v.literal("abuse_neglect"),
        v.literal("complaint"),
        v.literal("death"),
        v.literal("serious_injury"),
        v.literal("unauthorized_restrictive_practice"),
        v.literal("sexual_assault"),
        v.literal("sexual_misconduct"),
        v.literal("staff_assault"),
        v.literal("unlawful_conduct"),
        v.literal("unexplained_injury"),
        v.literal("missing_participant"),
        v.literal("other")
      )
    ),
    severity: v.optional(
      v.union(
        v.literal("minor"),
        v.literal("moderate"),
        v.literal("major"),
        v.literal("critical")
      )
    ),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    incidentDate: v.optional(v.string()),
    incidentTime: v.optional(v.string()),
    location: v.optional(v.string()),
    witnessNames: v.optional(v.string()),
    immediateActionTaken: v.optional(v.string()),
    followUpRequired: v.optional(v.boolean()),
    followUpNotes: v.optional(v.string()),
    reportedToNdis: v.optional(v.boolean()),
    ndisReportDate: v.optional(v.string()),
    // New NDIS Commission notification fields
    ndisCommissionNotified: v.optional(v.boolean()),
    ndisCommissionNotificationDate: v.optional(v.string()),
    ndisCommissionReferenceNumber: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("reported"),
        v.literal("under_investigation"),
        v.literal("resolved"),
        v.literal("closed")
      )
    ),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user has permission to update incidents and get organizationId
    const user = await requirePermission(ctx, args.userId, "incidents", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { incidentId, userId, ...updates } = args;

    // Capture previous values BEFORE update for audit trail
    const incident = await ctx.db.get(incidentId);
    if (!incident) throw new Error("Incident not found");
    if (incident.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    const previousValues: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if ((updates as Record<string, unknown>)[key] !== undefined) {
        previousValues[key] = (incident as Record<string, unknown>)[key];
      }
    }

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // Encrypt sensitive fields if they are being updated
    if (filteredUpdates.description !== undefined) {
      const plain = filteredUpdates.description as string;
      filteredUpdates.description = await encryptField(plain) ?? plain;
    }
    if (filteredUpdates.witnessNames !== undefined) {
      const plain = filteredUpdates.witnessNames as string;
      filteredUpdates.witnessNames = await encryptField(plain) ?? plain;
    }
    if (filteredUpdates.immediateActionTaken !== undefined) {
      const plain = filteredUpdates.immediateActionTaken as string;
      filteredUpdates.immediateActionTaken = await encryptField(plain) ?? plain;
    }
    if (filteredUpdates.followUpNotes !== undefined) {
      const plain = filteredUpdates.followUpNotes as string;
      filteredUpdates.followUpNotes = await encryptField(plain) ?? plain;
    }

    // If NDIS Commission was notified, clear the overdue flag
    if (updates.ndisCommissionNotified === true) {
      filteredUpdates.ndisNotificationOverdue = false;
    }

    await ctx.db.patch(incidentId, filteredUpdates);

    // Audit log the update with previous values
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "incident",
      entityId: incidentId,
      entityName: incident.title,
      changes: JSON.stringify(filteredUpdates),
      previousValues: JSON.stringify(previousValues),
      metadata: JSON.stringify({
        incidentType: incident.incidentType,
        isNdisReportable: incident.isNdisReportable,
      }),
    });

    return { success: true };
  },
});

// Mark incident as notified to NDIS Commission
// CRITICAL: This function MUST log the exact timestamp for NDIS 24-hour notification compliance
export const markNdisNotified = mutation({
  args: {
    userId: v.id("users"),
    incidentId: v.id("incidents"),
    notificationDate: v.string(),
    referenceNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user has permission to update incidents and get organizationId
    const user = await requirePermission(ctx, args.userId, "incidents", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) throw new Error("Incident not found");
    if (incident.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    // Capture the exact timestamp for compliance audit trail
    const notificationTimestamp = new Date().toISOString();

    // Capture previous NDIS notification state
    const previousValues = {
      ndisCommissionNotified: incident.ndisCommissionNotified,
      ndisCommissionNotificationDate: incident.ndisCommissionNotificationDate,
      ndisCommissionReferenceNumber: incident.ndisCommissionReferenceNumber,
      ndisNotificationOverdue: incident.ndisNotificationOverdue,
      reportedToNdis: incident.reportedToNdis,
      ndisReportDate: incident.ndisReportDate,
    };

    await ctx.db.patch(args.incidentId, {
      ndisCommissionNotified: true,
      ndisCommissionNotificationDate: args.notificationDate,
      ndisCommissionReferenceNumber: args.referenceNumber,
      ndisNotificationOverdue: false,
      ndisNotificationStatus: "submitted",
      ndisNotificationSubmittedAt: new Date().toISOString(),
      // Also update legacy fields for backward compatibility
      reportedToNdis: true,
      ndisReportDate: args.notificationDate,
      updatedAt: Date.now(),
    });

    // CRITICAL AUDIT LOG: Records exact timestamp of NDIS notification for compliance
    // This proves we met the 24-hour notification requirement for major incidents
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "incident",
      entityId: args.incidentId,
      entityName: "NDIS_NOTIFICATION",
      changes: JSON.stringify({
        ndisCommissionNotified: true,
        ndisCommissionNotificationDate: args.notificationDate,
        ndisCommissionReferenceNumber: args.referenceNumber,
        notificationTimestamp: notificationTimestamp,
      }),
      previousValues: JSON.stringify(previousValues),
      metadata: JSON.stringify({
        incidentTitle: incident.title,
        incidentType: incident.incidentType,
        incidentDate: incident.incidentDate,
        severity: incident.severity,
        isNdisReportable: incident.isNdisReportable,
        ndisNotificationTimeframe: incident.ndisNotificationTimeframe,
        ndisNotificationDueDate: incident.ndisNotificationDueDate,
        wasOverdue: incident.ndisNotificationOverdue,
      }),
    });

    return { success: true };
  },
});



// Explicitly mark NDIS notification as submitted (N9 enforcement)
// This is an alias/wrapper that provides a cleaner API for the frontend
export const markNdisNotificationSubmitted = mutation({
  args: {
    userId: v.id("users"),
    incidentId: v.id("incidents"),
    submittedDate: v.string(),
    ndisReferenceNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "incidents", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) throw new Error("Incident not found");
    if (incident.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    if (incident.ndisNotificationStatus === "not_required") {
      throw new Error("This incident does not require NDIS notification");
    }

    const submittedAt = new Date().toISOString();

    await ctx.db.patch(args.incidentId, {
      ndisCommissionNotified: true,
      ndisCommissionNotificationDate: args.submittedDate,
      ndisCommissionReferenceNumber: args.ndisReferenceNumber,
      ndisNotificationOverdue: false,
      ndisNotificationStatus: "submitted",
      ndisNotificationSubmittedAt: submittedAt,
      reportedToNdis: true,
      ndisReportDate: args.submittedDate,
      updatedAt: Date.now(),
    });

    // Resolve any active overdue alerts for this incident
    const activeAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("alertType"), "ndis_notification_overdue"),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    for (const alert of activeAlerts) {
      if (alert.title.includes(args.incidentId)) {
        await ctx.db.patch(alert._id, {
          status: "resolved",
          resolvedBy: args.userId,
          resolvedAt: Date.now(),
        });
      }
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "incident",
      entityId: args.incidentId,
      entityName: "NDIS_NOTIFICATION_SUBMITTED",
      changes: JSON.stringify({
        ndisNotificationStatus: "submitted",
        ndisNotificationSubmittedAt: submittedAt,
        ndisCommissionReferenceNumber: args.ndisReferenceNumber,
      }),
      metadata: JSON.stringify({
        incidentTitle: incident.title,
        incidentType: incident.incidentType,
        wasOverdue: incident.ndisNotificationStatus === "overdue",
      }),
    });

    return { success: true };
  },
});

// Get all NDIS reportable incidents
export const getNdisReportable = query({
  args: {
    userId: v.id("users"),
    notifiedOnly: v.optional(v.boolean()),
    overdueOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    let allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_isNdisReportable", (q) => q.eq("isNdisReportable", true))
      .order("desc")
      .collect();

    let incidents = allIncidents.filter(i => i.organizationId === organizationId);

    if (args.notifiedOnly === true) {
      incidents = incidents.filter(i => i.ndisCommissionNotified === true);
    } else if (args.notifiedOnly === false) {
      incidents = incidents.filter(i => i.ndisCommissionNotified !== true);
    }

    if (args.overdueOnly === true) {
      incidents = incidents.filter(i => i.ndisNotificationOverdue === true);
    }

    // Enrich with details and decrypt
    const enriched = await Promise.all(
      incidents.map(async (incident) => {
        const decrypted = await decryptIncidentFields(incident);
        const property = await ctx.db.get(incident.propertyId);
        const participant = incident.participantId ? await ctx.db.get(incident.participantId) : null;
        return { ...decrypted, property, participant };
      })
    );

    return enriched;
  },
});

// Check for overdue NDIS notifications (run via cron - legacy public mutation)
export const checkOverdueNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_isNdisReportable", (q) => q.eq("isNdisReportable", true))
      .collect();

    const today = new Date();
    let updated = 0;

    for (const incident of incidents) {
      // Skip if already notified or already marked overdue
      if (incident.ndisCommissionNotified || incident.ndisNotificationOverdue) continue;

      if (incident.ndisNotificationDueDate) {
        const dueDate = new Date(incident.ndisNotificationDueDate);
        if (today > dueDate) {
          await ctx.db.patch(incident._id, {
            ndisNotificationOverdue: true,
            ndisNotificationStatus: "overdue",
            updatedAt: Date.now(),
          });
          updated++;
        }
      }
    }

    return { updated };
  },
});

// Internal mutation for cron: check overdue NDIS notifications and create CRITICAL alerts
export const checkOverdueNdisNotificationsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all incidents with required_pending status
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_isNdisReportable", (q) => q.eq("isNdisReportable", true))
      .collect();

    const today = new Date();
    let updated = 0;
    let alertsCreated = 0;

    for (const incident of incidents) {
      // Skip if already notified, already marked overdue, or not required
      if (incident.ndisCommissionNotified) continue;
      if (incident.ndisNotificationStatus === "overdue") continue;
      if (incident.ndisNotificationStatus === "submitted") continue;
      if (incident.ndisNotificationStatus === "not_required") continue;

      if (incident.ndisNotificationDueDate) {
        const dueDate = new Date(incident.ndisNotificationDueDate);
        if (today > dueDate) {
          // Mark as overdue
          await ctx.db.patch(incident._id, {
            ndisNotificationOverdue: true,
            ndisNotificationStatus: "overdue",
            updatedAt: Date.now(),
          });
          updated++;

          // Create a CRITICAL alert via the alert system
          if (incident.organizationId) {
            // Check if alert already exists for this incident
            const existingAlert = await ctx.db
              .query("alerts")
              .withIndex("by_organizationId", (q) => q.eq("organizationId", incident.organizationId))
              .filter((q) =>
                q.and(
                  q.eq(q.field("alertType"), "ndis_notification_overdue"),
                  q.eq(q.field("status"), "active")
                )
              )
              .collect();

            const alreadyHasAlert = existingAlert.some(
              (a) => a.title.includes(incident._id)
            );

            if (!alreadyHasAlert) {
              const timeframeLabel = incident.ndisNotificationTimeframe === "24_hours"
                ? "24-hour" : "5-business-day";
              await ctx.db.insert("alerts", {
                organizationId: incident.organizationId,
                alertType: "ndis_notification_overdue",
                severity: "critical",
                title: `NDIS notification OVERDUE for incident ${incident._id}`,
                message: `${timeframeLabel} NDIS Commission notification is overdue for incident "${incident.title}". Deadline was ${incident.ndisNotificationDueDate}. Immediate action required.`,
                linkedPropertyId: incident.propertyId,
                linkedParticipantId: incident.participantId,
                triggerDate: today.toISOString().split("T")[0],
                dueDate: incident.ndisNotificationDueDate,
                status: "active",
                createdAt: Date.now(),
              });
              alertsCreated++;
            }
          }
        }
      }
    }

    return { updated, alertsCreated };
  },
});

// Get incident statistics including NDIS reportable
export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const incidents = allIncidents;

    const stats = {
      total: incidents.length,
      byStatus: {
        reported: incidents.filter(i => i.status === "reported").length,
        under_investigation: incidents.filter(i => i.status === "under_investigation").length,
        resolved: incidents.filter(i => i.status === "resolved").length,
        closed: incidents.filter(i => i.status === "closed").length,
      },
      bySeverity: {
        minor: incidents.filter(i => i.severity === "minor").length,
        moderate: incidents.filter(i => i.severity === "moderate").length,
        major: incidents.filter(i => i.severity === "major").length,
        critical: incidents.filter(i => i.severity === "critical").length,
      },
      ndisReportable: {
        total: incidents.filter(i => i.isNdisReportable).length,
        notified: incidents.filter(i => i.isNdisReportable && i.ndisCommissionNotified).length,
        pending: incidents.filter(i => i.isNdisReportable && !i.ndisCommissionNotified).length,
        overdue: incidents.filter(i => i.ndisNotificationOverdue).length,
        immediate: incidents.filter(i => i.ndisNotificationTimeframe === "24_hours").length,
        fiveDay: incidents.filter(i => i.ndisNotificationTimeframe === "5_business_days").length,
      },
    };

    return stats;
  },
});

// Resolve incident
export const resolve = mutation({
  args: {
    incidentId: v.id("incidents"),
    resolvedBy: v.id("users"),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user has permission to update incidents and get organizationId
    const user = await requirePermission(ctx, args.resolvedBy, "incidents", "update");
    const { organizationId } = await requireTenant(ctx, args.resolvedBy);

    // Get incident for audit trail and verify ownership
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) throw new Error("Incident not found");
    if (incident.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    const resolvedAt = Date.now();
    const resolvedAtISO = new Date(resolvedAt).toISOString();

    // Capture previous status for audit
    const previousValues = {
      status: incident.status,
      resolvedBy: incident.resolvedBy,
      resolvedAt: incident.resolvedAt,
      resolutionNotes: incident.resolutionNotes,
    };

    await ctx.db.patch(args.incidentId, {
      status: "resolved",
      resolvedBy: args.resolvedBy,
      resolvedAt: resolvedAt,
      resolutionNotes: args.resolutionNotes,
      updatedAt: resolvedAt,
    });

    // Audit log the resolution
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "incident",
      entityId: args.incidentId,
      entityName: "INCIDENT_RESOLVED",
      changes: JSON.stringify({
        status: "resolved",
        resolvedAt: resolvedAtISO,
        resolutionNotes: args.resolutionNotes,
      }),
      previousValues: JSON.stringify(previousValues),
      metadata: JSON.stringify({
        incidentTitle: incident.title,
        incidentType: incident.incidentType,
        incidentDate: incident.incidentDate,
        severity: incident.severity,
        isNdisReportable: incident.isNdisReportable,
        ndisCommissionNotified: incident.ndisCommissionNotified,
      }),
    });

    // Trigger webhook
    await ctx.scheduler.runAfter(0, internal.webhooks.triggerWebhook, {
      organizationId,
      event: "incident.resolved",
      payload: JSON.stringify({ incidentId: args.incidentId }),
    });

    return { success: true };
  },
});

// Generate upload URL for incident media
export const generateUploadUrl = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify user has permission to create incidents
    await requirePermission(ctx, args.userId, "incidents", "create");
    return await ctx.storage.generateUploadUrl();
  },
});

// Add photo/video to incident
export const addPhoto = mutation({
  args: {
    incidentId: v.id("incidents"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    description: v.optional(v.string()),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify user has permission to update incidents
    await requirePermission(ctx, args.uploadedBy, "incidents", "update");
    const photoId = await ctx.db.insert("incidentPhotos", {
      ...args,
      createdAt: Date.now(),
    });
    return photoId;
  },
});

// Delete incident photo
export const deletePhoto = mutation({
  args: {
    userId: v.id("users"),
    photoId: v.id("incidentPhotos"),
  },
  handler: async (ctx, args) => {
    // Verify user has permission to update incidents
    await requirePermission(ctx, args.userId, "incidents", "update");
    const photo = await ctx.db.get(args.photoId);
    if (photo) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(args.photoId);
    }
    return { success: true };
  },
});

// Internal raw query for migration (no decryption - returns data as-is)
export const getAllRaw = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("incidents").collect();
  },
});
