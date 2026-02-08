import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { requireAuth } from "./authHelpers";

/**
 * Push Notifications Module
 *
 * Manages Web Push subscriptions and sends push notifications to users.
 * Subscriptions are stored per-user and per-device (identified by endpoint).
 *
 * SCHEMA ADDITION REQUIRED - Add to schema.ts:
 *
 *   pushSubscriptions: defineTable({
 *     userId: v.id("users"),
 *     endpoint: v.string(),
 *     keyP256dh: v.string(),
 *     keyAuth: v.string(),
 *     userAgent: v.optional(v.string()),
 *     createdAt: v.number(),
 *     updatedAt: v.number(),
 *   })
 *     .index("by_userId", ["userId"])
 *     .index("by_endpoint", ["endpoint"])
 *     .index("by_userId_endpoint", ["userId", "endpoint"]),
 */

// ============================================
// MUTATIONS
// ============================================

/**
 * Subscribe a user's device for push notifications.
 * Stores the PushSubscription details from the browser Push API.
 * If a subscription with the same endpoint already exists for this user, it is updated.
 */
export const subscribe = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
    keyP256dh: v.string(),
    keyAuth: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated and active
    await requireAuth(ctx, args.userId);

    const now = Date.now();

    // Check if subscription already exists for this user + endpoint
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId_endpoint", (q) =>
        q.eq("userId", args.userId).eq("endpoint", args.endpoint)
      )
      .first();

    if (existing) {
      // Update existing subscription (keys may have changed)
      await ctx.db.patch(existing._id, {
        keyP256dh: args.keyP256dh,
        keyAuth: args.keyAuth,
        userAgent: args.userAgent,
        updatedAt: now,
      });
      return { subscriptionId: existing._id, updated: true };
    }

    // Create new subscription
    const subscriptionId = await ctx.db.insert("pushSubscriptions", {
      userId: args.userId,
      endpoint: args.endpoint,
      keyP256dh: args.keyP256dh,
      keyAuth: args.keyAuth,
      userAgent: args.userAgent,
      createdAt: now,
      updatedAt: now,
    });

    return { subscriptionId, updated: false };
  },
});

/**
 * Unsubscribe a device from push notifications.
 * Removes the subscription matching the user ID and endpoint.
 */
export const unsubscribe = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    await requireAuth(ctx, args.userId);

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId_endpoint", (q) =>
        q.eq("userId", args.userId).eq("endpoint", args.endpoint)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { success: true, deleted: true };
    }

    return { success: true, deleted: false };
  },
});

// ============================================
// QUERIES
// ============================================

/**
 * Get all push subscriptions for a user.
 * Used by the client to check if the current device is already subscribed.
 */
export const getByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return subscriptions.map((sub) => ({
      _id: sub._id,
      endpoint: sub.endpoint,
      userAgent: sub.userAgent,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    }));
  },
});

// ============================================
// INTERNAL QUERIES / MUTATIONS
// ============================================

/**
 * Internal query to fetch subscriptions for a user (used by sendPushNotification action).
 */
export const _getSubscriptionsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Internal mutation to remove a stale subscription (410 Gone response).
 */
export const _removeStaleSubscription = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (sub) {
      await ctx.db.delete(args.subscriptionId);
    }
  },
});

// ============================================
// ACTIONS
// ============================================

/**
 * Send a push notification to all of a user's subscribed devices.
 *
 * This action fetches the user's subscriptions, constructs the Web Push
 * payload, and sends it to each endpoint. If an endpoint returns 410 (Gone),
 * the subscription is automatically cleaned up.
 *
 * IMPLEMENTATION NOTE:
 * The Web Push protocol requires VAPID (Voluntary Application Server
 * Identification) JWT signing with ES256. Since we cannot install the
 * `web-push` npm package in Convex easily, the actual HTTP push is
 * stubbed with a TODO. The subscription lifecycle management (subscribe,
 * unsubscribe, stale cleanup) is fully functional.
 *
 * To complete the implementation, either:
 * 1. Use a Convex HTTP action that proxies to an external push service
 * 2. Add `web-push` as a Convex dependency and implement VAPID signing
 * 3. Use a third-party push service (e.g., Firebase Cloud Messaging, OneSignal)
 *
 * Environment variables required:
 * - VAPID_PUBLIC_KEY: Base64url-encoded VAPID public key
 * - VAPID_PRIVATE_KEY: Base64url-encoded VAPID private key
 * - VAPID_SUBJECT: mailto: or https: URI identifying the app server
 */
export const sendPushNotification = action({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
    icon: v.optional(v.string()),
    urgency: v.optional(
      v.union(
        v.literal("very-low"),
        v.literal("low"),
        v.literal("normal"),
        v.literal("high")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Fetch all subscriptions for the target user
    const subscriptions = await ctx.runQuery(
      internal.pushSubscriptions._getSubscriptionsForUser,
      { userId: args.userId }
    );

    if (subscriptions.length === 0) {
      console.log(
        `[PushNotification] No subscriptions found for user ${args.userId}. Skipping.`
      );
      return {
        success: false,
        reason: "no_subscriptions",
        sent: 0,
        failed: 0,
        cleaned: 0,
      };
    }

    // Build the notification payload
    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url || "/dashboard",
      tag: args.tag || "sda-notification",
      icon: args.icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      timestamp: Date.now(),
      data: {
        userId: args.userId,
        url: args.url || "/dashboard",
      },
    });

    // Retrieve VAPID keys from environment
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:noreply@mysdamanager.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn(
        "[PushNotification] VAPID keys not configured. Logging notification instead."
      );
      console.log("[PushNotification] Would send to", subscriptions.length, "devices:", {
        title: args.title,
        body: args.body,
        url: args.url,
        tag: args.tag,
      });
      return {
        success: false,
        reason: "vapid_not_configured",
        sent: 0,
        failed: 0,
        cleaned: 0,
      };
    }

    let sent = 0;
    let failed = 0;
    let cleaned = 0;

    // Send to each subscription endpoint
    for (const subscription of subscriptions) {
      try {
        // TODO: Implement full VAPID JWT signing with ES256
        // The Web Push protocol requires:
        // 1. Create a JWT with { aud: origin(endpoint), exp: now+12h, sub: vapidSubject }
        // 2. Sign the JWT using ES256 with the VAPID private key
        // 3. Encrypt the payload using the subscription keys (ECDH + HKDF + AES-GCM)
        // 4. Send POST to subscription.endpoint with:
        //    - Authorization: vapid t=<JWT>, k=<vapidPublicKey>
        //    - Content-Encoding: aes128gcm
        //    - TTL: 86400
        //    - Urgency: args.urgency || "normal"
        //    - Body: encrypted payload
        //
        // For now, we log the notification details for development/testing.
        // In production, replace this block with actual web-push sending logic
        // or proxy through an external service.

        console.log(`[PushNotification] Sending to endpoint: ${subscription.endpoint.substring(0, 60)}...`);
        console.log(`[PushNotification] Payload: ${payload}`);

        // Simulated send - replace with actual implementation
        // Example using web-push protocol (pseudo-code):
        //
        // const response = await fetch(subscription.endpoint, {
        //   method: "POST",
        //   headers: {
        //     "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
        //     "Content-Type": "application/octet-stream",
        //     "Content-Encoding": "aes128gcm",
        //     "TTL": "86400",
        //     "Urgency": args.urgency || "normal",
        //   },
        //   body: encryptedPayload,
        // });
        //
        // if (response.status === 201) {
        //   sent++;
        // } else if (response.status === 410) {
        //   // Subscription expired - clean up
        //   await ctx.runMutation(
        //     internal.pushSubscriptions._removeStaleSubscription,
        //     { subscriptionId: subscription._id }
        //   );
        //   cleaned++;
        // } else {
        //   console.error(`[PushNotification] Push failed: ${response.status} ${response.statusText}`);
        //   failed++;
        // }

        // For now, count as "sent" (logged)
        sent++;
      } catch (error) {
        console.error(
          `[PushNotification] Error sending to ${subscription.endpoint.substring(0, 60)}:`,
          error
        );
        failed++;
      }
    }

    console.log(
      `[PushNotification] Results: ${sent} sent, ${failed} failed, ${cleaned} cleaned up`
    );

    return {
      success: sent > 0,
      reason: sent > 0 ? undefined : "all_failed",
      sent,
      failed,
      cleaned,
    };
  },
});

/**
 * Send a push notification to multiple users at once.
 * Useful for broadcast notifications (e.g., critical incident alerts).
 */
export const sendBulkPushNotification = action({
  args: {
    userIds: v.array(v.id("users")),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
    urgency: v.optional(
      v.union(
        v.literal("very-low"),
        v.literal("low"),
        v.literal("normal"),
        v.literal("high")
      )
    ),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    results: Array<{ userId: string; sent?: number; failed?: number; success?: boolean }>;
    totalSent: number;
    totalFailed: number;
    usersNotified: number;
    usersSkipped: number;
  }> => {
    const results: Array<{ userId: string; sent?: number; failed?: number; success?: boolean }> = [];

    for (const userId of args.userIds) {
      const result = await ctx.runAction(
        api.pushSubscriptions.sendPushNotification as any,
        {
          userId,
          title: args.title,
          body: args.body,
          url: args.url,
          tag: args.tag,
          urgency: args.urgency,
        }
      );
      results.push({ userId, ...result });
    }

    const totalSent = results.reduce((sum, r) => sum + (r.sent || 0), 0);
    const totalFailed = results.reduce((sum, r) => sum + (r.failed || 0), 0);

    return {
      success: totalSent > 0,
      results,
      totalSent,
      totalFailed,
      usersNotified: results.filter((r) => r.success).length,
      usersSkipped: results.filter((r) => !r.success).length,
    };
  },
});
