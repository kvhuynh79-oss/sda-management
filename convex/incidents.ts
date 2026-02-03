import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth } from "./authHelpers";

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
    // Verify user has permission
    const user = await requirePermission(ctx, args.reportedBy, "incidents", "create");

    const now = Date.now();

    // Determine if this is an NDIS reportable incident
    const { isReportable, timeframe } = getNdisReportableInfo(args.incidentType);

    // Build base incident data
    const baseData = {
      ...args,
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
      });
    } else {
      incidentId = await ctx.db.insert("incidents", baseData);
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

    return incidentId;
  },
});

// Get all incidents for a property
export const getByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .collect();

    // Get participant details for each incident
    const incidentsWithDetails = await Promise.all(
      incidents.map(async (incident) => {
        let participant = null;
        if (incident.participantId) {
          participant = await ctx.db.get(incident.participantId);
        }
        let dwelling = null;
        if (incident.dwellingId) {
          dwelling = await ctx.db.get(incident.dwellingId);
        }
        return {
          ...incident,
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
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let incidents;
    if (args.status) {
      incidents = await ctx.db
        .query("incidents")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .order("desc")
        .collect();
    } else {
      incidents = await ctx.db.query("incidents").order("desc").collect();
    }

    // Get details for each incident
    const incidentsWithDetails = await Promise.all(
      incidents.map(async (incident) => {
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
          ...incident,
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
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) return null;

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
      ...incident,
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
    await requireAuth(ctx, args.userId);
    const { incidentId, userId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // If NDIS Commission was notified, clear the overdue flag
    if (updates.ndisCommissionNotified === true) {
      filteredUpdates.ndisNotificationOverdue = false;
    }

    await ctx.db.patch(incidentId, filteredUpdates);
    return { success: true };
  },
});

// Mark incident as notified to NDIS Commission
export const markNdisNotified = mutation({
  args: {
    userId: v.id("users"),
    incidentId: v.id("incidents"),
    notificationDate: v.string(),
    referenceNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) throw new Error("Incident not found");

    await ctx.db.patch(args.incidentId, {
      ndisCommissionNotified: true,
      ndisCommissionNotificationDate: args.notificationDate,
      ndisCommissionReferenceNumber: args.referenceNumber,
      ndisNotificationOverdue: false,
      // Also update legacy fields for backward compatibility
      reportedToNdis: true,
      ndisReportDate: args.notificationDate,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get all NDIS reportable incidents
export const getNdisReportable = query({
  args: {
    notifiedOnly: v.optional(v.boolean()),
    overdueOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let incidents = await ctx.db
      .query("incidents")
      .withIndex("by_isNdisReportable", (q) => q.eq("isNdisReportable", true))
      .order("desc")
      .collect();

    if (args.notifiedOnly === true) {
      incidents = incidents.filter(i => i.ndisCommissionNotified === true);
    } else if (args.notifiedOnly === false) {
      incidents = incidents.filter(i => i.ndisCommissionNotified !== true);
    }

    if (args.overdueOnly === true) {
      incidents = incidents.filter(i => i.ndisNotificationOverdue === true);
    }

    // Enrich with details
    const enriched = await Promise.all(
      incidents.map(async (incident) => {
        const property = await ctx.db.get(incident.propertyId);
        const participant = incident.participantId ? await ctx.db.get(incident.participantId) : null;
        return { ...incident, property, participant };
      })
    );

    return enriched;
  },
});

// Check for overdue NDIS notifications (run via cron)
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
            updatedAt: Date.now(),
          });
          updated++;
        }
      }
    }

    return { updated };
  },
});

// Get incident statistics including NDIS reportable
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const incidents = await ctx.db.query("incidents").collect();

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
    await requireAuth(ctx, args.resolvedBy);
    await ctx.db.patch(args.incidentId, {
      status: "resolved",
      resolvedBy: args.resolvedBy,
      resolvedAt: Date.now(),
      resolutionNotes: args.resolutionNotes,
      updatedAt: Date.now(),
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
    await requireAuth(ctx, args.userId);
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
    await requireAuth(ctx, args.uploadedBy);
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
    await requireAuth(ctx, args.userId);
    const photo = await ctx.db.get(args.photoId);
    if (photo) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(args.photoId);
    }
    return { success: true };
  },
});
