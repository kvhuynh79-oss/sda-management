/**
 * POST /api/stripe/webhook
 *
 * Stripe Webhook Handler - receives and processes Stripe webhook events
 * for subscription lifecycle management.
 *
 * Security posture:
 * - Authentication: Stripe signature verification (STRIPE_WEBHOOK_SECRET)
 * - Rate limiting: NOT NEEDED - Stripe controls call frequency; signature prevents abuse
 * - CSRF/Origin: EXEMPT - webhook uses cryptographic signature verification, not browser Origin
 * - Input validation: Stripe SDK handles event parsing and signature verification
 * - Env validation: FAIL-FAST - checks STRIPE_WEBHOOK_SECRET + STRIPE_SECRET_KEY +
 *   NEXT_PUBLIC_CONVEX_URL + CONVEX_WEBHOOK_SECRET before any processing (S12 fix)
 * - Idempotency: YES - B3 FIX deduplication via checkWebhookEventProcessed
 *
 * This endpoint is called by Stripe servers and must NOT require user authentication.
 * The Convex webhook secret (CONVEX_WEBHOOK_SECRET) provides a second layer of
 * verification when calling Convex mutations.
 *
 * Handled events:
 * - checkout.session.completed: New subscription created via Checkout
 * - customer.subscription.updated: Plan change, renewal, status change
 * - customer.subscription.deleted: Subscription fully canceled
 * - invoice.payment_failed: Payment attempt failed
 * - invoice.payment_succeeded: Payment succeeded (confirmation/logging)
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Stripe from "stripe";
import { validateRequiredEnvVars } from "../../_lib/envValidation";

// Lazy initialization to avoid build-time errors when env vars are not set.
// These are initialized on first request, not at module import time.
let _stripe: Stripe | null = null;
let _convex: ConvexHttpClient | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return _stripe;
}

function getConvex(): ConvexHttpClient {
  if (!_convex) {
    _convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  }
  return _convex;
}

function getWebhookSecret(): string {
  return process.env.CONVEX_WEBHOOK_SECRET!;
}

/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events. The raw body is required for signature verification.
 */
export async function POST(request: NextRequest) {
  // ─── FAIL-FAST: Environment variable validation (S12 fix) ──────────
  // Check all required env vars BEFORE attempting to process the webhook.
  // This prevents confusing runtime errors from missing configuration
  // and ensures signature verification is always possible.
  const envCheck = validateRequiredEnvVars([
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_CONVEX_URL",
    "CONVEX_WEBHOOK_SECRET",
  ]);
  if (!envCheck.valid) {
    console.error(
      `[CRITICAL] Stripe webhook handler is misconfigured: ${envCheck.error}. ` +
        "Webhook events cannot be processed until these environment variables are set."
    );
    return NextResponse.json(
      { error: "Webhook handler is not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  // Read raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // Verify webhook signature
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Stripe Webhook] Signature verification failed: ${message}`);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    // B3 FIX: Idempotency check - skip already-processed events.
    // This also records the event as "completed" atomically to prevent
    // concurrent duplicate processing from Stripe retries.
    const { alreadyProcessed } = await getConvex().mutation(
      api.stripe.checkWebhookEventProcessed,
      {
        webhookSecret: getWebhookSecret(),
        stripeEventId: event.id,
        eventType: event.type,
      }
    );

    if (alreadyProcessed) {
      console.log(`[Stripe Webhook] Skipping duplicate event: ${event.id}`);
      return NextResponse.json({ received: true, deduplicated: true }, { status: 200 });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[Stripe Webhook] Error processing ${event.type}: ${message}`
    );

    // B3 FIX: Mark event as failed so Stripe retries will be reprocessed
    try {
      await getConvex().mutation(api.stripe.markWebhookEventFailed, {
        webhookSecret: getWebhookSecret(),
        stripeEventId: event.id,
      });
    } catch (markError) {
      console.error(
        `[Stripe Webhook] Failed to mark event ${event.id} as failed:`,
        markError
      );
    }

    // Return 200 to prevent Stripe from retrying on application errors.
    // Returning 5xx would cause exponential retry backoff which could
    // lead to duplicate processing of already-handled events.
    return NextResponse.json(
      { received: true, error: message },
      { status: 200 }
    );
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle checkout.session.completed
 *
 * Fired when a customer completes Stripe Checkout. Links the Stripe customer
 * and subscription IDs to the organization record.
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  const organizationId = session.metadata?.organizationId;
  if (!organizationId) {
    console.error(
      "[Stripe Webhook] checkout.session.completed missing organizationId in metadata"
    );
    return;
  }

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!stripeCustomerId || !stripeSubscriptionId) {
    console.error(
      "[Stripe Webhook] checkout.session.completed missing customer or subscription ID"
    );
    return;
  }

  await getConvex().mutation(api.stripe.handleCheckoutCompleted, {
    webhookSecret: getWebhookSecret(),
    organizationId: organizationId as Id<"organizations">,
    stripeCustomerId,
    stripeSubscriptionId,
  });

  console.log(
    `[Stripe Webhook] Checkout completed: org=${organizationId}, customer=${stripeCustomerId}`
  );
}

/**
 * Handle customer.subscription.updated
 *
 * Fired when a subscription is changed (plan change, renewal, status change,
 * cancel_at_period_end toggled). Syncs the new state into our database.
 */
async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!stripeCustomerId) {
    console.error(
      "[Stripe Webhook] subscription.updated missing customer ID"
    );
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;

  await getConvex().mutation(api.stripe.syncSubscription, {
    webhookSecret: getWebhookSecret(),
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    priceId: priceId ?? undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: subscription.items.data[0]?.current_period_end,
  });
}

/**
 * Handle customer.subscription.deleted
 *
 * Fired when a subscription is fully canceled (past the cancel date).
 */
async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!stripeCustomerId) {
    console.error(
      "[Stripe Webhook] subscription.deleted missing customer ID"
    );
    return;
  }

  await getConvex().mutation(api.stripe.syncSubscription, {
    webhookSecret: getWebhookSecret(),
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    status: "canceled",
    cancelAtPeriodEnd: false,
  });

  console.log(
    `[Stripe Webhook] Subscription deleted for customer: ${stripeCustomerId}`
  );
}

/**
 * Handle invoice.payment_failed
 *
 * Fired when a payment attempt fails. Creates an alert for org admins.
 */
async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  const stripeCustomerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!stripeCustomerId) {
    console.error(
      "[Stripe Webhook] invoice.payment_failed missing customer ID"
    );
    return;
  }

  await getConvex().mutation(api.stripe.handlePaymentFailed, {
    webhookSecret: getWebhookSecret(),
    stripeCustomerId,
    invoiceId: invoice.id,
    attemptCount: invoice.attempt_count ?? 1,
  });
}

/**
 * Handle invoice.payment_succeeded
 *
 * Logged for confirmation. The subscription.updated webhook handles status sync.
 */
async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  const stripeCustomerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  console.log(
    `[Stripe Webhook] Payment succeeded: customer=${stripeCustomerId}, amount=$${((invoice.amount_paid ?? 0) / 100).toFixed(2)}`
  );
}
