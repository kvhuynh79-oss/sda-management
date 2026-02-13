import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireTenant, requirePermission } from "./authHelpers";

// Color mapping for calendar event types
const EVENT_COLORS: Record<string, string> = {
  task: "#3b82f6",           // blue
  maintenance: "#22c55e",     // green
  preventative: "#14b8a6",    // teal
  inspection: "#a855f7",      // purple
  plan_expiry: "#ef4444",     // red
  compliance: "#ef4444",      // red
  cert_expiry: "#f97316",     // orange
  doc_expiry: "#eab308",      // yellow
  payment: "#10b981",         // emerald
  appointment: "#0d9488",     // teal-600
  external: "#6b7280",        // gray
};

// Unified calendar event shape returned by getCalendarEvents
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  eventType: string;
  color: string;
  sourceTable: string;
  linkedEntityId: string | null;
  linkedEntityType: string | null;
  url: string | null;
}

/**
 * Helper: check if a date string (YYYY-MM-DD or ISO datetime) falls within a range.
 * startDate and endDate are ISO date strings (YYYY-MM-DD).
 */
function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  // Normalize to YYYY-MM-DD for comparison
  const d = dateStr.substring(0, 10);
  return d >= startDate.substring(0, 10) && d <= endDate.substring(0, 10);
}

/**
 * Helper: check if an ISO datetime falls within a date range.
 * For events with full datetime (startTime/endTime), checks overlap with the range.
 */
function isDatetimeInRange(startTime: string, endTime: string, rangeStart: string, rangeEnd: string): boolean {
  // Events overlap the range if they start before the range ends AND end after the range starts
  const eventStart = startTime.substring(0, 10);
  const eventEnd = endTime.substring(0, 10);
  const rStart = rangeStart.substring(0, 10);
  const rEnd = rangeEnd.substring(0, 10);
  return eventStart <= rEnd && eventEnd >= rStart;
}

/**
 * Get calendar events from all internal data sources + user-created events.
 * Aggregates data from 10 tables into a unified calendar view.
 */
export const getCalendarEvents = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(), // ISO date string (YYYY-MM-DD)
    endDate: v.string(),   // ISO date string (YYYY-MM-DD)
    eventTypes: v.optional(v.array(v.string())),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const events: CalendarEvent[] = [];

    // Fetch from all 10 sources in parallel
    const [
      calendarEventsData,
      tasksData,
      maintenanceData,
      preventativeData,
      inspectionsData,
      participantPlansData,
      complaintsData,
      certificationsData,
      documentsData,
      expectedPaymentsData,
    ] = await Promise.all([
      // 1. calendarEvents table (user-created + external)
      ctx.db
        .query("calendarEvents")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect(),

      // 2. tasks
      ctx.db
        .query("tasks")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect(),

      // 3. maintenanceRequests
      ctx.db
        .query("maintenanceRequests")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect(),

      // 4. preventativeSchedule
      ctx.db
        .query("preventativeSchedule")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect(),

      // 5. inspections
      ctx.db
        .query("inspections")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect(),

      // 6. participantPlans
      ctx.db
        .query("participantPlans")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect(),

      // 7. complaints
      ctx.db
        .query("complaints")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect(),

      // 8. complianceCertifications
      ctx.db
        .query("complianceCertifications")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect(),

      // 9. documents
      ctx.db
        .query("documents")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect(),

      // 10. expectedPayments
      ctx.db
        .query("expectedPayments")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect(),
    ]);

    // Build a dwelling-to-property lookup for maintenance requests
    const dwellingIds = new Set<string>();
    for (const mr of maintenanceData) {
      dwellingIds.add(mr.dwellingId as string);
    }
    const dwellingMap = new Map<string, string>(); // dwellingId -> propertyId
    if (dwellingIds.size > 0) {
      const dwellings = await ctx.db
        .query("dwellings")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect();
      for (const d of dwellings) {
        dwellingMap.set(d._id as string, d.propertyId as string);
      }
    }

    // 1. Calendar events (user-created + external)
    for (const ce of calendarEventsData) {
      if (ce.isDeleted === true) continue;
      if (!isDatetimeInRange(ce.startTime, ce.endTime, args.startDate, args.endDate)) continue;
      if (args.propertyId && ce.linkedPropertyId !== args.propertyId) continue;

      const eventType = ce.eventType === "external" ? "external" : (ce.eventType as string);
      events.push({
        id: ce._id as string,
        title: ce.title,
        start: ce.startTime,
        end: ce.endTime,
        allDay: ce.allDay,
        eventType: eventType,
        color: ce.color || EVENT_COLORS[eventType] || EVENT_COLORS.appointment,
        sourceTable: "calendarEvents",
        linkedEntityId: ce._id as string,
        linkedEntityType: "calendarEvent",
        url: null,
      });
    }

    // 2. Tasks
    for (const task of tasksData) {
      if (task.status === "completed" || task.status === "cancelled") continue;
      if (!task.dueDate) continue;
      if (!isDateInRange(task.dueDate, args.startDate, args.endDate)) continue;
      if (args.propertyId && task.linkedPropertyId !== args.propertyId) continue;

      events.push({
        id: task._id as string,
        title: task.title,
        start: `${task.dueDate}T00:00:00`,
        end: `${task.dueDate}T23:59:59`,
        allDay: true,
        eventType: "task",
        color: EVENT_COLORS.task,
        sourceTable: "tasks",
        linkedEntityId: task._id as string,
        linkedEntityType: "task",
        url: "/follow-ups",
      });
    }

    // 3. Maintenance requests (scheduled)
    for (const mr of maintenanceData) {
      if (!mr.scheduledDate) continue;
      if (mr.status === "completed" || mr.status === "cancelled") continue;
      if (!isDateInRange(mr.scheduledDate, args.startDate, args.endDate)) continue;

      const mrPropertyId = dwellingMap.get(mr.dwellingId as string);
      if (args.propertyId && mrPropertyId !== (args.propertyId as string)) continue;

      events.push({
        id: mr._id as string,
        title: `Maintenance: ${mr.title}`,
        start: `${mr.scheduledDate}T00:00:00`,
        end: `${mr.scheduledDate}T23:59:59`,
        allDay: true,
        eventType: "maintenance",
        color: EVENT_COLORS.maintenance,
        sourceTable: "maintenanceRequests",
        linkedEntityId: mr._id as string,
        linkedEntityType: "maintenanceRequest",
        url: `/operations/${mr._id as string}`,
      });
    }

    // 4. Preventative schedule
    for (const ps of preventativeData) {
      if (!ps.isActive) continue;
      if (!ps.nextDueDate) continue;
      if (!isDateInRange(ps.nextDueDate, args.startDate, args.endDate)) continue;
      if (args.propertyId && ps.propertyId !== args.propertyId) continue;

      events.push({
        id: ps._id as string,
        title: `Preventative: ${ps.taskName}`,
        start: `${ps.nextDueDate}T00:00:00`,
        end: `${ps.nextDueDate}T23:59:59`,
        allDay: true,
        eventType: "preventative",
        color: EVENT_COLORS.preventative,
        sourceTable: "preventativeSchedule",
        linkedEntityId: ps._id as string,
        linkedEntityType: "preventativeSchedule",
        url: "/preventative-schedule",
      });
    }

    // 5. Inspections
    for (const insp of inspectionsData) {
      if (insp.status === "completed" || insp.status === "cancelled") continue;
      if (!insp.scheduledDate) continue;
      if (!isDateInRange(insp.scheduledDate, args.startDate, args.endDate)) continue;
      if (args.propertyId && insp.propertyId !== args.propertyId) continue;

      events.push({
        id: insp._id as string,
        title: `Inspection: ${insp.location || "Property Inspection"}`,
        start: `${insp.scheduledDate}T00:00:00`,
        end: `${insp.scheduledDate}T23:59:59`,
        allDay: true,
        eventType: "inspection",
        color: EVENT_COLORS.inspection,
        sourceTable: "inspections",
        linkedEntityId: insp._id as string,
        linkedEntityType: "inspection",
        url: `/inspections/${insp._id as string}`,
      });
    }

    // 6. Participant plans (expiry dates)
    for (const plan of participantPlansData) {
      if (plan.planStatus === "expired") continue;
      if (!plan.planEndDate) continue;
      if (!isDateInRange(plan.planEndDate, args.startDate, args.endDate)) continue;
      // Plans don't have a direct propertyId, skip property filter for plans

      events.push({
        id: plan._id as string,
        title: `Plan Expiry: Participant Plan`,
        start: `${plan.planEndDate}T00:00:00`,
        end: `${plan.planEndDate}T23:59:59`,
        allDay: true,
        eventType: "plan_expiry",
        color: EVENT_COLORS.plan_expiry,
        sourceTable: "participantPlans",
        linkedEntityId: plan.participantId as string,
        linkedEntityType: "participant",
        url: `/participants/${plan.participantId as string}`,
      });
    }

    // 7. Complaints (acknowledgment and resolution due dates)
    for (const complaint of complaintsData) {
      if (complaint.status === "closed" || complaint.status === "resolved") continue;

      // Acknowledgment due date
      if (complaint.acknowledgmentDueDate && complaint.status === "received") {
        if (isDateInRange(complaint.acknowledgmentDueDate, args.startDate, args.endDate)) {
          if (!args.propertyId || complaint.propertyId === args.propertyId) {
            events.push({
              id: `${complaint._id as string}_ack`,
              title: `Complaint Ack Due: ${complaint.referenceNumber || "Complaint"}`,
              start: `${complaint.acknowledgmentDueDate}T00:00:00`,
              end: `${complaint.acknowledgmentDueDate}T23:59:59`,
              allDay: true,
              eventType: "compliance",
              color: EVENT_COLORS.compliance,
              sourceTable: "complaints",
              linkedEntityId: complaint._id as string,
              linkedEntityType: "complaint",
              url: `/complaints/${complaint._id as string}`,
            });
          }
        }
      }

      // Resolution due date
      if (complaint.resolutionDueDate) {
        if (isDateInRange(complaint.resolutionDueDate, args.startDate, args.endDate)) {
          if (!args.propertyId || complaint.propertyId === args.propertyId) {
            events.push({
              id: `${complaint._id as string}_res`,
              title: `Complaint Resolution Due: ${complaint.referenceNumber || "Complaint"}`,
              start: `${complaint.resolutionDueDate}T00:00:00`,
              end: `${complaint.resolutionDueDate}T23:59:59`,
              allDay: true,
              eventType: "compliance",
              color: EVENT_COLORS.compliance,
              sourceTable: "complaints",
              linkedEntityId: complaint._id as string,
              linkedEntityType: "complaint",
              url: `/complaints/${complaint._id as string}`,
            });
          }
        }
      }
    }

    // 8. Compliance certifications (expiry dates)
    for (const cert of certificationsData) {
      if (cert.status === "expired") continue;
      if (!cert.expiryDate) continue;
      if (!isDateInRange(cert.expiryDate, args.startDate, args.endDate)) continue;
      if (args.propertyId && cert.propertyId && cert.propertyId !== args.propertyId) continue;

      events.push({
        id: cert._id as string,
        title: `Cert Expiry: ${cert.certificationName}`,
        start: `${cert.expiryDate}T00:00:00`,
        end: `${cert.expiryDate}T23:59:59`,
        allDay: true,
        eventType: "cert_expiry",
        color: EVENT_COLORS.cert_expiry,
        sourceTable: "complianceCertifications",
        linkedEntityId: cert._id as string,
        linkedEntityType: "complianceCertification",
        url: `/compliance/certifications/${cert._id as string}`,
      });
    }

    // 9. Documents (expiry dates)
    for (const doc of documentsData) {
      if (!doc.expiryDate) continue;
      if (!isDateInRange(doc.expiryDate, args.startDate, args.endDate)) continue;
      if (args.propertyId && doc.linkedPropertyId && doc.linkedPropertyId !== args.propertyId) continue;

      events.push({
        id: doc._id as string,
        title: `Doc Expiry: ${doc.fileName}`,
        start: `${doc.expiryDate}T00:00:00`,
        end: `${doc.expiryDate}T23:59:59`,
        allDay: true,
        eventType: "doc_expiry",
        color: EVENT_COLORS.doc_expiry,
        sourceTable: "documents",
        linkedEntityId: doc._id as string,
        linkedEntityType: "document",
        url: "/documents",
      });
    }

    // 10. Expected payments
    for (const ep of expectedPaymentsData) {
      if (ep.status === "received" || ep.status === "cancelled") continue;
      if (!ep.expectedDate) continue;
      if (!isDateInRange(ep.expectedDate, args.startDate, args.endDate)) continue;
      if (args.propertyId && ep.propertyId && ep.propertyId !== args.propertyId) continue;

      events.push({
        id: ep._id as string,
        title: `Payment Due: $${ep.expectedAmount.toLocaleString()}`,
        start: `${ep.expectedDate}T00:00:00`,
        end: `${ep.expectedDate}T23:59:59`,
        allDay: true,
        eventType: "payment",
        color: EVENT_COLORS.payment,
        sourceTable: "expectedPayments",
        linkedEntityId: ep._id as string,
        linkedEntityType: "expectedPayment",
        url: "/payments",
      });
    }

    // Apply eventTypes filter if provided
    let filteredEvents = events;
    if (args.eventTypes && args.eventTypes.length > 0) {
      const typesSet = new Set(args.eventTypes);
      filteredEvents = filteredEvents.filter((e) => typesSet.has(e.eventType));
    }

    // Sort by start date ascending
    filteredEvents.sort((a, b) => a.start.localeCompare(b.start));

    return filteredEvents;
  },
});

/**
 * Create a new calendar event (user-created appointment).
 */
export const createEvent = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    allDay: v.boolean(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    eventType: v.union(
      v.literal("appointment"), v.literal("maintenance"), v.literal("inspection"),
      v.literal("task"), v.literal("compliance"), v.literal("external")
    ),
    linkedPropertyId: v.optional(v.id("properties")),
    linkedParticipantId: v.optional(v.id("participants")),
    attendees: v.optional(v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
      status: v.optional(v.union(
        v.literal("accepted"), v.literal("declined"),
        v.literal("tentative"), v.literal("pending")
      )),
    }))),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const user = await requirePermission(ctx, args.userId, "calendar", "create");

    const eventId = await ctx.db.insert("calendarEvents", {
      organizationId,
      title: args.title,
      startTime: args.startTime,
      endTime: args.endTime,
      allDay: args.allDay,
      description: args.description,
      location: args.location,
      eventType: args.eventType,
      color: EVENT_COLORS[args.eventType] || EVENT_COLORS.appointment,
      linkedPropertyId: args.linkedPropertyId,
      linkedParticipantId: args.linkedParticipantId,
      attendees: args.attendees,
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "calendar_event",
      entityId: eventId as string,
      entityName: args.title,
    });

    return eventId;
  },
});

/**
 * Update an existing calendar event.
 * Only works on calendarEvents table (user-created / external events).
 */
export const updateEvent = mutation({
  args: {
    userId: v.id("users"),
    eventId: v.id("calendarEvents"),
    title: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    allDay: v.optional(v.boolean()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    attendees: v.optional(v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
      status: v.optional(v.union(
        v.literal("accepted"), v.literal("declined"),
        v.literal("tentative"), v.literal("pending")
      )),
    }))),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const user = await requirePermission(ctx, args.userId, "calendar", "update");

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Calendar event not found");
    }
    if (event.organizationId !== organizationId) {
      throw new Error("Access denied: event belongs to a different organization");
    }
    if (event.isDeleted === true) {
      throw new Error("Cannot update a deleted event");
    }

    // Build patch object with only provided fields
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title;
    if (args.startTime !== undefined) patch.startTime = args.startTime;
    if (args.endTime !== undefined) patch.endTime = args.endTime;
    if (args.allDay !== undefined) patch.allDay = args.allDay;
    if (args.description !== undefined) patch.description = args.description;
    if (args.location !== undefined) patch.location = args.location;
    if (args.attendees !== undefined) patch.attendees = args.attendees;

    await ctx.db.patch(args.eventId, patch);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "calendar_event",
      entityId: args.eventId as string,
      entityName: args.title || event.title,
      changes: JSON.stringify(patch),
    });

    return args.eventId;
  },
});

/**
 * Soft-delete a calendar event.
 * Only works on calendarEvents table (user-created / external events).
 */
export const deleteEvent = mutation({
  args: {
    userId: v.id("users"),
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const user = await requirePermission(ctx, args.userId, "calendar", "delete");

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Calendar event not found");
    }
    if (event.organizationId !== organizationId) {
      throw new Error("Access denied: event belongs to a different organization");
    }

    await ctx.db.patch(args.eventId, {
      isDeleted: true,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "delete",
      entityType: "calendar_event",
      entityId: args.eventId as string,
      entityName: event.title,
    });
  },
});

/**
 * Move (reschedule) a calendar event by updating its start and end times.
 * Only works on calendarEvents table -- cannot reschedule internal source events
 * (tasks, maintenance, inspections, etc.) from the calendar.
 */
export const moveEvent = mutation({
  args: {
    userId: v.id("users"),
    eventId: v.id("calendarEvents"),
    newStart: v.string(),
    newEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const user = await requirePermission(ctx, args.userId, "calendar", "update");

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Calendar event not found");
    }
    if (event.organizationId !== organizationId) {
      throw new Error("Access denied: event belongs to a different organization");
    }
    if (event.isDeleted === true) {
      throw new Error("Cannot move a deleted event");
    }

    const previousStart = event.startTime;
    const previousEnd = event.endTime;

    await ctx.db.patch(args.eventId, {
      startTime: args.newStart,
      endTime: args.newEnd,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "calendar_event",
      entityId: args.eventId as string,
      entityName: event.title,
      changes: JSON.stringify({ startTime: args.newStart, endTime: args.newEnd }),
      previousValues: JSON.stringify({ startTime: previousStart, endTime: previousEnd }),
    });

    return args.eventId;
  },
});
