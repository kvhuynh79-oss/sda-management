import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireTenant } from "./authHelpers";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all leads for the organization (tenant-isolated)
 */
export const getAll = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Filter out soft-deleted records in memory
    return leads.filter((lead) => lead.isDeleted !== true);
  },
});

/**
 * Get a single lead by ID with full details
 */
export const getById = query({
  args: {
    userId: v.id("users"),
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);

    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.isDeleted === true) {
      return null;
    }

    // Enrich with matched property/dwelling details if placed
    let matchedProperty = null;
    let matchedDwelling = null;
    if (lead.matchedPropertyId) {
      matchedProperty = await ctx.db.get(lead.matchedPropertyId);
    }
    if (lead.matchedDwellingId) {
      matchedDwelling = await ctx.db.get(lead.matchedDwellingId);
    }

    return {
      ...lead,
      matchedProperty,
      matchedDwelling,
    };
  },
});

/**
 * Get leads filtered by status
 */
export const getByStatus = query({
  args: {
    userId: v.id("users"),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("viewing"),
      v.literal("waiting_list"),
      v.literal("placed"),
      v.literal("no_availability"),
      v.literal("lost")
    ),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    return leads.filter(
      (lead) => lead.isDeleted !== true && lead.status === args.status
    );
  },
});

/**
 * Get pipeline counts by status (for funnel/pipeline view)
 */
export const getPipeline = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const activeLeads = leads.filter((lead) => lead.isDeleted !== true);

    const statusCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      viewing: 0,
      waiting_list: 0,
      placed: 0,
      no_availability: 0,
      lost: 0,
    };

    for (const lead of activeLeads) {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    }

    return {
      statusCounts,
      total: activeLeads.length,
      activeCount: activeLeads.filter(
        (l) => !["placed", "lost"].includes(l.status)
      ).length,
    };
  },
});

/**
 * Get demand aggregated by preferred areas (for investor reports)
 */
export const getDemandByArea = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const activeLeads = leads.filter((lead) => lead.isDeleted !== true);

    // Aggregate by area
    const areaDemand: Record<string, { count: number; categories: Record<string, number>; urgencies: Record<string, number> }> = {};

    for (const lead of activeLeads) {
      for (const area of lead.preferredAreas) {
        if (!areaDemand[area]) {
          areaDemand[area] = { count: 0, categories: {}, urgencies: {} };
        }
        areaDemand[area].count++;
        areaDemand[area].categories[lead.sdaCategoryNeeded] =
          (areaDemand[area].categories[lead.sdaCategoryNeeded] || 0) + 1;
        areaDemand[area].urgencies[lead.urgency] =
          (areaDemand[area].urgencies[lead.urgency] || 0) + 1;
      }
    }

    // Sort by count descending
    const sorted = Object.entries(areaDemand)
      .map(([area, data]) => ({ area, ...data }))
      .sort((a, b) => b.count - a.count);

    return sorted;
  },
});

/**
 * Get demand aggregated by SDA category
 */
export const getDemandByCategory = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const activeLeads = leads.filter((lead) => lead.isDeleted !== true);

    const categoryDemand: Record<string, { count: number; areas: Record<string, number>; statuses: Record<string, number> }> = {};

    for (const lead of activeLeads) {
      const cat = lead.sdaCategoryNeeded;
      if (!categoryDemand[cat]) {
        categoryDemand[cat] = { count: 0, areas: {}, statuses: {} };
      }
      categoryDemand[cat].count++;
      categoryDemand[cat].statuses[lead.status] =
        (categoryDemand[cat].statuses[lead.status] || 0) + 1;
      for (const area of lead.preferredAreas) {
        categoryDemand[cat].areas[area] =
          (categoryDemand[cat].areas[area] || 0) + 1;
      }
    }

    return Object.entries(categoryDemand)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * Get unmet demand - leads where status is "no_availability" or "waiting_list" grouped by area
 */
export const getUnmetDemand = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const unmetLeads = leads.filter(
      (lead) =>
        lead.isDeleted !== true &&
        (lead.status === "no_availability" || lead.status === "waiting_list")
    );

    // Group by area with category breakdown
    const unmetByArea: Record<string, { count: number; categories: Record<string, number>; leads: Array<{ participantName: string; sdaCategoryNeeded: string; urgency: string; referrerName: string; createdAt: number }> }> = {};

    for (const lead of unmetLeads) {
      for (const area of lead.preferredAreas) {
        if (!unmetByArea[area]) {
          unmetByArea[area] = { count: 0, categories: {}, leads: [] };
        }
        unmetByArea[area].count++;
        unmetByArea[area].categories[lead.sdaCategoryNeeded] =
          (unmetByArea[area].categories[lead.sdaCategoryNeeded] || 0) + 1;
        unmetByArea[area].leads.push({
          participantName: lead.participantName,
          sdaCategoryNeeded: lead.sdaCategoryNeeded,
          urgency: lead.urgency,
          referrerName: lead.referrerName,
          createdAt: lead.createdAt,
        });
      }
    }

    return Object.entries(unmetByArea)
      .map(([area, data]) => ({ area, ...data }))
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * Get recent leads (last 30 days)
 */
export const getRecentLeads = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    return leads
      .filter(
        (lead) => lead.isDeleted !== true && lead.createdAt >= thirtyDaysAgo
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get lead stats for dashboard
 * Returns: total, new this month, conversion rate, avg time to place
 */
export const getLeadStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const activeLeads = leads.filter((lead) => lead.isDeleted !== true);

    // Total leads
    const total = activeLeads.length;

    // New this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const newThisMonth = activeLeads.filter(
      (lead) => lead.createdAt >= startOfMonth
    ).length;

    // Conversion rate (placed / total completed)
    const completedLeads = activeLeads.filter(
      (lead) => lead.status === "placed" || lead.status === "lost"
    );
    const placedLeads = activeLeads.filter(
      (lead) => lead.status === "placed"
    );
    const conversionRate =
      completedLeads.length > 0
        ? Math.round((placedLeads.length / completedLeads.length) * 100)
        : 0;

    // Average time to place (in days) for placed leads
    let avgTimeToPlace = 0;
    if (placedLeads.length > 0) {
      const totalDays = placedLeads.reduce((sum, lead) => {
        if (lead.placedDate) {
          const placedTime = new Date(lead.placedDate).getTime();
          const createdTime = lead.createdAt;
          const days = (placedTime - createdTime) / (1000 * 60 * 60 * 24);
          return sum + days;
        }
        return sum;
      }, 0);
      avgTimeToPlace = Math.round(totalDays / placedLeads.length);
    }

    // Active pipeline count (not placed or lost)
    const activePipeline = activeLeads.filter(
      (lead) => !["placed", "lost"].includes(lead.status)
    ).length;

    // Urgency breakdown
    const urgentCount = activeLeads.filter(
      (lead) =>
        !["placed", "lost"].includes(lead.status) &&
        (lead.urgency === "urgent" || lead.urgency === "high")
    ).length;

    return {
      total,
      newThisMonth,
      conversionRate,
      avgTimeToPlace,
      activePipeline,
      urgentCount,
      placedCount: placedLeads.length,
      lostCount: activeLeads.filter((l) => l.status === "lost").length,
    };
  },
});

/**
 * Investor report - comprehensive demand analysis
 * Returns: area hotspots, category breakdown, unmet demand, trends
 */
export const getInvestorReport = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const activeLeads = leads.filter((lead) => lead.isDeleted !== true);

    // 1. Area hotspots - top areas by demand
    const areaMap: Record<string, { total: number; unmet: number; placed: number; categories: Record<string, number> }> = {};
    for (const lead of activeLeads) {
      for (const area of lead.preferredAreas) {
        if (!areaMap[area]) {
          areaMap[area] = { total: 0, unmet: 0, placed: 0, categories: {} };
        }
        areaMap[area].total++;
        if (lead.status === "no_availability" || lead.status === "waiting_list") {
          areaMap[area].unmet++;
        }
        if (lead.status === "placed") {
          areaMap[area].placed++;
        }
        areaMap[area].categories[lead.sdaCategoryNeeded] =
          (areaMap[area].categories[lead.sdaCategoryNeeded] || 0) + 1;
      }
    }
    const areaHotspots = Object.entries(areaMap)
      .map(([area, data]) => ({ area, ...data }))
      .sort((a, b) => b.unmet - a.unmet);

    // 2. Category breakdown
    const categoryMap: Record<string, { total: number; unmet: number; placed: number }> = {};
    for (const lead of activeLeads) {
      const cat = lead.sdaCategoryNeeded;
      if (!categoryMap[cat]) {
        categoryMap[cat] = { total: 0, unmet: 0, placed: 0 };
      }
      categoryMap[cat].total++;
      if (lead.status === "no_availability" || lead.status === "waiting_list") {
        categoryMap[cat].unmet++;
      }
      if (lead.status === "placed") {
        categoryMap[cat].placed++;
      }
    }
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total);

    // 3. Monthly trends (last 6 months)
    const now = new Date();
    const monthlyTrends: Array<{ month: string; newLeads: number; placed: number; lost: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthStart = monthDate.getTime();
      const monthEndTime = monthEnd.getTime();

      const monthLabel = monthDate.toLocaleDateString("en-AU", {
        month: "short",
        year: "numeric",
      });

      const newInMonth = activeLeads.filter(
        (l) => l.createdAt >= monthStart && l.createdAt <= monthEndTime
      ).length;

      const placedInMonth = activeLeads.filter(
        (l) =>
          l.status === "placed" &&
          l.placedDate &&
          new Date(l.placedDate).getTime() >= monthStart &&
          new Date(l.placedDate).getTime() <= monthEndTime
      ).length;

      const lostInMonth = activeLeads.filter(
        (l) =>
          l.status === "lost" &&
          l.updatedAt &&
          l.updatedAt >= monthStart &&
          l.updatedAt <= monthEndTime
      ).length;

      monthlyTrends.push({
        month: monthLabel,
        newLeads: newInMonth,
        placed: placedInMonth,
        lost: lostInMonth,
      });
    }

    // 4. Referrer analysis
    const referrerMap: Record<string, { name: string; type: string; total: number; placed: number; organization?: string }> = {};
    for (const lead of activeLeads) {
      const key = lead.referrerName;
      if (!referrerMap[key]) {
        referrerMap[key] = {
          name: lead.referrerName,
          type: lead.referrerType,
          total: 0,
          placed: 0,
          organization: lead.referrerOrganization,
        };
      }
      referrerMap[key].total++;
      if (lead.status === "placed") {
        referrerMap[key].placed++;
      }
    }
    const topReferrers = Object.values(referrerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // 5. State breakdown (if preferredState is set)
    const stateMap: Record<string, { total: number; unmet: number }> = {};
    for (const lead of activeLeads) {
      const state = lead.preferredState || "Not specified";
      if (!stateMap[state]) {
        stateMap[state] = { total: 0, unmet: 0 };
      }
      stateMap[state].total++;
      if (lead.status === "no_availability" || lead.status === "waiting_list") {
        stateMap[state].unmet++;
      }
    }
    const stateBreakdown = Object.entries(stateMap)
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.total - a.total);

    return {
      summary: {
        totalLeads: activeLeads.length,
        totalUnmet: activeLeads.filter(
          (l) => l.status === "no_availability" || l.status === "waiting_list"
        ).length,
        totalPlaced: activeLeads.filter((l) => l.status === "placed").length,
        conversionRate:
          activeLeads.filter((l) => ["placed", "lost"].includes(l.status)).length > 0
            ? Math.round(
                (activeLeads.filter((l) => l.status === "placed").length /
                  activeLeads.filter((l) => ["placed", "lost"].includes(l.status)).length) *
                  100
              )
            : 0,
      },
      areaHotspots,
      categoryBreakdown,
      monthlyTrends,
      topReferrers,
      stateBreakdown,
      generatedAt: new Date().toISOString(),
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new lead + auto-create communication thread
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    referrerType: v.union(v.literal("occupational_therapist"), v.literal("support_coordinator"), v.literal("other")),
    referrerId: v.optional(v.string()),
    referrerName: v.string(),
    referrerPhone: v.optional(v.string()),
    referrerEmail: v.optional(v.string()),
    referrerOrganization: v.optional(v.string()),
    participantName: v.string(),
    participantNdisNumber: v.optional(v.string()),
    participantAge: v.optional(v.number()),
    participantGender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"), v.literal("prefer_not_to_say"))),
    sdaCategoryNeeded: v.union(
      v.literal("improved_liveability"),
      v.literal("fully_accessible"),
      v.literal("robust"),
      v.literal("high_physical_support")
    ),
    preferredAreas: v.array(v.string()),
    preferredState: v.optional(v.string()),
    specificRequirements: v.optional(v.string()),
    budgetNotes: v.optional(v.string()),
    urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    source: v.union(v.literal("phone"), v.literal("email"), v.literal("referral"), v.literal("website")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "leads", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const now = Date.now();

    // Generate thread ID for linking to communications
    const threadId = `thread_lead_${now}_${Math.random().toString(36).substring(2, 9)}`;

    // Format SDA category for display
    const categoryLabel = args.sdaCategoryNeeded
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
    const areasLabel = args.preferredAreas.slice(0, 3).join(", ");

    // Create the lead
    const leadId = await ctx.db.insert("leads", {
      organizationId,
      referrerType: args.referrerType,
      referrerId: args.referrerId,
      referrerName: args.referrerName,
      referrerPhone: args.referrerPhone,
      referrerEmail: args.referrerEmail,
      referrerOrganization: args.referrerOrganization,
      participantName: args.participantName,
      participantNdisNumber: args.participantNdisNumber,
      participantAge: args.participantAge,
      participantGender: args.participantGender,
      sdaCategoryNeeded: args.sdaCategoryNeeded,
      preferredAreas: args.preferredAreas,
      preferredState: args.preferredState,
      specificRequirements: args.specificRequirements,
      budgetNotes: args.budgetNotes,
      status: "new",
      urgency: args.urgency,
      source: args.source,
      threadId,
      notes: args.notes,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-create communication thread via internal mutation
    await ctx.runMutation(internal.communications.autoCreateForLead, {
      organizationId,
      leadId,
      threadId,
      participantName: args.participantName,
      sdaCategoryNeeded: categoryLabel,
      preferredAreas: areasLabel,
      referrerName: args.referrerName,
      referrerType: args.referrerType,
      referrerEmail: args.referrerEmail,
      referrerPhone: args.referrerPhone,
      source: args.source,
      createdBy: args.userId,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "lead",
      entityId: leadId,
      entityName: `Lead: ${args.participantName} - ${categoryLabel}`,
      metadata: JSON.stringify({
        referrerName: args.referrerName,
        referrerType: args.referrerType,
        sdaCategoryNeeded: args.sdaCategoryNeeded,
        preferredAreas: args.preferredAreas,
        urgency: args.urgency,
        source: args.source,
      }),
    });

    return leadId;
  },
});

/**
 * Quick-create a lead with minimal fields (used from ThreadPickerModal).
 * Returns { leadId, threadId } so the caller can immediately move a
 * communication into the new lead's thread.
 */
export const quickCreate = mutation({
  args: {
    userId: v.id("users"),
    participantName: v.string(),
    referrerName: v.string(),
    referrerEmail: v.optional(v.string()),
    referrerPhone: v.optional(v.string()),
    sdaCategoryNeeded: v.union(
      v.literal("improved_liveability"),
      v.literal("fully_accessible"),
      v.literal("robust"),
      v.literal("high_physical_support")
    ),
    urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    source: v.union(v.literal("phone"), v.literal("email"), v.literal("referral"), v.literal("website")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "leads", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const now = Date.now();

    // Generate thread ID for linking to communications
    const threadId = `thread_lead_${now}_${Math.random().toString(36).substring(2, 9)}`;

    // Format SDA category for display
    const categoryLabel = args.sdaCategoryNeeded
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    // Create the lead with minimal fields
    const leadId = await ctx.db.insert("leads", {
      organizationId,
      referrerType: "other",
      referrerName: args.referrerName,
      referrerEmail: args.referrerEmail,
      referrerPhone: args.referrerPhone,
      participantName: args.participantName,
      sdaCategoryNeeded: args.sdaCategoryNeeded,
      preferredAreas: [],
      status: "new",
      urgency: args.urgency,
      source: args.source,
      threadId,
      notes: args.notes,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-create communication thread via internal mutation
    await ctx.runMutation(internal.communications.autoCreateForLead, {
      organizationId,
      leadId,
      threadId,
      participantName: args.participantName,
      sdaCategoryNeeded: categoryLabel,
      preferredAreas: "Not specified",
      referrerName: args.referrerName,
      referrerType: "other",
      referrerEmail: args.referrerEmail,
      referrerPhone: args.referrerPhone,
      source: args.source,
      createdBy: args.userId,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "lead",
      entityId: leadId,
      entityName: `Lead: ${args.participantName} - ${categoryLabel}`,
      metadata: JSON.stringify({
        referrerName: args.referrerName,
        sdaCategoryNeeded: args.sdaCategoryNeeded,
        urgency: args.urgency,
        source: args.source,
        quickCreate: true,
      }),
    });

    return { leadId, threadId };
  },
});

/**
 * Update lead details
 */
export const update = mutation({
  args: {
    userId: v.id("users"),
    leadId: v.id("leads"),
    referrerType: v.optional(v.union(v.literal("occupational_therapist"), v.literal("support_coordinator"), v.literal("other"))),
    referrerId: v.optional(v.string()),
    referrerName: v.optional(v.string()),
    referrerPhone: v.optional(v.string()),
    referrerEmail: v.optional(v.string()),
    referrerOrganization: v.optional(v.string()),
    participantName: v.optional(v.string()),
    participantNdisNumber: v.optional(v.string()),
    participantAge: v.optional(v.number()),
    participantGender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"), v.literal("prefer_not_to_say"))),
    sdaCategoryNeeded: v.optional(v.union(
      v.literal("improved_liveability"),
      v.literal("fully_accessible"),
      v.literal("robust"),
      v.literal("high_physical_support")
    )),
    preferredAreas: v.optional(v.array(v.string())),
    preferredState: v.optional(v.string()),
    specificRequirements: v.optional(v.string()),
    budgetNotes: v.optional(v.string()),
    urgency: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))),
    source: v.optional(v.union(v.literal("phone"), v.literal("email"), v.literal("referral"), v.literal("website"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "leads", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const existing = await ctx.db.get(args.leadId);
    if (!existing || existing.isDeleted === true) {
      throw new Error("Lead not found");
    }
    // Verify tenant ownership
    if (existing.organizationId !== organizationId) {
      throw new Error("Access denied: lead belongs to a different organization");
    }

    const now = Date.now();

    // Build update object with only provided fields
    const updates: Record<string, unknown> = { updatedAt: now };
    const previousValues: Record<string, unknown> = {};

    const fieldMap: Record<string, string> = {
      referrerType: "referrerType",
      referrerId: "referrerId",
      referrerName: "referrerName",
      referrerPhone: "referrerPhone",
      referrerEmail: "referrerEmail",
      referrerOrganization: "referrerOrganization",
      participantName: "participantName",
      participantNdisNumber: "participantNdisNumber",
      participantAge: "participantAge",
      participantGender: "participantGender",
      sdaCategoryNeeded: "sdaCategoryNeeded",
      preferredAreas: "preferredAreas",
      preferredState: "preferredState",
      specificRequirements: "specificRequirements",
      budgetNotes: "budgetNotes",
      urgency: "urgency",
      source: "source",
      notes: "notes",
    };

    for (const [argKey, dbKey] of Object.entries(fieldMap)) {
      if ((args as Record<string, unknown>)[argKey] !== undefined) {
        previousValues[dbKey] = (existing as Record<string, unknown>)[dbKey];
        updates[dbKey] = (args as Record<string, unknown>)[argKey];
      }
    }

    await ctx.db.patch(args.leadId, updates);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "lead",
      entityId: args.leadId,
      entityName: `Lead: ${updates.participantName || existing.participantName}`,
      changes: JSON.stringify(updates),
      previousValues: JSON.stringify(previousValues),
    });

    return args.leadId;
  },
});

/**
 * Update lead status with audit logging
 */
export const updateStatus = mutation({
  args: {
    userId: v.id("users"),
    leadId: v.id("leads"),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("viewing"),
      v.literal("waiting_list"),
      v.literal("placed"),
      v.literal("no_availability"),
      v.literal("lost")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "leads", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const existing = await ctx.db.get(args.leadId);
    if (!existing || existing.isDeleted === true) {
      throw new Error("Lead not found");
    }
    if (existing.organizationId !== organizationId) {
      throw new Error("Access denied: lead belongs to a different organization");
    }

    const previousStatus = existing.status;
    const now = Date.now();

    await ctx.db.patch(args.leadId, {
      status: args.status,
      updatedAt: now,
    });

    // Audit log for status change
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "lead",
      entityId: args.leadId,
      entityName: `Lead: ${existing.participantName}`,
      changes: JSON.stringify({ status: args.status }),
      previousValues: JSON.stringify({ status: previousStatus }),
      metadata: JSON.stringify({
        statusTransition: `${previousStatus} -> ${args.status}`,
      }),
    });

    return args.leadId;
  },
});

/**
 * Mark lead as placed - link to property/dwelling
 */
export const markPlaced = mutation({
  args: {
    userId: v.id("users"),
    leadId: v.id("leads"),
    matchedPropertyId: v.id("properties"),
    matchedDwellingId: v.optional(v.id("dwellings")),
    placedDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "leads", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const existing = await ctx.db.get(args.leadId);
    if (!existing || existing.isDeleted === true) {
      throw new Error("Lead not found");
    }
    if (existing.organizationId !== organizationId) {
      throw new Error("Access denied: lead belongs to a different organization");
    }

    const previousStatus = existing.status;
    const now = Date.now();

    await ctx.db.patch(args.leadId, {
      status: "placed",
      matchedPropertyId: args.matchedPropertyId,
      matchedDwellingId: args.matchedDwellingId,
      placedDate: args.placedDate,
      updatedAt: now,
    });

    // Get property details for audit
    const property = await ctx.db.get(args.matchedPropertyId);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "lead",
      entityId: args.leadId,
      entityName: `Lead Placed: ${existing.participantName}`,
      changes: JSON.stringify({
        status: "placed",
        matchedPropertyId: args.matchedPropertyId,
        matchedDwellingId: args.matchedDwellingId,
        placedDate: args.placedDate,
      }),
      previousValues: JSON.stringify({ status: previousStatus }),
      metadata: JSON.stringify({
        statusTransition: `${previousStatus} -> placed`,
        propertyName: property?.propertyName || property?.addressLine1 || "Unknown",
      }),
    });

    return args.leadId;
  },
});

/**
 * Mark lead as lost with reason
 */
export const markLost = mutation({
  args: {
    userId: v.id("users"),
    leadId: v.id("leads"),
    lostReason: v.union(v.literal("competitor"), v.literal("timing"), v.literal("unsuitable"), v.literal("budget"), v.literal("other")),
    lostNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "leads", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const existing = await ctx.db.get(args.leadId);
    if (!existing || existing.isDeleted === true) {
      throw new Error("Lead not found");
    }
    if (existing.organizationId !== organizationId) {
      throw new Error("Access denied: lead belongs to a different organization");
    }

    const previousStatus = existing.status;
    const now = Date.now();

    await ctx.db.patch(args.leadId, {
      status: "lost",
      lostReason: args.lostReason,
      lostNotes: args.lostNotes,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "lead",
      entityId: args.leadId,
      entityName: `Lead Lost: ${existing.participantName}`,
      changes: JSON.stringify({
        status: "lost",
        lostReason: args.lostReason,
        lostNotes: args.lostNotes,
      }),
      previousValues: JSON.stringify({ status: previousStatus }),
      metadata: JSON.stringify({
        statusTransition: `${previousStatus} -> lost`,
        lostReason: args.lostReason,
      }),
    });

    return args.leadId;
  },
});

/**
 * Soft delete a lead
 */
export const remove = mutation({
  args: {
    userId: v.id("users"),
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "leads", "delete");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const existing = await ctx.db.get(args.leadId);
    if (!existing || existing.isDeleted === true) {
      throw new Error("Lead not found");
    }
    if (existing.organizationId !== organizationId) {
      throw new Error("Access denied: lead belongs to a different organization");
    }

    const now = Date.now();

    await ctx.db.patch(args.leadId, {
      isDeleted: true,
      deletedAt: now,
      deletedBy: args.userId,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "delete",
      entityType: "lead",
      entityId: args.leadId,
      entityName: `Lead: ${existing.participantName}`,
      metadata: JSON.stringify({
        referrerName: existing.referrerName,
        sdaCategoryNeeded: existing.sdaCategoryNeeded,
        status: existing.status,
      }),
    });

    return args.leadId;
  },
});
