"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Google Calendar API base URL
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// ============================================
// INTERNAL ACTIONS (HTTP calls to Google APIs)
// ============================================

/**
 * Refresh an expired Google access token using the refresh token.
 * Updates the connection record with the new token and returns it.
 */
export const refreshGoogleToken = internalAction({
  args: {
    connectionId: v.id("calendarConnections"),
  },
  handler: async (ctx, args): Promise<string> => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured");
    }

    // Read the connection to get the refresh token
    const connection = await ctx.runQuery(
      internal.googleCalendarHelpers.getConnectionById,
      { connectionId: args.connectionId }
    );

    if (!connection) {
      throw new Error(`Calendar connection ${args.connectionId} not found`);
    }

    if (!connection.refreshToken) {
      throw new Error("No refresh token available - user must re-authorize");
    }

    // Request a new access token from Google
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google token refresh failed:", response.status, errorText);
      throw new Error(`Failed to refresh Google token: ${response.status}`);
    }

    const tokenData = await response.json();
    const newAccessToken: string = tokenData.access_token;
    const expiresIn: number = tokenData.expires_in || 3600;
    const newExpiresAt = Date.now() + expiresIn * 1000;

    // Update the connection with new token
    await ctx.runMutation(internal.googleCalendarHelpers.updateConnectionToken, {
      connectionId: args.connectionId,
      accessToken: newAccessToken,
      expiresAt: newExpiresAt,
    });

    return newAccessToken;
  },
});

/**
 * Pull events from Google Calendar into the local calendarEvents table.
 * Supports incremental sync via syncToken and full sync via time range.
 */
export const syncFromGoogle = internalAction({
  args: {
    connectionId: v.id("calendarConnections"),
  },
  handler: async (ctx, args): Promise<{ synced: number; deleted: number }> => {
    // Get the connection details
    const connection = await ctx.runQuery(
      internal.googleCalendarHelpers.getConnectionById,
      { connectionId: args.connectionId }
    );

    if (!connection) {
      throw new Error(`Calendar connection ${args.connectionId} not found`);
    }

    // Get a valid access token (refresh if expired)
    let accessToken = connection.accessToken;
    if (connection.expiresAt < Date.now()) {
      accessToken = await ctx.runAction(internal.googleCalendar.refreshGoogleToken, {
        connectionId: args.connectionId,
      });
    }

    const calendarId = connection.calendarId || "primary";
    let synced = 0;
    let deleted = 0;
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    // Determine sync strategy: incremental (syncToken) or full (time range)
    const useSyncToken = !!connection.syncToken;

    do {
      // Build the API URL
      const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`);

      if (useSyncToken && !pageToken) {
        // Incremental sync using syncToken from previous sync
        url.searchParams.set("syncToken", connection.syncToken!);
      } else if (!useSyncToken && !pageToken) {
        // Full sync: past 30 days to future 90 days
        const now = new Date();
        const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        url.searchParams.set("timeMin", timeMin.toISOString());
        url.searchParams.set("timeMax", timeMax.toISOString());
        url.searchParams.set("singleEvents", "true");
      }

      url.searchParams.set("maxResults", "250");

      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (response.status === 410) {
        // 410 Gone means the syncToken is no longer valid.
        // Must do a full sync. Clear the syncToken and re-run.
        console.warn("Google Calendar syncToken expired (410 Gone). Clearing and re-syncing.");
        await ctx.runMutation(internal.googleCalendarHelpers.updateConnectionSync, {
          connectionId: args.connectionId,
          lastSyncAt: Date.now(),
          syncToken: undefined,
        });
        // Re-run as a full sync
        return await ctx.runAction(internal.googleCalendar.syncFromGoogle, {
          connectionId: args.connectionId,
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Calendar API error:", response.status, errorText);
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();

      // Process each event
      const items: GoogleCalendarEvent[] = data.items || [];
      for (const item of items) {
        if (item.status === "cancelled") {
          // Event was deleted on Google - soft delete locally
          if (item.id) {
            await ctx.runMutation(internal.googleCalendarHelpers.softDeleteByExternalId, {
              externalEventId: item.id,
              externalProvider: "google",
            });
            deleted++;
          }
          continue;
        }

        // Map Google event fields to our calendarEvents schema
        const allDay = !!item.start?.date;
        const startTime = allDay
          ? `${item.start!.date}T00:00:00`
          : item.start?.dateTime || new Date().toISOString();
        const endTime = allDay
          ? `${item.end?.date || item.start!.date}T23:59:59`
          : item.end?.dateTime || startTime;

        // Map attendee response status to our enum
        const attendees = item.attendees?.map((a) => ({
          email: a.email || "",
          name: a.displayName,
          status: mapAttendeeStatus(a.responseStatus),
        }));

        await ctx.runMutation(internal.googleCalendarHelpers.upsertExternalEvent, {
          organizationId: connection.organizationId || undefined,
          externalEventId: item.id || "",
          externalProvider: "google",
          externalCalendarId: calendarId,
          title: item.summary || "(No title)",
          description: item.description,
          startTime,
          endTime,
          allDay,
          location: item.location,
          attendees,
          syncedAt: Date.now(),
          createdBy: connection.userId,
        });
        synced++;
      }

      // Pagination
      pageToken = data.nextPageToken;
      if (data.nextSyncToken) {
        nextSyncToken = data.nextSyncToken;
      }
    } while (pageToken);

    // Save the new syncToken and lastSyncAt
    await ctx.runMutation(internal.googleCalendarHelpers.updateConnectionSync, {
      connectionId: args.connectionId,
      lastSyncAt: Date.now(),
      syncToken: nextSyncToken,
    });

    console.log(`Google Calendar sync complete: ${synced} upserted, ${deleted} deleted`);
    return { synced, deleted };
  },
});

/**
 * Push a local calendar event to Google Calendar.
 * Creates a new event or updates an existing one if externalEventId is set.
 */
export const pushToGoogle = internalAction({
  args: {
    connectionId: v.id("calendarConnections"),
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, args): Promise<string> => {
    // Get the connection
    const connection = await ctx.runQuery(
      internal.googleCalendarHelpers.getConnectionById,
      { connectionId: args.connectionId }
    );

    if (!connection) {
      throw new Error(`Calendar connection ${args.connectionId} not found`);
    }

    // Get a valid access token
    let accessToken = connection.accessToken;
    if (connection.expiresAt < Date.now()) {
      accessToken = await ctx.runAction(internal.googleCalendar.refreshGoogleToken, {
        connectionId: args.connectionId,
      });
    }

    // Get the event data
    const event = await ctx.runQuery(
      internal.googleCalendarHelpers.getEventById,
      { eventId: args.eventId }
    );

    if (!event) {
      throw new Error(`Calendar event ${args.eventId} not found`);
    }

    const calendarId = connection.calendarId || "primary";

    // Build Google Calendar event body
    const googleEvent: GoogleCalendarEventBody = {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
    };

    if (event.allDay) {
      // All-day events use date (YYYY-MM-DD) format
      const startDate = event.startTime.substring(0, 10);
      const endDate = event.endTime.substring(0, 10);
      // Google all-day end dates are exclusive, so add one day
      const endDateExclusive = addOneDay(endDate);
      googleEvent.start = { date: startDate };
      googleEvent.end = { date: endDateExclusive };
    } else {
      // Timed events use dateTime (ISO 8601)
      googleEvent.start = { dateTime: event.startTime };
      googleEvent.end = { dateTime: event.endTime };
    }

    if (event.attendees && event.attendees.length > 0) {
      googleEvent.attendees = event.attendees.map((a) => ({
        email: a.email,
        displayName: a.name,
      }));
    }

    let method: string;
    let url: string;

    if (event.externalEventId) {
      // Update existing event
      method = "PATCH";
      url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.externalEventId)}`;
    } else {
      // Create new event
      method = "POST";
      url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(googleEvent),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Calendar ${method} error:`, response.status, errorText);
      throw new Error(`Failed to ${method === "POST" ? "create" : "update"} Google Calendar event: ${response.status}`);
    }

    const responseData = await response.json();
    const externalEventId: string = responseData.id;

    // Save the externalEventId back to the local event
    if (!event.externalEventId) {
      await ctx.runMutation(internal.googleCalendarHelpers.setExternalEventId, {
        eventId: args.eventId,
        externalEventId,
        externalProvider: "google",
        externalCalendarId: calendarId,
        syncedAt: Date.now(),
      });
    }

    return externalEventId;
  },
});

/**
 * Delete an event from Google Calendar by its external event ID.
 */
export const deleteFromGoogle = internalAction({
  args: {
    connectionId: v.id("calendarConnections"),
    externalEventId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    // Get the connection
    const connection = await ctx.runQuery(
      internal.googleCalendarHelpers.getConnectionById,
      { connectionId: args.connectionId }
    );

    if (!connection) {
      throw new Error(`Calendar connection ${args.connectionId} not found`);
    }

    // Get a valid access token
    let accessToken = connection.accessToken;
    if (connection.expiresAt < Date.now()) {
      accessToken = await ctx.runAction(internal.googleCalendar.refreshGoogleToken, {
        connectionId: args.connectionId,
      });
    }

    const calendarId = connection.calendarId || "primary";
    const url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(args.externalEventId)}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 204 No Content = success, 410 Gone = already deleted
    if (!response.ok && response.status !== 204 && response.status !== 410) {
      const errorText = await response.text();
      console.error("Google Calendar DELETE error:", response.status, errorText);
      throw new Error(`Failed to delete Google Calendar event: ${response.status}`);
    }
  },
});

/**
 * Sync all enabled Google Calendar connections.
 * Called by the cron job. Processes connections in batches of 5.
 */
export const syncAllGoogleConnections = internalAction({
  args: {},
  handler: async (ctx): Promise<{ total: number; succeeded: number; failed: number }> => {
    // Get all enabled Google connections
    const connections = await ctx.runQuery(
      internal.googleCalendarHelpers.getEnabledGoogleConnections,
      {}
    );

    let succeeded = 0;
    let failed = 0;
    const batchSize = 5;

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < connections.length; i += batchSize) {
      const batch = connections.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((conn) =>
          ctx.runAction(internal.googleCalendar.syncFromGoogle, {
            connectionId: conn._id,
          })
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          succeeded++;
        } else {
          failed++;
          console.error("Google Calendar sync failed for a connection:", result.reason);
        }
      }
    }

    console.log(`Google Calendar sync all: ${succeeded}/${connections.length} succeeded, ${failed} failed`);
    return { total: connections.length, succeeded, failed };
  },
});

// ============================================
// HELPER TYPES & FUNCTIONS
// ============================================

/** Google Calendar API event shape (subset of fields we use) */
interface GoogleCalendarEvent {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

/** Google Calendar API event body for creating/updating */
interface GoogleCalendarEventBody {
  summary: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
}

/**
 * Map Google attendee response status to our enum.
 */
function mapAttendeeStatus(
  googleStatus?: string
): "accepted" | "declined" | "tentative" | "pending" | undefined {
  switch (googleStatus) {
    case "accepted":
      return "accepted";
    case "declined":
      return "declined";
    case "tentative":
      return "tentative";
    case "needsAction":
      return "pending";
    default:
      return undefined;
  }
}

/**
 * Add one day to a YYYY-MM-DD date string (for Google all-day end dates which are exclusive).
 */
function addOneDay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().substring(0, 10);
}
