import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { encryptField, decryptField } from "./lib/encryption";

// Decrypt OAuth tokens in a calendar connection record
async function decryptConnectionTokens<T extends Record<string, any>>(c: T): Promise<T> {
  const [accessToken, refreshToken] = await Promise.all([
    decryptField(c.accessToken),
    decryptField(c.refreshToken),
  ]);
  return {
    ...c,
    accessToken: accessToken ?? c.accessToken,
    refreshToken: refreshToken ?? c.refreshToken,
  };
}

// ============================================
// INTERNAL QUERIES (for outlookCalendar actions to read DB)
// ============================================

/**
 * Get a calendar connection by ID.
 * Decrypts OAuth tokens before returning so actions can use them for API calls.
 */
export const getConnection = internalQuery({
  args: { connectionId: v.id("calendarConnections") },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) return null;
    return decryptConnectionTokens(connection);
  },
});

/**
 * Get all active Outlook connections for sync.
 * Note: Does NOT decrypt tokens here (each sync call reads via getConnection which decrypts).
 */
export const getActiveOutlookConnections = internalQuery({
  args: {},
  handler: async (ctx) => {
    const connections = await ctx.db
      .query("calendarConnections")
      .withIndex("by_syncEnabled", (q) => q.eq("syncEnabled", true))
      .collect();

    return connections.filter((c) => c.provider === "outlook");
  },
});

// ============================================
// INTERNAL MUTATIONS (for outlookCalendar actions to write DB)
// ============================================

/**
 * Update connection access token after refresh.
 * Encrypts both tokens before storing.
 */
export const updateConnectionToken = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const [encAccessToken, encRefreshToken] = await Promise.all([
      encryptField(args.accessToken),
      encryptField(args.refreshToken),
    ]);
    await ctx.db.patch(args.connectionId, {
      accessToken: encAccessToken ?? args.accessToken,
      refreshToken: encRefreshToken ?? args.refreshToken,
      expiresAt: args.expiresAt,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update connection sync metadata after a sync run.
 */
export const updateConnectionSync = internalMutation({
  args: {
    connectionId: v.id("calendarConnections"),
    lastSyncAt: v.number(),
    syncToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: args.lastSyncAt,
      syncToken: args.syncToken,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Upsert an external calendar event from Outlook.
 * Matches by externalEventId + externalProvider to avoid duplicates.
 */
export const upsertExternalEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    externalEventId: v.string(),
    externalProvider: v.literal("outlook"),
    externalCalendarId: v.optional(v.string()),
    title: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    allDay: v.boolean(),
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
    syncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check for existing event by externalEventId + provider
    const existing = await ctx.db
      .query("calendarEvents")
      .withIndex("by_externalEventId", (q) =>
        q.eq("externalEventId", args.externalEventId).eq("externalProvider", args.externalProvider)
      )
      .first();

    if (existing) {
      // Update existing event
      await ctx.db.patch(existing._id, {
        title: args.title,
        startTime: args.startTime,
        endTime: args.endTime,
        allDay: args.allDay,
        description: args.description,
        location: args.location,
        attendees: args.attendees,
        syncedAt: args.syncedAt,
        updatedAt: Date.now(),
        isDeleted: false, // Un-delete if it was previously removed
      });
      return existing._id;
    } else {
      // Create new external event
      const eventId = await ctx.db.insert("calendarEvents", {
        organizationId: args.organizationId,
        title: args.title,
        startTime: args.startTime,
        endTime: args.endTime,
        allDay: args.allDay,
        description: args.description,
        location: args.location,
        eventType: "external",
        externalEventId: args.externalEventId,
        externalProvider: args.externalProvider,
        externalCalendarId: args.externalCalendarId,
        attendees: args.attendees,
        syncedAt: args.syncedAt,
        createdAt: Date.now(),
      });
      return eventId;
    }
  },
});

/**
 * Soft-delete an external event that was removed from Outlook.
 */
export const softDeleteExternalEvent = internalMutation({
  args: {
    externalEventId: v.string(),
    externalProvider: v.literal("outlook"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("calendarEvents")
      .withIndex("by_externalEventId", (q) =>
        q.eq("externalEventId", args.externalEventId).eq("externalProvider", args.externalProvider)
      )
      .first();

    if (existing && existing.organizationId === args.organizationId) {
      await ctx.db.patch(existing._id, {
        isDeleted: true,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Set the external event ID on a local event after pushing to Outlook.
 */
export const setExternalEventId = internalMutation({
  args: {
    eventId: v.id("calendarEvents"),
    externalEventId: v.string(),
    externalProvider: v.literal("outlook"),
    syncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      externalEventId: args.externalEventId,
      externalProvider: args.externalProvider,
      syncedAt: args.syncedAt,
      updatedAt: Date.now(),
    });
  },
});
