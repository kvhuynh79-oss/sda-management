import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Marketing Analytics Module — Super-Admin Only
 *
 * Tracks paid advertising performance across Google Ads, LinkedIn Ads, etc.
 * All functions require isSuperAdmin === true.
 */

// ============================================================================
// HELPER
// ============================================================================

async function requireSuperAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
) {
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  if (!user.isActive) throw new Error("Account is disabled");
  if (!user.isSuperAdmin) throw new Error("Super-admin access required");
  return user;
}

// Channel + type validators (reused across args)
const channelValidator = v.union(
  v.literal("google_ads"),
  v.literal("linkedin_ads"),
  v.literal("meta_ads"),
  v.literal("other")
);

const campaignTypeValidator = v.union(
  v.literal("search"),
  v.literal("display"),
  v.literal("sponsored_content"),
  v.literal("message_ads"),
  v.literal("retargeting"),
  v.literal("other")
);

const campaignStatusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("ended")
);

const acquisitionChannelValidator = v.union(
  v.literal("google_ads"),
  v.literal("linkedin_ads"),
  v.literal("meta_ads"),
  v.literal("organic"),
  v.literal("referral"),
  v.literal("direct"),
  v.literal("other")
);

const customerPlanValidator = v.union(
  v.literal("trial"),
  v.literal("starter"),
  v.literal("professional"),
  v.literal("enterprise"),
  v.literal("churned")
);

// Helper: safe division
function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

// Helper: get YYYY-MM-DD for today (UTC)
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Helper: get YYYY-MM for this month
function thisMonthStr(): string {
  return new Date().toISOString().slice(0, 7);
}

// Helper: get date N days ago
function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Helper: get first day of current month
function firstOfMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// Helper: get first day of previous month
function firstOfPrevMonthStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// Helper: get last day of previous month (= day before first of current month)
function lastOfPrevMonthStr(): string {
  const d = new Date();
  d.setDate(0); // last day of prev month
  return d.toISOString().slice(0, 10);
}

// Helper: start of current week (Monday)
function startOfWeekStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

// ============================================================================
// MARKETING METRICS — CRUD
// ============================================================================

export const createMetric = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    channel: channelValidator,
    impressions: v.number(),
    clicks: v.number(),
    spend: v.number(),
    signups: v.number(),
    demoBookings: v.number(),
    trialStarts: v.number(),
    notes: v.optional(v.string()),
    entryMethod: v.optional(v.union(
      v.literal("manual"),
      v.literal("csv_upload"),
      v.literal("api_sync")
    )),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const conversions = args.signups + args.demoBookings + args.trialStarts;
    const cpc = Math.round(safeDivide(args.spend, args.clicks));
    const ctr = parseFloat((safeDivide(args.clicks, args.impressions) * 100).toFixed(2));
    const conversionRate = parseFloat((safeDivide(conversions, args.clicks) * 100).toFixed(2));

    return await ctx.db.insert("marketingMetrics", {
      date: args.date,
      channel: args.channel,
      impressions: args.impressions,
      clicks: args.clicks,
      spend: args.spend,
      conversions,
      conversionBreakdown: {
        signups: args.signups,
        demoBookings: args.demoBookings,
        trialStarts: args.trialStarts,
      },
      cpc,
      ctr,
      conversionRate,
      notes: args.notes,
      entryMethod: args.entryMethod ?? "manual",
      createdBy: args.userId,
      createdAt: Date.now(),
    });
  },
});

export const updateMetric = mutation({
  args: {
    userId: v.id("users"),
    metricId: v.id("marketingMetrics"),
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    spend: v.optional(v.number()),
    signups: v.optional(v.number()),
    demoBookings: v.optional(v.number()),
    trialStarts: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const existing = await ctx.db.get(args.metricId);
    if (!existing) throw new Error("Metric not found");

    const impressions = args.impressions ?? existing.impressions;
    const clicks = args.clicks ?? existing.clicks;
    const spend = args.spend ?? existing.spend;
    const signups = args.signups ?? existing.conversionBreakdown.signups;
    const demoBookings = args.demoBookings ?? existing.conversionBreakdown.demoBookings;
    const trialStarts = args.trialStarts ?? existing.conversionBreakdown.trialStarts;
    const conversions = signups + demoBookings + trialStarts;

    await ctx.db.patch(args.metricId, {
      impressions,
      clicks,
      spend,
      conversions,
      conversionBreakdown: { signups, demoBookings, trialStarts },
      cpc: Math.round(safeDivide(spend, clicks)),
      ctr: parseFloat((safeDivide(clicks, impressions) * 100).toFixed(2)),
      conversionRate: parseFloat((safeDivide(conversions, clicks) * 100).toFixed(2)),
      notes: args.notes ?? existing.notes,
    });
  },
});

export const deleteMetric = mutation({
  args: {
    userId: v.id("users"),
    metricId: v.id("marketingMetrics"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    await ctx.db.delete(args.metricId);
  },
});

export const getMetrics = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    channel: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    let metrics = await ctx.db.query("marketingMetrics")
      .withIndex("by_date")
      .order("desc")
      .collect();

    if (args.startDate) {
      metrics = metrics.filter((m) => m.date >= args.startDate!);
    }
    if (args.endDate) {
      metrics = metrics.filter((m) => m.date <= args.endDate!);
    }
    if (args.channel) {
      metrics = metrics.filter((m) => m.channel === args.channel);
    }

    // Enrich with creator name
    const enriched = await Promise.all(
      metrics.slice(0, args.limit ?? 100).map(async (m) => {
        const creator = await ctx.db.get(m.createdBy);
        return {
          ...m,
          createdByName: creator
            ? `${creator.firstName} ${creator.lastName}`
            : "Unknown",
        };
      })
    );

    return enriched;
  },
});

// ============================================================================
// MARKETING CAMPAIGNS — CRUD
// ============================================================================

export const createCampaign = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    channel: channelValidator,
    type: campaignTypeValidator,
    status: campaignStatusValidator,
    startDate: v.string(),
    endDate: v.optional(v.string()),
    dailyBudget: v.number(),
    totalBudget: v.optional(v.number()),
    targetCPA: v.optional(v.number()),
    targetAudience: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    const { userId, ...data } = args;
    return await ctx.db.insert("marketingCampaigns", {
      ...data,
      createdAt: Date.now(),
    });
  },
});

export const updateCampaign = mutation({
  args: {
    userId: v.id("users"),
    campaignId: v.id("marketingCampaigns"),
    name: v.optional(v.string()),
    channel: v.optional(channelValidator),
    type: v.optional(campaignTypeValidator),
    status: v.optional(campaignStatusValidator),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    dailyBudget: v.optional(v.number()),
    totalBudget: v.optional(v.number()),
    targetCPA: v.optional(v.number()),
    targetAudience: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    const { userId, campaignId, ...updates } = args;
    // Filter out undefined values
    const filtered: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) filtered[k] = val;
    }
    await ctx.db.patch(campaignId, filtered);
  },
});

export const deleteCampaign = mutation({
  args: {
    userId: v.id("users"),
    campaignId: v.id("marketingCampaigns"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    await ctx.db.delete(args.campaignId);
  },
});

export const getCampaigns = query({
  args: {
    userId: v.id("users"),
    channel: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    let campaigns = await ctx.db.query("marketingCampaigns").collect();

    if (args.channel) {
      campaigns = campaigns.filter((c) => c.channel === args.channel);
    }
    if (args.status) {
      campaigns = campaigns.filter((c) => c.status === args.status);
    }

    return campaigns.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getCampaign = query({
  args: {
    userId: v.id("users"),
    campaignId: v.id("marketingCampaigns"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    return await ctx.db.get(args.campaignId);
  },
});

// ============================================================================
// MARKETING GOALS — CRUD
// ============================================================================

export const upsertGoal = mutation({
  args: {
    userId: v.id("users"),
    month: v.string(),
    targetSpend: v.number(),
    targetLeads: v.number(),
    targetCAC: v.number(),
    targetTrials: v.number(),
    targetDemos: v.number(),
    targetPaidConversions: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const existing = await ctx.db
      .query("marketingGoals")
      .withIndex("by_month", (q) => q.eq("month", args.month))
      .first();

    const { userId, ...data } = args;

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("marketingGoals", {
        ...data,
        createdAt: Date.now(),
      });
    }
  },
});

export const getGoals = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    const goals = await ctx.db.query("marketingGoals").collect();
    return goals.sort((a, b) => b.month.localeCompare(a.month));
  },
});

export const getGoalForMonth = query({
  args: {
    userId: v.id("users"),
    month: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    return await ctx.db
      .query("marketingGoals")
      .withIndex("by_month", (q) => q.eq("month", args.month))
      .first();
  },
});

// ============================================================================
// MARKETING CUSTOMERS — CRUD
// ============================================================================

export const createCustomer = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
    acquisitionChannel: acquisitionChannelValidator,
    acquisitionDate: v.string(),
    acquisitionCost: v.optional(v.number()),
    currentPlan: customerPlanValidator,
    monthlyRevenue: v.number(),
    lifetimeRevenue: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    const { userId, ...data } = args;
    return await ctx.db.insert("marketingCustomers", {
      ...data,
      createdAt: Date.now(),
    });
  },
});

export const updateCustomer = mutation({
  args: {
    userId: v.id("users"),
    customerId: v.id("marketingCustomers"),
    organizationId: v.optional(v.id("organizations")),
    acquisitionChannel: v.optional(acquisitionChannelValidator),
    acquisitionDate: v.optional(v.string()),
    acquisitionCost: v.optional(v.number()),
    currentPlan: v.optional(customerPlanValidator),
    monthlyRevenue: v.optional(v.number()),
    lifetimeRevenue: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    const { userId, customerId, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) filtered[k] = val;
    }
    await ctx.db.patch(customerId, filtered);
  },
});

export const deleteCustomer = mutation({
  args: {
    userId: v.id("users"),
    customerId: v.id("marketingCustomers"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    await ctx.db.delete(args.customerId);
  },
});

export const getCustomers = query({
  args: {
    userId: v.id("users"),
    channel: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    let customers = await ctx.db.query("marketingCustomers").collect();

    if (args.channel) {
      customers = customers.filter((c) => c.acquisitionChannel === args.channel);
    }
    if (args.plan) {
      customers = customers.filter((c) => c.currentPlan === args.plan);
    }

    // Enrich with org name
    const enriched = await Promise.all(
      customers.map(async (c) => {
        let orgName: string | null = null;
        if (c.organizationId) {
          const org = await ctx.db.get(c.organizationId);
          orgName = org?.name ?? null;
        }
        return { ...c, orgName };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ============================================================================
// AGGREGATION QUERIES
// ============================================================================

export const getMarketingOverview = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const currentMonth = thisMonthStr();
    const prevMonthStart = firstOfPrevMonthStr();
    const prevMonthEnd = lastOfPrevMonthStr();
    const monthStart = firstOfMonthStr();
    const weekStart = startOfWeekStr();
    const today = todayStr();

    // Fetch all metrics
    const allMetrics = await ctx.db.query("marketingMetrics").collect();
    const thisMonthMetrics = allMetrics.filter(
      (m) => m.date >= monthStart && m.date <= today
    );
    const prevMonthMetrics = allMetrics.filter(
      (m) => m.date >= prevMonthStart && m.date <= prevMonthEnd
    );
    const thisWeekMetrics = allMetrics.filter(
      (m) => m.date >= weekStart && m.date <= today
    );

    // Current month goal
    const goal = await ctx.db
      .query("marketingGoals")
      .withIndex("by_month", (q) => q.eq("month", currentMonth))
      .first();

    // Customers
    const customers = await ctx.db.query("marketingCustomers").collect();
    const activeCustomers = customers.filter((c) => c.currentPlan !== "churned");

    // Aggregate current month
    const cmSpend = thisMonthMetrics.reduce((s, m) => s + m.spend, 0);
    const cmClicks = thisMonthMetrics.reduce((s, m) => s + m.clicks, 0);
    const cmImpressions = thisMonthMetrics.reduce((s, m) => s + m.impressions, 0);
    const cmConversions = thisMonthMetrics.reduce((s, m) => s + m.conversions, 0);
    const cmSignups = thisMonthMetrics.reduce((s, m) => s + m.conversionBreakdown.signups, 0);
    const cmDemos = thisMonthMetrics.reduce((s, m) => s + m.conversionBreakdown.demoBookings, 0);
    const cmTrials = thisMonthMetrics.reduce((s, m) => s + m.conversionBreakdown.trialStarts, 0);

    // Previous month
    const pmSpend = prevMonthMetrics.reduce((s, m) => s + m.spend, 0);
    const pmClicks = prevMonthMetrics.reduce((s, m) => s + m.clicks, 0);
    const pmImpressions = prevMonthMetrics.reduce((s, m) => s + m.impressions, 0);
    const pmConversions = prevMonthMetrics.reduce((s, m) => s + m.conversions, 0);

    // This week
    const weekSpend = thisWeekMetrics.reduce((s, m) => s + m.spend, 0);

    // Per-channel breakdown (current month)
    const channels = ["google_ads", "linkedin_ads", "meta_ads", "other"] as const;
    const channelStats = channels.map((ch) => {
      const chMetrics = thisMonthMetrics.filter((m) => m.channel === ch);
      const spend = chMetrics.reduce((s, m) => s + m.spend, 0);
      const clicks = chMetrics.reduce((s, m) => s + m.clicks, 0);
      const impressions = chMetrics.reduce((s, m) => s + m.impressions, 0);
      const conversions = chMetrics.reduce((s, m) => s + m.conversions, 0);

      // Previous month for comparison
      const pmCh = prevMonthMetrics.filter((m) => m.channel === ch);
      const pmChSpend = pmCh.reduce((s, m) => s + m.spend, 0);
      const pmChConversions = pmCh.reduce((s, m) => s + m.conversions, 0);

      return {
        channel: ch,
        spend,
        clicks,
        impressions,
        conversions,
        cpc: Math.round(safeDivide(spend, clicks)),
        ctr: parseFloat((safeDivide(clicks, impressions) * 100).toFixed(2)),
        conversionRate: parseFloat((safeDivide(conversions, clicks) * 100).toFixed(2)),
        spendPct: parseFloat((safeDivide(spend, cmSpend) * 100).toFixed(1)),
        spendTrend: pmChSpend > 0
          ? parseFloat((safeDivide(spend - pmChSpend, pmChSpend) * 100).toFixed(1))
          : null,
        conversionsTrend: pmChConversions > 0
          ? parseFloat((safeDivide(conversions - pmChConversions, pmChConversions) * 100).toFixed(1))
          : null,
      };
    }).filter((ch) => ch.spend > 0 || ch.clicks > 0);

    // CAC & LTV
    const avgLTV = activeCustomers.length > 0
      ? Math.round(activeCustomers.reduce((s, c) => s + c.lifetimeRevenue, 0) / activeCustomers.length)
      : 0;
    const cac = Math.round(safeDivide(cmSpend, cmConversions));
    const ltvCacRatio = parseFloat(safeDivide(avgLTV, cac).toFixed(1));

    // MoM changes
    const spendChange = pmSpend > 0
      ? parseFloat((safeDivide(cmSpend - pmSpend, pmSpend) * 100).toFixed(1))
      : null;
    const conversionsChange = pmConversions > 0
      ? parseFloat((safeDivide(cmConversions - pmConversions, pmConversions) * 100).toFixed(1))
      : null;

    return {
      // Key metrics
      totalSpend: cmSpend,
      targetSpend: goal?.targetSpend ?? 0,
      weeklySpend: weekSpend,
      totalConversions: cmConversions,
      targetLeads: goal?.targetLeads ?? 0,
      cpc: Math.round(safeDivide(cmSpend, cmClicks)),
      ctr: parseFloat((safeDivide(cmClicks, cmImpressions) * 100).toFixed(2)),
      conversionRate: parseFloat((safeDivide(cmConversions, cmClicks) * 100).toFixed(2)),
      cac,
      targetCAC: goal?.targetCAC ?? 0,
      avgLTV,
      ltvCacRatio,
      // Breakdowns
      signups: cmSignups,
      demoBookings: cmDemos,
      trialStarts: cmTrials,
      // Targets
      targetTrials: goal?.targetTrials ?? 0,
      targetDemos: goal?.targetDemos ?? 0,
      targetPaidConversions: goal?.targetPaidConversions ?? 0,
      // MRR from ad customers
      adMRR: activeCustomers
        .filter((c) => ["google_ads", "linkedin_ads", "meta_ads"].includes(c.acquisitionChannel))
        .reduce((s, c) => s + c.monthlyRevenue, 0),
      // Trends
      spendChange,
      conversionsChange,
      // Channel breakdown
      channelStats,
      // Customer counts
      totalCustomers: activeCustomers.length,
      totalAdCustomers: activeCustomers.filter(
        (c) => ["google_ads", "linkedin_ads", "meta_ads"].includes(c.acquisitionChannel)
      ).length,
    };
  },
});

export const getMarketingTimeSeries = query({
  args: {
    userId: v.id("users"),
    period: v.union(
      v.literal("7d"),
      v.literal("30d"),
      v.literal("90d")
    ),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const days = args.period === "7d" ? 7 : args.period === "30d" ? 30 : 90;
    const startDate = daysAgoStr(days);
    const today = todayStr();

    let metrics = await ctx.db.query("marketingMetrics").collect();
    metrics = metrics.filter((m) => m.date >= startDate && m.date <= today);
    if (args.channel) {
      metrics = metrics.filter((m) => m.channel === args.channel);
    }

    // Group by date, summing all channels per day
    const byDate = new Map<string, {
      date: string;
      spend: number;
      clicks: number;
      impressions: number;
      conversions: number;
      signups: number;
      demoBookings: number;
      trialStarts: number;
    }>();

    for (const m of metrics) {
      const existing = byDate.get(m.date) ?? {
        date: m.date,
        spend: 0,
        clicks: 0,
        impressions: 0,
        conversions: 0,
        signups: 0,
        demoBookings: 0,
        trialStarts: 0,
      };
      existing.spend += m.spend;
      existing.clicks += m.clicks;
      existing.impressions += m.impressions;
      existing.conversions += m.conversions;
      existing.signups += m.conversionBreakdown.signups;
      existing.demoBookings += m.conversionBreakdown.demoBookings;
      existing.trialStarts += m.conversionBreakdown.trialStarts;
      byDate.set(m.date, existing);
    }

    const series = Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        cpc: Math.round(safeDivide(d.spend, d.clicks)),
        ctr: parseFloat((safeDivide(d.clicks, d.impressions) * 100).toFixed(2)),
        conversionRate: parseFloat((safeDivide(d.conversions, d.clicks) * 100).toFixed(2)),
      }));

    return series;
  },
});

export const getMarketingFunnel = query({
  args: {
    userId: v.id("users"),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const monthStart = firstOfMonthStr();
    const today = todayStr();

    let metrics = await ctx.db.query("marketingMetrics").collect();
    metrics = metrics.filter((m) => m.date >= monthStart && m.date <= today);
    if (args.channel) {
      metrics = metrics.filter((m) => m.channel === args.channel);
    }

    const impressions = metrics.reduce((s, m) => s + m.impressions, 0);
    const clicks = metrics.reduce((s, m) => s + m.clicks, 0);
    const signups = metrics.reduce((s, m) => s + m.conversionBreakdown.signups, 0);
    const trials = metrics.reduce((s, m) => s + m.conversionBreakdown.trialStarts, 0);
    const demos = metrics.reduce((s, m) => s + m.conversionBreakdown.demoBookings, 0);

    // Count paid customers acquired this month
    const customers = await ctx.db.query("marketingCustomers").collect();
    const paidThisMonth = customers.filter(
      (c) =>
        c.acquisitionDate >= monthStart &&
        c.acquisitionDate <= today &&
        c.currentPlan !== "trial" &&
        c.currentPlan !== "churned" &&
        (!args.channel || c.acquisitionChannel === args.channel)
    ).length;

    const stages = [
      { name: "Impressions", count: impressions, dropOff: 0 },
      {
        name: "Clicks",
        count: clicks,
        dropOff: parseFloat((safeDivide(impressions - clicks, impressions) * 100).toFixed(1)),
      },
      {
        name: "Sign-ups",
        count: signups,
        dropOff: parseFloat((safeDivide(clicks - signups, clicks) * 100).toFixed(1)),
      },
      {
        name: "Trial Starts",
        count: trials,
        dropOff: parseFloat((safeDivide(signups - trials, signups) * 100).toFixed(1)),
      },
      {
        name: "Demo Bookings",
        count: demos,
        dropOff: parseFloat((safeDivide(trials - demos, trials) * 100).toFixed(1)),
      },
      {
        name: "Paid Customers",
        count: paidThisMonth,
        dropOff: parseFloat(
          (safeDivide(demos - paidThisMonth, demos) * 100).toFixed(1)
        ),
      },
    ];

    return stages;
  },
});

export const getCustomerAcquisitionStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const customers = await ctx.db.query("marketingCustomers").collect();
    const allChannels = [
      "google_ads", "linkedin_ads", "meta_ads", "organic", "referral", "direct", "other",
    ] as const;

    const byChannel = allChannels.map((ch) => {
      const chCustomers = customers.filter((c) => c.acquisitionChannel === ch);
      const active = chCustomers.filter((c) => c.currentPlan !== "churned");
      const churned = chCustomers.filter((c) => c.currentPlan === "churned");

      const totalCost = chCustomers.reduce((s, c) => s + (c.acquisitionCost ?? 0), 0);
      const avgCAC = Math.round(safeDivide(totalCost, chCustomers.length));
      const avgLTV = active.length > 0
        ? Math.round(active.reduce((s, c) => s + c.lifetimeRevenue, 0) / active.length)
        : 0;
      const mrr = active.reduce((s, c) => s + c.monthlyRevenue, 0);
      const churnRate = parseFloat(
        (safeDivide(churned.length, chCustomers.length) * 100).toFixed(1)
      );

      return {
        channel: ch,
        total: chCustomers.length,
        active: active.length,
        churned: churned.length,
        avgCAC,
        avgLTV,
        ltvCacRatio: parseFloat(safeDivide(avgLTV, avgCAC).toFixed(1)),
        mrr,
        churnRate,
      };
    }).filter((ch) => ch.total > 0);

    // Totals
    const active = customers.filter((c) => c.currentPlan !== "churned");
    const totalMRR = active.reduce((s, c) => s + c.monthlyRevenue, 0);
    const totalLTV = active.length > 0
      ? Math.round(active.reduce((s, c) => s + c.lifetimeRevenue, 0) / active.length)
      : 0;
    const totalCost = customers.reduce((s, c) => s + (c.acquisitionCost ?? 0), 0);
    const overallCAC = Math.round(safeDivide(totalCost, customers.length));

    return {
      totalCustomers: customers.length,
      activeCustomers: active.length,
      overallCAC,
      avgLTV: totalLTV,
      overallLTVCAC: parseFloat(safeDivide(totalLTV, overallCAC).toFixed(1)),
      totalMRR,
      byChannel,
    };
  },
});

// ============================================================================
// HELPER: Get all orgs for customer linking dropdown
// ============================================================================

export const getOrganizationsForDropdown = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    const orgs = await ctx.db.query("organizations").collect();
    return orgs
      .filter((o) => o.isActive)
      .map((o) => ({ _id: o._id, name: o.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});
