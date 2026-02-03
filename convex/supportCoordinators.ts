import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuth } from "./authHelpers";

// Predefined Sydney regions
export const SYDNEY_REGIONS = [
  "Northern Sydney",
  "North Shore",
  "Northern Beaches",
  "Inner West",
  "Eastern Suburbs",
  "Western Sydney",
  "South Western Sydney",
  "Southern Sydney",
  "Hills District",
  "Central Coast",
  "Newcastle/Hunter",
  "Wollongong/Illawarra",
  "Blue Mountains",
  "Other",
] as const;

// Create a new support coordinator
export const create = mutation({
  args: {
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    organization: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    areas: v.array(v.string()),
    relationship: v.optional(v.string()),
    notes: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const now = Date.now();

    const coordinatorId = await ctx.db.insert("supportCoordinators", {
      firstName: args.firstName,
      lastName: args.lastName,
      organization: args.organization,
      email: args.email,
      phone: args.phone,
      areas: args.areas,
      relationship: args.relationship,
      notes: args.notes,
      rating: args.rating,
      totalReferrals: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return coordinatorId;
  },
});

// Get all support coordinators
export const getAll = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    let coordinators;

    if (args.status) {
      coordinators = await ctx.db
        .query("supportCoordinators")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      coordinators = await ctx.db
        .query("supportCoordinators")
        .collect();
    }

    // Get participant counts for each coordinator
    const coordinatorsWithCounts = await Promise.all(
      coordinators.map(async (coordinator) => {
        const participantLinks = await ctx.db
          .query("supportCoordinatorParticipants")
          .withIndex("by_coordinator", (q) => q.eq("supportCoordinatorId", coordinator._id))
          .collect();

        return {
          ...coordinator,
          participantCount: participantLinks.length,
        };
      })
    );

    return coordinatorsWithCounts;
  },
});

// Get a single support coordinator by ID
export const getById = query({
  args: { coordinatorId: v.id("supportCoordinators") },
  handler: async (ctx, args) => {
    const coordinator = await ctx.db.get(args.coordinatorId);
    if (!coordinator) return null;

    // Get linked participants
    const participantLinks = await ctx.db
      .query("supportCoordinatorParticipants")
      .withIndex("by_coordinator", (q) => q.eq("supportCoordinatorId", coordinator._id))
      .collect();

    // Get participant details
    const participants = await Promise.all(
      participantLinks.map(async (link) => {
        const participant = await ctx.db.get(link.participantId);
        if (!participant) return null;

        // Get dwelling info
        const dwelling = participant.dwellingId
          ? await ctx.db.get(participant.dwellingId)
          : null;
        const property = dwelling
          ? await ctx.db.get(dwelling.propertyId)
          : null;

        return {
          ...link,
          participant,
          dwelling,
          property,
        };
      })
    );

    return {
      ...coordinator,
      participantHistory: participants.filter((p) => p !== null),
    };
  },
});

// Get coordinators by area (for vacancy notifications)
export const getByArea = query({
  args: { area: v.string() },
  handler: async (ctx, args) => {
    const coordinators = await ctx.db
      .query("supportCoordinators")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Filter by area (case-insensitive partial match)
    return coordinators.filter((c) =>
      c.areas.some((a) =>
        a.toLowerCase().includes(args.area.toLowerCase()) ||
        args.area.toLowerCase().includes(a.toLowerCase())
      )
    );
  },
});

// Update a support coordinator
export const update = mutation({
  args: {
    userId: v.id("users"),
    coordinatorId: v.id("supportCoordinators"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    organization: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    areas: v.optional(v.array(v.string())),
    relationship: v.optional(v.string()),
    notes: v.optional(v.string()),
    rating: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    lastContactedDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const { coordinatorId, userId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(coordinatorId, filteredUpdates);
    return { success: true };
  },
});

// Delete a support coordinator
export const remove = mutation({
  args: {
    userId: v.id("users"),
    coordinatorId: v.id("supportCoordinators"),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    // Delete participant links first
    const links = await ctx.db
      .query("supportCoordinatorParticipants")
      .withIndex("by_coordinator", (q) => q.eq("supportCoordinatorId", args.coordinatorId))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.coordinatorId);
    return { success: true };
  },
});

// Link a participant to a coordinator
export const linkParticipant = mutation({
  args: {
    userId: v.id("users"),
    supportCoordinatorId: v.id("supportCoordinators"),
    participantId: v.id("participants"),
    relationshipType: v.union(
      v.literal("referred"),
      v.literal("current"),
      v.literal("past"),
      v.literal("inquiry")
    ),
    startDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    // Check if link already exists
    const existingLinks = await ctx.db
      .query("supportCoordinatorParticipants")
      .withIndex("by_coordinator", (q) => q.eq("supportCoordinatorId", args.supportCoordinatorId))
      .collect();

    const existing = existingLinks.find((l) => l.participantId === args.participantId);
    if (existing) {
      // Update existing link
      await ctx.db.patch(existing._id, {
        relationshipType: args.relationshipType,
        startDate: args.startDate,
        notes: args.notes,
      });
      return existing._id;
    }

    // Create new link
    const linkId = await ctx.db.insert("supportCoordinatorParticipants", {
      supportCoordinatorId: args.supportCoordinatorId,
      participantId: args.participantId,
      relationshipType: args.relationshipType,
      startDate: args.startDate,
      notes: args.notes,
      createdAt: Date.now(),
    });

    // Update referral count if this is a referral
    if (args.relationshipType === "referred") {
      const coordinator = await ctx.db.get(args.supportCoordinatorId);
      if (coordinator) {
        await ctx.db.patch(args.supportCoordinatorId, {
          totalReferrals: (coordinator.totalReferrals || 0) + 1,
        });
      }
    }

    return linkId;
  },
});

// Unlink a participant from a coordinator
export const unlinkParticipant = mutation({
  args: {
    userId: v.id("users"),
    linkId: v.id("supportCoordinatorParticipants"),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    await ctx.db.delete(args.linkId);
    return { success: true };
  },
});

// Get coordinators for a specific participant
export const getByParticipant = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("supportCoordinatorParticipants")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .collect();

    const coordinators = await Promise.all(
      links.map(async (link) => {
        const coordinator = await ctx.db.get(link.supportCoordinatorId);
        return {
          ...link,
          coordinator,
        };
      })
    );

    return coordinators.filter((c) => c.coordinator !== null);
  },
});

// Search coordinators
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const coordinators = await ctx.db
      .query("supportCoordinators")
      .collect();

    const term = args.searchTerm.toLowerCase();

    return coordinators.filter((c) =>
      c.firstName.toLowerCase().includes(term) ||
      c.lastName.toLowerCase().includes(term) ||
      (c.organization && c.organization.toLowerCase().includes(term)) ||
      c.email.toLowerCase().includes(term) ||
      c.areas.some((a) => a.toLowerCase().includes(term))
    );
  },
});

// Migration: Extract support coordinators from existing participant data
export const migrateFromParticipants = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all participants with support coordinator info
    const participants = await ctx.db.query("participants").collect();

    // Group by unique coordinator (using email as primary key, fallback to name)
    const coordinatorMap = new Map<string, {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      participantIds: Id<"participants">[];
    }>();

    for (const participant of participants) {
      if (!participant.supportCoordinatorName) continue;

      // Parse name into first/last
      const nameParts = participant.supportCoordinatorName.trim().split(/\s+/);
      const firstName = nameParts[0] || "Unknown";
      const lastName = nameParts.slice(1).join(" ") || "Coordinator";

      // Use email as key if available, otherwise use full name
      const key = participant.supportCoordinatorEmail?.toLowerCase() ||
                  participant.supportCoordinatorName.toLowerCase().trim();

      if (coordinatorMap.has(key)) {
        // Add participant to existing coordinator
        coordinatorMap.get(key)!.participantIds.push(participant._id);
      } else {
        // Create new coordinator entry
        coordinatorMap.set(key, {
          firstName,
          lastName,
          email: participant.supportCoordinatorEmail || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@placeholder.com`,
          phone: participant.supportCoordinatorPhone,
          participantIds: [participant._id],
        });
      }
    }

    const results = {
      coordinatorsCreated: 0,
      linksCreated: 0,
      skipped: 0,
    };

    // Create coordinators and links
    for (const [, data] of coordinatorMap) {
      // Check if coordinator already exists by email
      const existing = await ctx.db
        .query("supportCoordinators")
        .withIndex("by_email", (q) => q.eq("email", data.email))
        .first();

      let coordinatorId: Id<"supportCoordinators">;

      if (existing) {
        coordinatorId = existing._id;
        results.skipped++;
      } else {
        // Create new coordinator
        coordinatorId = await ctx.db.insert("supportCoordinators", {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          areas: ["Western Sydney"], // Default area - can be updated later
          status: "active",
          totalReferrals: data.participantIds.length,
          createdAt: now,
          updatedAt: now,
        });
        results.coordinatorsCreated++;
      }

      // Create links for each participant
      for (const participantId of data.participantIds) {
        // Check if link already exists
        const existingLinks = await ctx.db
          .query("supportCoordinatorParticipants")
          .withIndex("by_participant", (q) => q.eq("participantId", participantId))
          .collect();

        const hasLink = existingLinks.some((l) => l.supportCoordinatorId === coordinatorId);

        if (!hasLink) {
          await ctx.db.insert("supportCoordinatorParticipants", {
            supportCoordinatorId: coordinatorId,
            participantId,
            relationshipType: "current",
            createdAt: now,
          });
          results.linksCreated++;
        }
      }
    }

    return results;
  },
});
