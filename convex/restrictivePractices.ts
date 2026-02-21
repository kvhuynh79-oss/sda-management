import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireTenant, requireActiveSubscription } from "./authHelpers";
import { Id } from "./_generated/dataModel";

// ============================================================================
// N1: Restrictive Practices Register — NDIS Practice Standards compliance
// ============================================================================

// Practice type labels for display
const PRACTICE_TYPE_LABELS: Record<string, string> = {
  environmental: "Environmental",
  chemical: "Chemical",
  mechanical: "Mechanical",
  physical: "Physical",
  seclusion: "Seclusion",
};

// ── Queries ──────────────────────────────────────────────────────────────────

export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "restrictivePractices", "view");

    const practices = await ctx.db
      .query("restrictivePractices")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Filter out soft-deleted
    const activePractices = practices.filter((p) => !p.isDeleted);

    // Enrich with participant and property names
    const enriched = await Promise.all(
      activePractices.map(async (practice) => {
        const participant = await ctx.db.get(practice.participantId);
        const property = await ctx.db.get(practice.propertyId);
        const implementer = practice.implementedBy ? await ctx.db.get(practice.implementedBy) : null;
        return {
          ...practice,
          participantName: participant
            ? `${participant.firstName} ${participant.lastName}`
            : "Unknown",
          propertyAddress: property
            ? `${property.addressLine1}, ${property.suburb}`
            : "Unknown",
          implementerName: implementer
            ? `${implementer.firstName} ${implementer.lastName}`
            : undefined,
          practiceTypeLabel: PRACTICE_TYPE_LABELS[practice.practiceType] || practice.practiceType,
        };
      })
    );

    return enriched;
  },
});

export const getById = query({
  args: {
    id: v.id("restrictivePractices"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "restrictivePractices", "view");

    const practice = await ctx.db.get(args.id);
    if (!practice || practice.isDeleted) {
      throw new Error("Restrictive practice record not found");
    }

    const participant = await ctx.db.get(practice.participantId);
    const property = await ctx.db.get(practice.propertyId);
    const implementer = practice.implementedBy ? await ctx.db.get(practice.implementedBy) : null;
    const creator = await ctx.db.get(practice.createdBy);

    return {
      ...practice,
      participantName: participant
        ? `${participant.firstName} ${participant.lastName}`
        : "Unknown",
      propertyAddress: property
        ? `${property.addressLine1}, ${property.suburb} ${property.state} ${property.postcode}`
        : "Unknown",
      implementerName: implementer
        ? `${implementer.firstName} ${implementer.lastName}`
        : undefined,
      creatorName: creator
        ? `${creator.firstName} ${creator.lastName}`
        : "Unknown",
      practiceTypeLabel: PRACTICE_TYPE_LABELS[practice.practiceType] || practice.practiceType,
    };
  },
});

export const getByParticipant = query({
  args: {
    participantId: v.id("participants"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "restrictivePractices", "view");

    const practices = await ctx.db
      .query("restrictivePractices")
      .withIndex("by_participantId", (q) => q.eq("participantId", args.participantId))
      .collect();

    return practices
      .filter((p) => !p.isDeleted)
      .map((p) => ({
        ...p,
        practiceTypeLabel: PRACTICE_TYPE_LABELS[p.practiceType] || p.practiceType,
      }));
  },
});

export const getDashboardStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "restrictivePractices", "view");

    const practices = await ctx.db
      .query("restrictivePractices")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const active = practices.filter((p) => !p.isDeleted);
    const today = new Date().toISOString().split("T")[0];
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
    const fourteenDaysStr = fourteenDaysFromNow.toISOString().split("T")[0];

    const activeCount = active.filter((p) => p.status === "active").length;
    const reviewsOverdue = active.filter(
      (p) => p.status === "active" && p.nextReviewDate < today
    ).length;
    const authorisationsExpiring = active.filter(
      (p) =>
        p.status === "active" &&
        p.authorisationExpiry >= today &&
        p.authorisationExpiry <= fourteenDaysStr
    ).length;
    const unauthorised = active.filter(
      (p) => p.status === "active" && !p.isAuthorised
    ).length;
    const unreported = active.filter(
      (p) => p.ndisReportable && !p.ndisReportedDate
    ).length;

    return {
      activeCount,
      reviewsOverdue,
      authorisationsExpiring,
      unauthorised,
      unreported,
      totalRecords: active.length,
    };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    propertyId: v.id("properties"),
    practiceType: v.union(
      v.literal("environmental"),
      v.literal("chemical"),
      v.literal("mechanical"),
      v.literal("physical"),
      v.literal("seclusion")
    ),
    description: v.string(),
    authorisedBy: v.string(),
    authorisationDate: v.string(),
    authorisationExpiry: v.string(),
    behaviourSupportPlanId: v.optional(v.string()),
    implementedBy: v.optional(v.id("users")),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    reviewFrequency: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("6_monthly"),
      v.literal("annually")
    ),
    nextReviewDate: v.string(),
    reductionStrategy: v.string(),
    ndisReportable: v.boolean(),
    isAuthorised: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "restrictivePractices", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await requireActiveSubscription(ctx, organizationId, auditUser);

    const now = Date.now();
    const id = await ctx.db.insert("restrictivePractices", {
      organizationId,
      participantId: args.participantId,
      propertyId: args.propertyId,
      practiceType: args.practiceType,
      description: args.description,
      authorisedBy: args.authorisedBy,
      authorisationDate: args.authorisationDate,
      authorisationExpiry: args.authorisationExpiry,
      behaviourSupportPlanId: args.behaviourSupportPlanId,
      implementedBy: args.implementedBy,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "active",
      reviewFrequency: args.reviewFrequency,
      nextReviewDate: args.nextReviewDate,
      reductionStrategy: args.reductionStrategy,
      ndisReportable: args.ndisReportable,
      isAuthorised: args.isAuthorised,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "restrictive_practice",
      entityId: id,
      entityName: `${PRACTICE_TYPE_LABELS[args.practiceType]} practice`,
      metadata: JSON.stringify({
        participantId: args.participantId,
        practiceType: args.practiceType,
        isAuthorised: args.isAuthorised,
        ndisReportable: args.ndisReportable,
      }),
    });

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("restrictivePractices"),
    userId: v.id("users"),
    description: v.optional(v.string()),
    authorisedBy: v.optional(v.string()),
    authorisationDate: v.optional(v.string()),
    authorisationExpiry: v.optional(v.string()),
    behaviourSupportPlanId: v.optional(v.string()),
    implementedBy: v.optional(v.id("users")),
    endDate: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("under_review"),
      v.literal("expired"),
      v.literal("ceased")
    )),
    reviewFrequency: v.optional(v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("6_monthly"),
      v.literal("annually")
    )),
    nextReviewDate: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    reductionStrategy: v.optional(v.string()),
    ndisReportable: v.optional(v.boolean()),
    ndisReportedDate: v.optional(v.string()),
    ndisReferenceNumber: v.optional(v.string()),
    isAuthorised: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "restrictivePractices", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await requireActiveSubscription(ctx, organizationId, auditUser);

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.isDeleted) {
      throw new Error("Restrictive practice record not found");
    }

    const { id, userId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    filteredUpdates.updatedAt = Date.now();

    await ctx.db.patch(args.id, filteredUpdates);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "restrictive_practice",
      entityId: args.id,
      changes: JSON.stringify(filteredUpdates),
    });

    return args.id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("restrictivePractices"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "restrictivePractices", "delete");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await requireActiveSubscription(ctx, organizationId, auditUser);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Restrictive practice record not found");
    }

    // Soft delete
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: args.userId,
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "delete",
      entityType: "restrictive_practice",
      entityId: args.id,
    });
  },
});

// ── Incident Logging ─────────────────────────────────────────────────────────

export const logIncident = mutation({
  args: {
    userId: v.id("users"),
    restrictivePracticeId: v.id("restrictivePractices"),
    date: v.string(),
    time: v.string(),
    duration: v.number(),
    implementedBy: v.id("users"),
    trigger: v.string(),
    participantResponse: v.string(),
    debrief: v.string(),
    injuries: v.boolean(),
    injuryDetails: v.optional(v.string()),
    witnessedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "restrictivePractices", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await requireActiveSubscription(ctx, organizationId, auditUser);

    const practice = await ctx.db.get(args.restrictivePracticeId);
    if (!practice || practice.isDeleted) {
      throw new Error("Restrictive practice record not found");
    }

    const id = await ctx.db.insert("restrictivePracticeIncidents", {
      organizationId,
      restrictivePracticeId: args.restrictivePracticeId,
      participantId: practice.participantId,
      date: args.date,
      time: args.time,
      duration: args.duration,
      implementedBy: args.implementedBy,
      trigger: args.trigger,
      participantResponse: args.participantResponse,
      debrief: args.debrief,
      injuries: args.injuries,
      injuryDetails: args.injuryDetails,
      witnessedBy: args.witnessedBy,
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "restrictive_practice_incident",
      entityId: id,
      metadata: JSON.stringify({
        restrictivePracticeId: args.restrictivePracticeId,
        injuries: args.injuries,
        duration: args.duration,
      }),
    });

    return id;
  },
});

export const getIncidents = query({
  args: {
    restrictivePracticeId: v.id("restrictivePractices"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "restrictivePractices", "view");

    const incidents = await ctx.db
      .query("restrictivePracticeIncidents")
      .withIndex("by_restrictivePracticeId", (q) =>
        q.eq("restrictivePracticeId", args.restrictivePracticeId)
      )
      .order("desc")
      .collect();

    // Enrich with user names
    const enriched = await Promise.all(
      incidents.map(async (inc) => {
        const implementer = await ctx.db.get(inc.implementedBy);
        const creator = await ctx.db.get(inc.createdBy);
        return {
          ...inc,
          implementerName: implementer
            ? `${implementer.firstName} ${implementer.lastName}`
            : "Unknown",
          creatorName: creator
            ? `${creator.firstName} ${creator.lastName}`
            : "Unknown",
        };
      })
    );

    return enriched;
  },
});

// ── Review ───────────────────────────────────────────────────────────────────

export const conductReview = mutation({
  args: {
    id: v.id("restrictivePractices"),
    userId: v.id("users"),
    reviewNotes: v.string(),
    nextReviewDate: v.string(),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("under_review"),
      v.literal("expired"),
      v.literal("ceased")
    )),
    reductionStrategy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "restrictivePractices", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await requireActiveSubscription(ctx, organizationId, auditUser);

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.isDeleted) {
      throw new Error("Restrictive practice record not found");
    }

    const today = new Date().toISOString().split("T")[0];
    const updates: Record<string, unknown> = {
      lastReviewDate: today,
      nextReviewDate: args.nextReviewDate,
      reviewNotes: args.reviewNotes,
      updatedAt: Date.now(),
    };

    if (args.status) {
      updates.status = args.status;
    }
    if (args.reductionStrategy) {
      updates.reductionStrategy = args.reductionStrategy;
    }

    await ctx.db.patch(args.id, updates);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "restrictive_practice",
      entityId: args.id,
      entityName: "Review conducted",
      changes: JSON.stringify(updates),
    });

    return args.id;
  },
});
