import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireTenant, requireAdmin } from "./authHelpers";
import { Id } from "./_generated/dataModel";

/**
 * Webhooks Module - Outbound Webhook Management
 *
 * Allows organizations to configure webhook endpoints that receive
 * real-time notifications when events occur in the system.
 *
 * Security:
 * - All payloads signed with HMAC-SHA256 (X-Webhook-Signature header)
 * - Webhook secrets generated server-side (never transmitted after creation)
 * - 3 retry attempts with exponential backoff
 * - Auto-disable after 10 consecutive failures
 * - Admin-only access for CRUD operations
 */

// ============================================================================
// Supported Event Types
// ============================================================================

export const WEBHOOK_EVENT_TYPES = [
  "participant.created",
  "participant.updated",
  "maintenance.created",
  "maintenance.updated",
  "maintenance.completed",
  "incident.created",
  "incident.resolved",
  "payment.created",
  "document.uploaded",
  "inspection.completed",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

// Event type display labels for UI
export const EVENT_TYPE_LABELS: Record<string, string> = {
  "participant.created": "Participant Created",
  "participant.updated": "Participant Updated",
  "maintenance.created": "Maintenance Request Created",
  "maintenance.updated": "Maintenance Request Updated",
  "maintenance.completed": "Maintenance Request Completed",
  "incident.created": "Incident Created",
  "incident.resolved": "Incident Resolved",
  "payment.created": "Payment Created",
  "document.uploaded": "Document Uploaded",
  "inspection.completed": "Inspection Completed",
};

// Maximum consecutive failures before auto-disabling
const MAX_FAILURE_COUNT = 10;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a cryptographically random secret for HMAC signing.
 * Returns a 64-character hex string (256 bits of entropy).
 */
function generateWebhookSecret(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * HMAC-SHA256 sign a payload string using the Web Crypto API.
 */
async function hmacSign(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all webhooks for the current organization.
 * Returns webhooks with masked secrets (never expose the full secret).
 */
export const getAll = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requireAdmin(ctx, args.userId);

    const webhooks = await ctx.db
      .query("webhooks")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .collect();

    // Never return the actual secret
    return webhooks.map((w) => ({
      _id: w._id,
      url: w.url,
      events: w.events,
      isActive: w.isActive,
      description: w.description,
      createdAt: w.createdAt,
      createdBy: w.createdBy,
      lastTriggeredAt: w.lastTriggeredAt,
      failureCount: w.failureCount,
      lastError: w.lastError,
    }));
  },
});

/**
 * Get a single webhook by ID (with masked secret).
 */
export const getById = query({
  args: {
    userId: v.id("users"),
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requireAdmin(ctx, args.userId);

    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook || webhook.organizationId !== organizationId) {
      return null;
    }

    return {
      _id: webhook._id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      description: webhook.description,
      createdAt: webhook.createdAt,
      createdBy: webhook.createdBy,
      lastTriggeredAt: webhook.lastTriggeredAt,
      failureCount: webhook.failureCount,
      lastError: webhook.lastError,
    };
  },
});

/**
 * Get delivery history for a specific webhook.
 * Returns the most recent 50 deliveries.
 */
export const getDeliveries = query({
  args: {
    userId: v.id("users"),
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requireAdmin(ctx, args.userId);

    // Verify webhook belongs to this org
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook || webhook.organizationId !== organizationId) {
      return [];
    }

    const deliveries = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_webhookId_createdAt", (q) =>
        q.eq("webhookId", args.webhookId)
      )
      .order("desc")
      .take(50);

    return deliveries;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new webhook endpoint.
 * Generates a signing secret automatically. The secret is returned ONCE
 * at creation time - the caller must copy it immediately.
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    url: v.string(),
    events: v.array(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requireAdmin(ctx, args.userId);

    // Validate URL
    if (!args.url.startsWith("https://")) {
      throw new Error("Webhook URL must use HTTPS for security.");
    }

    // Validate event types
    for (const event of args.events) {
      if (!(WEBHOOK_EVENT_TYPES as readonly string[]).includes(event)) {
        throw new Error(`Invalid event type: ${event}`);
      }
    }
    if (args.events.length === 0) {
      throw new Error("At least one event type must be selected.");
    }

    // Generate a signing secret
    const secret = generateWebhookSecret();

    const webhookId = await ctx.db.insert("webhooks", {
      organizationId,
      url: args.url.trim(),
      secret,
      events: args.events,
      isActive: true,
      description: args.description?.trim() || undefined,
      createdAt: Date.now(),
      createdBy: args.userId,
      failureCount: 0,
    });

    // Return the secret once - it will never be exposed again
    return { webhookId, secret };
  },
});

/**
 * Update an existing webhook (URL, events, description).
 * Cannot update the secret - must delete and recreate if needed.
 */
export const update = mutation({
  args: {
    userId: v.id("users"),
    webhookId: v.id("webhooks"),
    url: v.optional(v.string()),
    events: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requireAdmin(ctx, args.userId);

    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new Error("Webhook not found.");
    }

    const updates: Record<string, unknown> = {};

    if (args.url !== undefined) {
      if (!args.url.startsWith("https://")) {
        throw new Error("Webhook URL must use HTTPS for security.");
      }
      updates.url = args.url.trim();
    }

    if (args.events !== undefined) {
      for (const event of args.events) {
        if (!(WEBHOOK_EVENT_TYPES as readonly string[]).includes(event)) {
          throw new Error(`Invalid event type: ${event}`);
        }
      }
      if (args.events.length === 0) {
        throw new Error("At least one event type must be selected.");
      }
      updates.events = args.events;
    }

    if (args.description !== undefined) {
      updates.description = args.description.trim() || undefined;
    }

    if (args.isActive !== undefined) {
      updates.isActive = args.isActive;
      // Reset failure count when re-enabling
      if (args.isActive) {
        updates.failureCount = 0;
        updates.lastError = undefined;
      }
    }

    await ctx.db.patch(args.webhookId, updates);
    return { success: true };
  },
});

/**
 * Delete a webhook and all its delivery history.
 */
export const remove = mutation({
  args: {
    userId: v.id("users"),
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requireAdmin(ctx, args.userId);

    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new Error("Webhook not found.");
    }

    // Delete all delivery records for this webhook
    const deliveries = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_webhookId", (q) => q.eq("webhookId", args.webhookId))
      .collect();

    for (const delivery of deliveries) {
      await ctx.db.delete(delivery._id);
    }

    // Delete the webhook itself
    await ctx.db.delete(args.webhookId);

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (used by actions to record deliveries)
// ============================================================================

/**
 * Get active webhooks for an organization that subscribe to a given event.
 * Internal use only - called from triggerWebhook action.
 */
export const getActiveWebhooksForEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    event: v.string(),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"webhooks">;
    url: string;
    secret: string;
    organizationId: Id<"organizations">;
  }>> => {
    const webhooks = await ctx.db
      .query("webhooks")
      .withIndex("by_organizationId_isActive", (q) =>
        q.eq("organizationId", args.organizationId).eq("isActive", true)
      )
      .collect();

    // Filter to webhooks that subscribe to this event
    return webhooks
      .filter((w) => w.events.includes(args.event))
      .map((w) => ({
        _id: w._id,
        url: w.url,
        secret: w.secret,
        organizationId: w.organizationId,
      }));
  },
});

/**
 * Record a webhook delivery attempt.
 */
export const recordDelivery = internalMutation({
  args: {
    webhookId: v.id("webhooks"),
    organizationId: v.id("organizations"),
    event: v.string(),
    payload: v.string(),
    statusCode: v.optional(v.number()),
    response: v.optional(v.string()),
    success: v.boolean(),
    attemptCount: v.number(),
    error: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.insert("webhookDeliveries", {
      webhookId: args.webhookId,
      organizationId: args.organizationId,
      event: args.event,
      payload: args.payload,
      statusCode: args.statusCode,
      response: args.response,
      success: args.success,
      attemptCount: args.attemptCount,
      error: args.error,
      duration: args.duration,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update webhook status after a delivery attempt (success or failure).
 */
export const updateWebhookStatus = internalMutation({
  args: {
    webhookId: v.id("webhooks"),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) return;

    if (args.success) {
      // Reset failure count on success
      await ctx.db.patch(args.webhookId, {
        lastTriggeredAt: Date.now(),
        failureCount: 0,
        lastError: undefined,
      });
    } else {
      const newFailureCount = webhook.failureCount + 1;
      const updates: Record<string, unknown> = {
        failureCount: newFailureCount,
        lastError: args.error || "Unknown error",
      };

      // Auto-disable after MAX_FAILURE_COUNT consecutive failures
      if (newFailureCount >= MAX_FAILURE_COUNT) {
        updates.isActive = false;
        updates.lastError = `Auto-disabled after ${MAX_FAILURE_COUNT} consecutive failures. Last error: ${args.error || "Unknown error"}`;
      }

      await ctx.db.patch(args.webhookId, updates);
    }
  },
});

// ============================================================================
// ACTIONS (HTTP calls)
// ============================================================================

/**
 * Trigger webhooks for a specific event.
 * This is the main entry point - call this from mutations when events occur.
 *
 * Finds all active webhooks for the organization that subscribe to the event,
 * sends the payload to each, and records delivery results.
 *
 * Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s).
 */
export const triggerWebhook = internalAction({
  args: {
    organizationId: v.id("organizations"),
    event: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args): Promise<void> => {
    // Get all active webhooks for this org + event
    const webhooks = await ctx.runMutation(
      internal.webhooks.getActiveWebhooksForEvent,
      {
        organizationId: args.organizationId,
        event: args.event,
      }
    );

    if (webhooks.length === 0) return;

    // Build the payload JSON
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadBody = JSON.stringify({
      event: args.event,
      timestamp,
      data: args.payload,
    });

    // Deliver to each webhook
    for (const webhook of webhooks) {
      let success = false;
      let lastStatusCode: number | undefined;
      let lastResponse: string | undefined;
      let lastError: string | undefined;
      let attemptCount = 0;
      let totalDuration = 0;

      // Retry loop: 3 attempts with exponential backoff
      for (let attempt = 0; attempt < 3; attempt++) {
        attemptCount = attempt + 1;

        // Exponential backoff: 0s, 1s, 2s
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
          );
        }

        try {
          // Sign the payload with HMAC-SHA256
          const signature = await hmacSign(webhook.secret, payloadBody);

          const startTime = Date.now();
          const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": signature,
              "X-Webhook-Event": args.event,
              "X-Webhook-Timestamp": timestamp,
              "X-Webhook-Id": webhook._id,
              "User-Agent": "MySDAManager-Webhook/1.0",
            },
            body: payloadBody,
            signal: AbortSignal.timeout(10000), // 10s timeout
          });
          totalDuration = Date.now() - startTime;

          lastStatusCode = response.status;
          // Read only first 1000 chars of response
          const responseText = await response.text();
          lastResponse = responseText.substring(0, 1000);

          // Success: 2xx status codes
          if (response.ok) {
            success = true;
            lastError = undefined;
            break;
          } else {
            lastError = `HTTP ${response.status}: ${lastResponse.substring(0, 200)}`;
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          lastStatusCode = undefined;
          lastResponse = undefined;
          totalDuration = 0;
        }
      }

      // Record the delivery
      await ctx.runMutation(internal.webhooks.recordDelivery, {
        webhookId: webhook._id,
        organizationId: webhook.organizationId,
        event: args.event,
        payload: payloadBody,
        statusCode: lastStatusCode,
        response: lastResponse,
        success,
        attemptCount,
        error: lastError,
        duration: totalDuration > 0 ? totalDuration : undefined,
      });

      // Update webhook status (failure count / last triggered)
      await ctx.runMutation(internal.webhooks.updateWebhookStatus, {
        webhookId: webhook._id,
        success,
        error: lastError,
      });
    }
  },
});

/**
 * Send a test payload to a webhook endpoint.
 * Used by the UI to verify the endpoint is reachable before going live.
 */
export const testWebhook = action({
  args: {
    userId: v.id("users"),
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    statusCode?: number;
    response?: string;
    error?: string;
    duration?: number;
  }> => {
    // Get the webhook (including secret for signing)
    const webhookData = await ctx.runMutation(
      internal.webhooks.getWebhookForTest,
      {
        userId: args.userId,
        webhookId: args.webhookId,
      }
    );

    if (!webhookData) {
      return { success: false, error: "Webhook not found or access denied." };
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const testPayload = JSON.stringify({
      event: "webhook.test",
      timestamp,
      data: {
        message: "This is a test webhook delivery from MySDAManager.",
        webhookId: args.webhookId,
        timestamp: new Date().toISOString(),
      },
    });

    try {
      const signature = await hmacSign(webhookData.secret, testPayload);

      const startTime = Date.now();
      const response = await fetch(webhookData.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": "webhook.test",
          "X-Webhook-Timestamp": timestamp,
          "X-Webhook-Id": args.webhookId,
          "User-Agent": "MySDAManager-Webhook/1.0",
        },
        body: testPayload,
        signal: AbortSignal.timeout(10000),
      });
      const duration = Date.now() - startTime;

      const responseText = await response.text();
      const truncatedResponse = responseText.substring(0, 1000);

      // Record the test delivery
      await ctx.runMutation(internal.webhooks.recordDelivery, {
        webhookId: args.webhookId,
        organizationId: webhookData.organizationId,
        event: "webhook.test",
        payload: testPayload,
        statusCode: response.status,
        response: truncatedResponse,
        success: response.ok,
        attemptCount: 1,
        error: response.ok ? undefined : `HTTP ${response.status}`,
        duration,
      });

      return {
        success: response.ok,
        statusCode: response.status,
        response: truncatedResponse,
        duration,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Record the failed test delivery
      await ctx.runMutation(internal.webhooks.recordDelivery, {
        webhookId: args.webhookId,
        organizationId: webhookData.organizationId,
        event: "webhook.test",
        payload: testPayload,
        success: false,
        attemptCount: 1,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});

/**
 * Internal mutation to get webhook data for test action.
 * Validates user has admin access and returns the secret.
 */
export const getWebhookForTest = internalMutation({
  args: {
    userId: v.id("users"),
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args): Promise<{
    url: string;
    secret: string;
    organizationId: Id<"organizations">;
  } | null> => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requireAdmin(ctx, args.userId);

    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook || webhook.organizationId !== organizationId) {
      return null;
    }

    return {
      url: webhook.url,
      secret: webhook.secret,
      organizationId: webhook.organizationId,
    };
  },
});
