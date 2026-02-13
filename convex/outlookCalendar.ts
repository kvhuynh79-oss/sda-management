"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Microsoft Graph API endpoints
const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MS_GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// Scopes must match the OAuth connect route
const SCOPES = "Calendars.ReadWrite offline_access User.Read";

// Microsoft Graph event shape (subset of fields we care about)
interface MsGraphEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  bodyPreview?: string;
  location?: { displayName?: string };
  attendees?: Array<{
    emailAddress: { address: string; name?: string };
    status?: { response?: string };
  }>;
  isCancelled?: boolean;
}

interface MsGraphDeltaResponse {
  value: (MsGraphEvent & { "@removed"?: { reason: string } })[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

// ============================================
// TOKEN REFRESH
// ============================================

/**
 * Refresh an expired Microsoft access token using the refresh token.
 */
export const refreshOutlookToken = internalAction({
  args: {
    connectionId: v.id("calendarConnections"),
  },
  handler: async (ctx, args): Promise<{ accessToken: string; expiresAt: number }> => {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must be configured");
    }

    // Read the connection to get the current refresh token
    const connection = await ctx.runQuery(internal.outlookCalendarDb.getConnection, {
      connectionId: args.connectionId,
    });
    if (!connection) {
      throw new Error("Calendar connection not found");
    }

    const response = await fetch(MS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refreshToken,
        grant_type: "refresh_token",
        scope: SCOPES,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Microsoft token refresh failed:", response.status, errorText);
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    const expiresAt = Date.now() + data.expires_in * 1000;

    // Update the stored token
    await ctx.runMutation(internal.outlookCalendarDb.updateConnectionToken, {
      connectionId: args.connectionId,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || connection.refreshToken,
      expiresAt,
    });

    return { accessToken: data.access_token, expiresAt };
  },
});

// ============================================
// SYNC FROM OUTLOOK (PULL)
// ============================================

/**
 * Pull events from Outlook Calendar into local calendarEvents table.
 * Uses Microsoft Graph delta sync for incremental updates after initial full sync.
 */
export const syncFromOutlook = internalAction({
  args: {
    connectionId: v.id("calendarConnections"),
  },
  handler: async (ctx, args): Promise<{ synced: number; deleted: number }> => {
    // Get the connection details
    const connection = await ctx.runQuery(internal.outlookCalendarDb.getConnection, {
      connectionId: args.connectionId,
    });
    if (!connection) {
      throw new Error("Calendar connection not found");
    }
    if (!connection.syncEnabled) {
      return { synced: 0, deleted: 0 };
    }

    // Get a valid access token (refresh if expired)
    let accessToken = connection.accessToken;
    if (connection.expiresAt < Date.now() - 60_000) {
      // Token expired or expiring within 60 seconds
      const refreshed = await ctx.runAction(internal.outlookCalendar.refreshOutlookToken, {
        connectionId: args.connectionId,
      });
      accessToken = refreshed.accessToken;
    }

    let synced = 0;
    let deleted = 0;
    let deltaLink: string | undefined;

    let needsFullSync = !connection.syncToken;

    if (connection.syncToken) {
      // Attempt incremental delta sync using stored deltaLink
      try {
        const result = await fetchDeltaEvents(accessToken, connection.syncToken);
        for (const event of result.events) {
          if (event.removed) {
            // Soft-delete local copy
            await ctx.runMutation(internal.outlookCalendarDb.softDeleteExternalEvent, {
              externalEventId: event.id,
              externalProvider: "outlook",
              organizationId: connection.organizationId as Id<"organizations">,
            });
            deleted++;
          } else {
            await ctx.runMutation(internal.outlookCalendarDb.upsertExternalEvent, {
              organizationId: connection.organizationId as Id<"organizations">,
              externalEventId: event.id,
              externalProvider: "outlook",
              externalCalendarId: connection.calendarId,
              title: event.subject || "(No subject)",
              startTime: convertMsDateTime(event.start.dateTime, event.start.timeZone),
              endTime: convertMsDateTime(event.end.dateTime, event.end.timeZone),
              allDay: event.isAllDay,
              description: event.bodyPreview,
              location: event.location?.displayName,
              attendees: mapAttendees(event.attendees),
              syncedAt: Date.now(),
            });
            synced++;
          }
        }
        deltaLink = result.deltaLink;
      } catch (deltaError: unknown) {
        // If delta token expired, fall back to full sync
        const errorMessage = deltaError instanceof Error ? deltaError.message : String(deltaError);
        if (errorMessage === "DELTA_TOKEN_EXPIRED") {
          console.warn("Delta token expired for connection", args.connectionId, "- falling back to full sync");
          needsFullSync = true;
        } else {
          throw deltaError;
        }
      }
    }

    if (needsFullSync) {
      // Full initial sync: past 30 days to future 90 days
      const now = new Date();
      const startDateTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDateTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const result = await fetchCalendarViewWithDelta(accessToken, startDateTime, endDateTime);
      for (const event of result.events) {
        await ctx.runMutation(internal.outlookCalendarDb.upsertExternalEvent, {
          organizationId: connection.organizationId as Id<"organizations">,
          externalEventId: event.id,
          externalProvider: "outlook",
          externalCalendarId: connection.calendarId,
          title: event.subject || "(No subject)",
          startTime: convertMsDateTime(event.start.dateTime, event.start.timeZone),
          endTime: convertMsDateTime(event.end.dateTime, event.end.timeZone),
          allDay: event.isAllDay,
          description: event.bodyPreview,
          location: event.location?.displayName,
          attendees: mapAttendees(event.attendees),
          syncedAt: Date.now(),
        });
        synced++;
      }
      deltaLink = result.deltaLink;
    }

    // Update connection with sync metadata
    await ctx.runMutation(internal.outlookCalendarDb.updateConnectionSync, {
      connectionId: args.connectionId,
      lastSyncAt: Date.now(),
      syncToken: deltaLink,
    });

    return { synced, deleted };
  },
});

// ============================================
// PUSH TO OUTLOOK (CREATE / UPDATE)
// ============================================

/**
 * Push a local calendar event to Outlook Calendar.
 * Creates a new event or updates an existing one.
 */
export const pushToOutlook = internalAction({
  args: {
    connectionId: v.id("calendarConnections"),
    eventId: v.id("calendarEvents"),
    title: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    allDay: v.boolean(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    externalEventId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ externalEventId: string }> => {
    const connection = await ctx.runQuery(internal.outlookCalendarDb.getConnection, {
      connectionId: args.connectionId,
    });
    if (!connection) {
      throw new Error("Calendar connection not found");
    }

    // Get a valid access token
    let accessToken = connection.accessToken;
    if (connection.expiresAt < Date.now() - 60_000) {
      const refreshed = await ctx.runAction(internal.outlookCalendar.refreshOutlookToken, {
        connectionId: args.connectionId,
      });
      accessToken = refreshed.accessToken;
    }

    // Build Microsoft Graph event body
    const msEvent = buildMsGraphEventBody(
      args.title,
      args.startTime,
      args.endTime,
      args.allDay,
      args.description,
      args.location
    );

    let externalEventId: string;

    if (args.externalEventId) {
      // Update existing event
      const response = await fetch(
        `${MS_GRAPH_BASE}/me/events/${args.externalEventId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(msEvent),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Outlook event update failed:", response.status, errorText);
        throw new Error(`Failed to update Outlook event: ${response.status}`);
      }

      const updatedEvent = await response.json();
      externalEventId = updatedEvent.id;
    } else {
      // Create new event
      const response = await fetch(`${MS_GRAPH_BASE}/me/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(msEvent),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Outlook event creation failed:", response.status, errorText);
        throw new Error(`Failed to create Outlook event: ${response.status}`);
      }

      const createdEvent = await response.json();
      externalEventId = createdEvent.id;
    }

    // Update local event with external ID
    await ctx.runMutation(internal.outlookCalendarDb.setExternalEventId, {
      eventId: args.eventId,
      externalEventId,
      externalProvider: "outlook",
      syncedAt: Date.now(),
    });

    return { externalEventId };
  },
});

// ============================================
// DELETE FROM OUTLOOK
// ============================================

/**
 * Delete an event from Outlook Calendar.
 */
export const deleteFromOutlook = internalAction({
  args: {
    connectionId: v.id("calendarConnections"),
    externalEventId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const connection = await ctx.runQuery(internal.outlookCalendarDb.getConnection, {
      connectionId: args.connectionId,
    });
    if (!connection) {
      throw new Error("Calendar connection not found");
    }

    // Get a valid access token
    let accessToken = connection.accessToken;
    if (connection.expiresAt < Date.now() - 60_000) {
      const refreshed = await ctx.runAction(internal.outlookCalendar.refreshOutlookToken, {
        connectionId: args.connectionId,
      });
      accessToken = refreshed.accessToken;
    }

    const response = await fetch(
      `${MS_GRAPH_BASE}/me/events/${args.externalEventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // 204 = success, 404 = already deleted (both are fine)
    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      console.error("Outlook event deletion failed:", response.status, errorText);
      throw new Error(`Failed to delete Outlook event: ${response.status}`);
    }
  },
});

// ============================================
// SYNC ALL CONNECTIONS (CRON TARGET)
// ============================================

/**
 * Sync all active Outlook connections. Called by cron job.
 * Processes in batches of 5 to avoid overwhelming the API.
 */
export const syncAllOutlookConnections = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; errors: number }> => {
    const connections = await ctx.runQuery(
      internal.outlookCalendarDb.getActiveOutlookConnections,
      {}
    );

    let processed = 0;
    let errors = 0;
    const batchSize = 5;

    for (let i = 0; i < connections.length; i += batchSize) {
      const batch = connections.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map((conn) =>
          ctx.runAction(internal.outlookCalendar.syncFromOutlook, {
            connectionId: conn._id,
          })
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          processed++;
        } else {
          errors++;
          console.error("Outlook sync error:", result.reason);
        }
      }
    }

    return { processed, errors };
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert Microsoft Graph dateTime + timeZone into ISO 8601 string.
 * Microsoft returns format like "2026-02-13T09:00:00.0000000" with a separate timeZone.
 * We normalize to a clean ISO datetime string.
 */
function convertMsDateTime(dateTime: string, _timeZone: string): string {
  // Microsoft dateTime format: "2026-02-13T09:00:00.0000000"
  // Strip trailing fractional seconds beyond milliseconds for clean ISO
  const cleaned = dateTime.replace(/\.(\d{3})\d*$/, ".$1");
  // If no fractional part, just return as-is (already clean)
  if (cleaned.includes(".")) {
    return cleaned;
  }
  return dateTime.substring(0, 19); // "2026-02-13T09:00:00"
}

/**
 * Map Microsoft Graph attendees to our schema format.
 */
function mapAttendees(
  msAttendees?: MsGraphEvent["attendees"]
): Array<{ email: string; name?: string; status?: "accepted" | "declined" | "tentative" | "pending" }> | undefined {
  if (!msAttendees || msAttendees.length === 0) return undefined;

  return msAttendees.map((a) => {
    const mapped: { email: string; name?: string; status?: "accepted" | "declined" | "tentative" | "pending" } = {
      email: a.emailAddress.address,
    };
    if (a.emailAddress.name) {
      mapped.name = a.emailAddress.name;
    }
    if (a.status?.response) {
      const responseMap: Record<string, "accepted" | "declined" | "tentative" | "pending"> = {
        accepted: "accepted",
        declined: "declined",
        tentativelyAccepted: "tentative",
        notResponded: "pending",
        none: "pending",
        organizer: "accepted",
      };
      mapped.status = responseMap[a.status.response] || "pending";
    }
    return mapped;
  });
}

/**
 * Build a Microsoft Graph event body for POST/PATCH requests.
 */
function buildMsGraphEventBody(
  title: string,
  startTime: string,
  endTime: string,
  allDay: boolean,
  description?: string,
  location?: string
): Record<string, unknown> {
  const event: Record<string, unknown> = {
    subject: title,
    start: {
      dateTime: startTime,
      timeZone: "UTC",
    },
    end: {
      dateTime: endTime,
      timeZone: "UTC",
    },
    isAllDay: allDay,
  };

  if (description) {
    event.body = {
      contentType: "text",
      content: description,
    };
  }

  if (location) {
    event.location = {
      displayName: location,
    };
  }

  return event;
}

/**
 * Fetch calendar events using the delta API for incremental sync.
 * Uses the stored deltaLink from a previous sync.
 */
async function fetchDeltaEvents(
  accessToken: string,
  deltaLink: string
): Promise<{ events: Array<MsGraphEvent & { removed: boolean }>; deltaLink?: string }> {
  const allEvents: Array<MsGraphEvent & { removed: boolean }> = [];
  let nextUrl: string | undefined = deltaLink;
  let newDeltaLink: string | undefined;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'odata.maxpagesize=50',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If delta token is expired/invalid, caller should fall back to full sync
      if (response.status === 410) {
        console.warn("Delta token expired, full sync required");
        throw new Error("DELTA_TOKEN_EXPIRED");
      }
      console.error("Delta sync failed:", response.status, errorText);
      throw new Error(`Delta sync failed: ${response.status}`);
    }

    const data: MsGraphDeltaResponse = await response.json();

    for (const item of data.value) {
      if (item["@removed"]) {
        allEvents.push({ ...item, removed: true });
      } else {
        allEvents.push({ ...item, removed: false });
      }
    }

    nextUrl = data["@odata.nextLink"];
    if (data["@odata.deltaLink"]) {
      newDeltaLink = data["@odata.deltaLink"];
    }
  }

  return { events: allEvents, deltaLink: newDeltaLink };
}

/**
 * Fetch full calendar view with delta tracking for initial sync.
 * Uses the calendarView endpoint to get all events in a date range,
 * then follows pagination and captures the deltaLink.
 */
async function fetchCalendarViewWithDelta(
  accessToken: string,
  startDateTime: string,
  endDateTime: string
): Promise<{ events: MsGraphEvent[]; deltaLink?: string }> {
  const allEvents: MsGraphEvent[] = [];
  const selectFields = "subject,start,end,isAllDay,bodyPreview,location,attendees,isCancelled";

  // Use calendarView/delta for initial sync to get a deltaLink for future incremental syncs
  let nextUrl: string | undefined =
    `${MS_GRAPH_BASE}/me/calendarView/delta?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&$select=${selectFields}`;
  let deltaLink: string | undefined;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'odata.maxpagesize=50',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Calendar view fetch failed:", response.status, errorText);
      throw new Error(`Calendar view fetch failed: ${response.status}`);
    }

    const data: MsGraphDeltaResponse = await response.json();

    for (const item of data.value) {
      // Skip cancelled events on initial sync
      if (item.isCancelled) continue;
      if (!item["@removed"]) {
        allEvents.push(item);
      }
    }

    nextUrl = data["@odata.nextLink"];
    if (data["@odata.deltaLink"]) {
      deltaLink = data["@odata.deltaLink"];
    }
  }

  return { events: allEvents, deltaLink };
}
