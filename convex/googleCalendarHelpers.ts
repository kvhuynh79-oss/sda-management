import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Internal queries and mutations used by googleCalendar.ts actions.
 * Separated into this file because "use node" files can only export actions.
 */

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get a calendar connection by ID. Used by actions to read connection data.
 */
export const getConnectionById = internalQuery({
  args: {
    connectionId: v.id("calendarConnections"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.connectionId);
  },
});

/**
 * Get a calendar event by ID. Used by pushToGoogle to read event data.
 */
export const getEventById = internalQuery({
  args: {
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});

/**
 * Get all enabled Google calendar connections for the sync-all cron.
 */
export const getEnabledGoogleConnections = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("calendarConnections")
      .withIndex("by_syncEnabled", (q) => q.eq("syncEnabled", true))
      .collect()
      .then((connections) =>
        connections.filter((c) => c.provider === "google")
      );
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Update the access token and expiry on a calendar connection.
 */
export const updateConnectionToken = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    accessToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.connectionId, {
      accessToken: args.accessToken,
      expiresAt: args.expiresAt,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update the lastSyncAt timestamp and syncToken on a calendar connection.
 */
export const updateConnectionSync = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    lastSyncAt: v.number(),
    syncToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const patch: Record<string, unknown> = {
      lastSyncAt: args.lastSyncAt,
      updatedAt: Date.now(),
    };
    if (args.syncToken !== undefined) {
      patch.syncToken = args.syncToken;
    }
    await ctx.db.patch(args.connectionId, patch);
  },
});

/**
 * Upsert an external calendar event from Google into the calendarEvents table.
 * If an event with the same externalEventId + externalProvider already exists, update it.
 * Otherwise, insert a new record.
 */
export const upsertExternalEvent = internalMutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    externalEventId: v.string(),
    externalProvider: v.union(v.literal("google"), v.literal("outlook")),
    externalCalendarId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    allDay: v.boolean(),
    location: v.optional(v.string()),
    attendees: v.optional(
      v.array(
        v.object({
          email: v.string(),
          name: v.optional(v.string()),
          status: v.optional(
            v.union(
              v.literal("accepted"),
              v.literal("declined"),
              v.literal("tentative"),
              v.literal("pending")
            )
          ),
        })
      )
    ),
    syncedAt: v.number(),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<Id<"calendarEvents">> => {
    // Check if this external event already exists
    const existing = await ctx.db
      .query("calendarEvents")
      .withIndex("by_externalEventId", (q) =>
        q
          .eq("externalEventId", args.externalEventId)
          .eq("externalProvider", args.externalProvider)
      )
      .first();

    if (existing) {
      // Update existing event
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        startTime: args.startTime,
        endTime: args.endTime,
        allDay: args.allDay,
        location: args.location,
        attendees: args.attendees,
        syncedAt: args.syncedAt,
        updatedAt: Date.now(),
        isDeleted: false, // Un-delete if it was previously soft-deleted
      });
      return existing._id;
    }

    // Insert new event
    const eventId = await ctx.db.insert("calendarEvents", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      allDay: args.allDay,
      location: args.location,
      eventType: "external",
      color: "#6b7280", // gray for external events
      externalEventId: args.externalEventId,
      externalProvider: args.externalProvider,
      externalCalendarId: args.externalCalendarId,
      attendees: args.attendees,
      syncedAt: args.syncedAt,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    return eventId;
  },
});

/**
 * Soft-delete a local calendar event by its external event ID.
 * Used when Google reports an event as cancelled.
 */
export const softDeleteByExternalId = internalMutation({
  args: {
    externalEventId: v.string(),
    externalProvider: v.union(v.literal("google"), v.literal("outlook")),
  },
  handler: async (ctx, args): Promise<void> => {
    const existing = await ctx.db
      .query("calendarEvents")
      .withIndex("by_externalEventId", (q) =>
        q
          .eq("externalEventId", args.externalEventId)
          .eq("externalProvider", args.externalProvider)
      )
      .first();

    if (existing && existing.isDeleted !== true) {
      await ctx.db.patch(existing._id, {
        isDeleted: true,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Update a calendar event's externalEventId after pushing to Google.
 */
export const setExternalEventId = internalMutation({
  args: {
    eventId: v.id("calendarEvents"),
    externalEventId: v.string(),
    externalProvider: v.union(v.literal("google"), v.literal("outlook")),
    externalCalendarId: v.string(),
    syncedAt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.eventId, {
      externalEventId: args.externalEventId,
      externalProvider: args.externalProvider,
      externalCalendarId: args.externalCalendarId,
      syncedAt: args.syncedAt,
      updatedAt: Date.now(),
    });
  },
});
