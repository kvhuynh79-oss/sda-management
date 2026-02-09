import { action, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

/**
 * Stripe Integration Module - Sprint 3 SaaS Billing
 *
 * Handles Stripe Checkout, Billing Portal, subscription lifecycle,
 * and webhook event processing for the multi-tenant SaaS.
 *
 * Architecture:
 * - Actions (public): Client-facing functions that create Stripe sessions
 * - Mutations (public, webhook-secret-gated): Called by Next.js webhook route via ConvexHttpClient
 * - Internal mutations: Called by actions to update DB
 * - Internal queries: Used by actions to read org data
 *
 * Note: ConvexHttpClient in Next.js API routes can only call public (api.*) functions,
 * not internal ones. Webhook-facing mutations verify CONVEX_WEBHOOK_SECRET to prevent
 * unauthorized access. The actual Stripe signature verification happens in the Next.js
 * API route before calling these mutations.
 *
 * Environment variables required:
 * - STRIPE_SECRET_KEY: Stripe API secret key
 * - STRIPE_WEBHOOK_SECRET: Webhook endpoint signing secret (used in Next.js route)
 * - CONVEX_WEBHOOK_SECRET: Shared secret between Next.js webhook route and Convex mutations
 * - STRIPE_PRICE_STARTER_MONTHLY: Price ID for Starter plan ($250/mo)
 * - STRIPE_PRICE_PROFESSIONAL_MONTHLY: Price ID for Professional plan ($450/mo)
 * - STRIPE_PRICE_ENTERPRISE_MONTHLY: Price ID for Enterprise plan ($600/mo)
 * - NEXT_PUBLIC_APP_URL: Application base URL for redirects
 */

// ============================================================================
// PLAN CONFIGURATION
// ============================================================================

type PlanTier = "starter" | "professional" | "enterprise";

interface PlanConfig {
  maxProperties: number;
  maxUsers: number;
  maxDwellings: number;
  priceMonthly: number;
}

const PLAN_LIMITS: Record<PlanTier, PlanConfig> = {
  starter: { maxProperties: 10, maxUsers: 5, maxDwellings: 20, priceMonthly: 250 },
  professional: { maxProperties: 25, maxUsers: 15, maxDwellings: 75, priceMonthly: 450 },
  enterprise: { maxProperties: 50, maxUsers: 50, maxDwellings: 200, priceMonthly: 600 },
};

/**
 * Verify the webhook secret to ensure the caller is our trusted webhook route.
 * Throws an error if the secret does not match.
 */
function verifyWebhookSecret(providedSecret: string): void {
  const expectedSecret = process.env.CONVEX_WEBHOOK_SECRET;
  if (!expectedSecret) {
    throw new Error("CONVEX_WEBHOOK_SECRET environment variable is not configured");
  }
  if (providedSecret !== expectedSecret) {
    throw new Error("Invalid webhook secret - unauthorized access");
  }
}

/**
 * Map a Stripe price ID to a plan tier.
 * Returns undefined if the price ID does not match any configured plan.
 */
function getPlanFromPriceId(priceId: string): PlanTier | undefined {
  const priceMap: Record<string, PlanTier> = {};
  if (process.env.STRIPE_PRICE_STARTER_MONTHLY) {
    priceMap[process.env.STRIPE_PRICE_STARTER_MONTHLY] = "starter";
  }
  if (process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY) {
    priceMap[process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY] = "professional";
  }
  if (process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY) {
    priceMap[process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY] = "enterprise";
  }
  return priceMap[priceId];
}

/**
 * Get the Stripe price ID for a given plan tier.
 */
function getPriceIdForPlan(plan: PlanTier): string {
  const envMap: Record<PlanTier, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  };
  const priceId = envMap[plan];
  if (!priceId) {
    throw new Error(
      `Stripe price ID not configured for plan: ${plan}. Set STRIPE_PRICE_${plan.toUpperCase()}_MONTHLY env var.`
    );
  }
  return priceId;
}

// ============================================================================
// INTERNAL QUERIES (used by actions)
// ============================================================================

/**
 * Get organization by Stripe customer ID.
 */
export const getOrgByStripeCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();
  },
});

/**
 * Get organization by ID (internal, no auth check).
 */
export const getOrgById = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

// ============================================================================
// WEBHOOK-FACING MUTATIONS (public, called by Next.js webhook route)
//
// These are public mutations gated by CONVEX_WEBHOOK_SECRET. The Next.js
// webhook route (src/app/api/stripe/webhook/route.ts) verifies the Stripe
// signature first, then calls these mutations via ConvexHttpClient.
// ============================================================================

/**
 * Sync subscription state from Stripe into the organizations table.
 * Called by the webhook handler when subscription events occur.
 *
 * Maps Stripe subscription statuses to our internal statuses:
 * - active, trialing -> active / trialing
 * - past_due, unpaid -> past_due
 * - canceled, incomplete_expired -> canceled
 */
export const syncSubscription = mutation({
  args: {
    webhookSecret: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.string(),
    priceId: v.optional(v.string()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; organizationId?: string }> => {
    verifyWebhookSecret(args.webhookSecret);

    // Find organization by Stripe customer ID
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!org) {
      console.error(
        `[Stripe] No organization found for Stripe customer: ${args.stripeCustomerId}`
      );
      return { success: false };
    }

    // Map Stripe status to internal status
    let subscriptionStatus: "active" | "trialing" | "past_due" | "canceled";
    switch (args.status) {
      case "active":
        subscriptionStatus = "active";
        break;
      case "trialing":
        subscriptionStatus = "trialing";
        break;
      case "past_due":
      case "unpaid":
        subscriptionStatus = "past_due";
        break;
      case "canceled":
      case "incomplete_expired":
        subscriptionStatus = "canceled";
        break;
      default:
        console.warn(
          `[Stripe] Unhandled subscription status "${args.status}" for org ${org._id}`
        );
        return { success: true, organizationId: org._id };
    }

    // Determine plan from price ID if provided
    let plan: PlanTier | undefined;
    if (args.priceId) {
      plan = getPlanFromPriceId(args.priceId);
    }

    // Build update
    const updates: Record<string, unknown> = {
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionStatus,
    };

    // Update plan and limits if we identified the plan
    if (plan) {
      const limits = PLAN_LIMITS[plan];
      updates.plan = plan;
      updates.maxProperties = limits.maxProperties;
      updates.maxUsers = limits.maxUsers;
    }

    // Deactivate org if subscription is fully canceled
    if (subscriptionStatus === "canceled" && !args.cancelAtPeriodEnd) {
      updates.isActive = false;
    }

    // Reactivate org if subscription becomes active again
    if (subscriptionStatus === "active" && !org.isActive) {
      updates.isActive = true;
    }

    await ctx.db.patch(org._id, updates);

    console.log(
      `[Stripe] Synced subscription for org ${org._id}: status=${subscriptionStatus}, plan=${plan ?? "unchanged"}`
    );

    return { success: true, organizationId: org._id };
  },
});

/**
 * Handle completed checkout session.
 * Links a Stripe customer + subscription to a newly registered organization.
 */
export const handleCheckoutCompleted = mutation({
  args: {
    webhookSecret: v.string(),
    organizationId: v.id("organizations"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    verifyWebhookSecret(args.webhookSecret);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error(`Organization not found: ${args.organizationId}`);
    }

    await ctx.db.patch(args.organizationId, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionStatus: "active",
      isActive: true,
    });

    console.log(
      `[Stripe] Checkout completed for org ${args.organizationId}: customer=${args.stripeCustomerId}`
    );
  },
});

/**
 * Handle failed invoice payment.
 * Creates an alert for org admins and marks subscription as past_due.
 */
export const handlePaymentFailed = mutation({
  args: {
    webhookSecret: v.string(),
    stripeCustomerId: v.string(),
    invoiceId: v.string(),
    attemptCount: v.number(),
  },
  handler: async (ctx, args) => {
    verifyWebhookSecret(args.webhookSecret);

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!org) {
      console.error(
        `[Stripe] Payment failed for unknown customer: ${args.stripeCustomerId}`
      );
      return;
    }

    // Update subscription status to past_due
    await ctx.db.patch(org._id, {
      subscriptionStatus: "past_due",
    });

    // Create an alert for the organization admins
    await ctx.db.insert("alerts", {
      organizationId: org._id,
      alertType: "subscription_payment_failed",
      severity: "critical",
      title: "Subscription Payment Failed",
      message: `Invoice payment failed (attempt ${args.attemptCount}). Please update your payment method to avoid service interruption.`,
      triggerDate: new Date().toISOString().split("T")[0],
      status: "active",
      createdAt: Date.now(),
    });

    console.log(
      `[Stripe] Payment failed for org ${org._id}: invoice=${args.invoiceId}, attempt=${args.attemptCount}`
    );
  },
});

// ============================================================================
// INTERNAL MUTATIONS (called by actions)
// ============================================================================

/**
 * Internal mutation to update org plan details (called from changePlan action).
 */
export const updateOrgPlan = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    plan: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise")
    ),
    maxProperties: v.number(),
    maxUsers: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      plan: args.plan,
      maxProperties: args.maxProperties,
      maxUsers: args.maxUsers,
    });
  },
});

// ============================================================================
// PUBLIC ACTIONS (client-facing)
// ============================================================================

/**
 * Create a Stripe Checkout session for a new subscription.
 * Called during organization registration or plan upgrade.
 *
 * Returns the Checkout session URL to redirect the user to.
 */
export const createCheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    plan: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise")
    ),
    successUrl: v.optional(v.string()),
    cancelUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    // Get organization details
    const org = await ctx.runQuery(internal.stripe.getOrgById, {
      organizationId: args.organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    const priceId = getPriceIdForPlan(args.plan);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mysdamanager.com";

    // Build checkout session params
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url:
        args.successUrl ??
        `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: args.cancelUrl ?? `${appUrl}/pricing?checkout=canceled`,
      subscription_data: {
        metadata: {
          organizationId: args.organizationId,
          plan: args.plan,
        },
      },
      metadata: {
        organizationId: args.organizationId,
        plan: args.plan,
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
    };

    // If org already has a Stripe customer, reuse it
    if (org.stripeCustomerId) {
      params.customer = org.stripeCustomerId;
    } else {
      params.customer_creation = "always";
    }

    const session = await stripe.checkout.sessions.create(params);

    if (!session.url) {
      throw new Error("Failed to create checkout session - no URL returned");
    }

    return { url: session.url };
  },
});

/**
 * Create a Stripe Billing Portal session.
 * Allows existing customers to manage their subscription, payment methods,
 * and view invoices.
 *
 * Returns the portal session URL to redirect the user to.
 */
export const createBillingPortalSession = action({
  args: {
    organizationId: v.id("organizations"),
    returnUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    const org = await ctx.runQuery(internal.stripe.getOrgById, {
      organizationId: args.organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    if (!org.stripeCustomerId) {
      throw new Error(
        "Organization does not have a Stripe customer ID. Complete checkout first."
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mysdamanager.com";

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: args.returnUrl ?? `${appUrl}/settings`,
    });

    return { url: session.url };
  },
});

/**
 * Cancel subscription at end of current billing period.
 * Does not immediately cancel - the org retains access until period end.
 */
export const cancelSubscription = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ cancelAt: number | null }> => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    const org = await ctx.runQuery(internal.stripe.getOrgById, {
      organizationId: args.organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    if (!org.stripeSubscriptionId) {
      throw new Error("Organization does not have an active subscription");
    }

    const subscription = await stripe.subscriptions.update(
      org.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    return {
      cancelAt: subscription.cancel_at,
    };
  },
});

/**
 * Resume a subscription that was set to cancel at period end.
 */
export const resumeSubscription = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    const org = await ctx.runQuery(internal.stripe.getOrgById, {
      organizationId: args.organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    if (!org.stripeSubscriptionId) {
      throw new Error("Organization does not have a subscription");
    }

    await stripe.subscriptions.update(org.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    return { success: true };
  },
});

/**
 * Get the current subscription status and details.
 * Fetches live data from Stripe for accuracy.
 */
export const getSubscriptionStatus = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    hasSubscription: boolean;
    status: string | null;
    plan: string;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
    priceMonthly: number;
  }> => {
    const org = await ctx.runQuery(internal.stripe.getOrgById, {
      organizationId: args.organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    // If no Stripe subscription, return local data
    if (!org.stripeSubscriptionId) {
      const planConfig = PLAN_LIMITS[org.plan as PlanTier] ?? PLAN_LIMITS.starter;
      return {
        hasSubscription: false,
        status: org.subscriptionStatus,
        plan: org.plan,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        priceMonthly: planConfig.priceMonthly,
      };
    }

    // Fetch live subscription data from Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    const subscription = await stripe.subscriptions.retrieve(
      org.stripeSubscriptionId
    );

    const firstItem = subscription.items.data[0];
    const priceId = firstItem?.price?.id ?? "";
    const detectedPlan = getPlanFromPriceId(priceId) ?? org.plan;
    const planConfig =
      PLAN_LIMITS[detectedPlan as PlanTier] ?? PLAN_LIMITS.starter;

    // In Stripe API 2026-01-28, current_period_end is on subscription items, not the subscription
    const currentPeriodEnd = firstItem?.current_period_end ?? null;

    return {
      hasSubscription: true,
      status: subscription.status,
      plan: detectedPlan,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceMonthly: planConfig.priceMonthly,
    };
  },
});

/**
 * Change the subscription plan (upgrade or downgrade).
 * The change takes effect immediately with prorated billing.
 */
export const changePlan = action({
  args: {
    organizationId: v.id("organizations"),
    newPlan: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise")
    ),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    const org = await ctx.runQuery(internal.stripe.getOrgById, {
      organizationId: args.organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    if (!org.stripeSubscriptionId) {
      throw new Error(
        "Organization does not have an active subscription. Use checkout to subscribe."
      );
    }

    if (org.plan === args.newPlan) {
      throw new Error(`Organization is already on the ${args.newPlan} plan`);
    }

    const newPriceId = getPriceIdForPlan(args.newPlan);

    // Get current subscription to find the item to update
    const subscription = await stripe.subscriptions.retrieve(
      org.stripeSubscriptionId
    );

    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      throw new Error("No subscription item found to update");
    }

    // Update the subscription with the new price
    await stripe.subscriptions.update(org.stripeSubscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: "create_prorations",
      metadata: {
        organizationId: args.organizationId,
        plan: args.newPlan,
      },
    });

    // Update local org record immediately
    const limits = PLAN_LIMITS[args.newPlan];
    await ctx.runMutation(internal.stripe.updateOrgPlan, {
      organizationId: args.organizationId,
      plan: args.newPlan,
      maxProperties: limits.maxProperties,
      maxUsers: limits.maxUsers,
    });

    return { success: true };
  },
});
