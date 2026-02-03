import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./authHelpers";

// Predefined Sydney regions (same as support coordinators)
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

// OT Specializations
export const OT_SPECIALIZATIONS = [
  "SDA Assessments",
  "AT Prescription",
  "Home Modifications",
  "Functional Capacity",
  "Seating & Positioning",
  "Vehicle Modifications",
  "Complex Rehab",
  "Mental Health",
  "Paediatric",
  "Aged Care",
] as const;

// Create a new OT
export const create = mutation({
  args: {
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    organization: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    abn: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    areas: v.array(v.string()),
    specializations: v.optional(v.array(v.string())),
    ahpraNumber: v.optional(v.string()),
    relationship: v.optional(v.string()),
    notes: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const now = Date.now();

    const otId = await ctx.db.insert("occupationalTherapists", {
      firstName: args.firstName,
      lastName: args.lastName,
      organization: args.organization,
      email: args.email,
      phone: args.phone,
      abn: args.abn,
      address: args.address,
      suburb: args.suburb,
      state: args.state,
      postcode: args.postcode,
      areas: args.areas,
      specializations: args.specializations,
      ahpraNumber: args.ahpraNumber,
      relationship: args.relationship,
      notes: args.notes,
      rating: args.rating,
      totalAssessments: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return otId;
  },
});

// Get all OTs
export const getAll = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    let therapists;

    if (args.status) {
      therapists = await ctx.db
        .query("occupationalTherapists")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      therapists = await ctx.db.query("occupationalTherapists").collect();
    }

    // Get participant counts for each OT
    const therapistsWithCounts = await Promise.all(
      therapists.map(async (therapist) => {
        const participantLinks = await ctx.db
          .query("otParticipants")
          .withIndex("by_ot", (q) => q.eq("occupationalTherapistId", therapist._id))
          .collect();

        return {
          ...therapist,
          participantCount: participantLinks.length,
        };
      })
    );

    return therapistsWithCounts;
  },
});

// Get a single OT by ID
export const getById = query({
  args: { otId: v.id("occupationalTherapists") },
  handler: async (ctx, args) => {
    const therapist = await ctx.db.get(args.otId);
    if (!therapist) return null;

    // Get linked participants
    const participantLinks = await ctx.db
      .query("otParticipants")
      .withIndex("by_ot", (q) => q.eq("occupationalTherapistId", therapist._id))
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
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        return {
          ...link,
          participant,
          dwelling,
          property,
        };
      })
    );

    return {
      ...therapist,
      participantHistory: participants.filter((p) => p !== null),
    };
  },
});

// Update an OT
export const update = mutation({
  args: {
    userId: v.id("users"),
    otId: v.id("occupationalTherapists"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    organization: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    abn: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    areas: v.optional(v.array(v.string())),
    specializations: v.optional(v.array(v.string())),
    ahpraNumber: v.optional(v.string()),
    relationship: v.optional(v.string()),
    notes: v.optional(v.string()),
    rating: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    lastContactedDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const { otId, userId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(otId, filteredUpdates);
    return { success: true };
  },
});

// Delete an OT
export const remove = mutation({
  args: {
    userId: v.id("users"),
    otId: v.id("occupationalTherapists"),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    // Delete participant links first
    const links = await ctx.db
      .query("otParticipants")
      .withIndex("by_ot", (q) => q.eq("occupationalTherapistId", args.otId))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.otId);
    return { success: true };
  },
});

// Link a participant to an OT
export const linkParticipant = mutation({
  args: {
    userId: v.id("users"),
    occupationalTherapistId: v.id("occupationalTherapists"),
    participantId: v.id("participants"),
    relationshipType: v.union(
      v.literal("sda_assessment"),
      v.literal("ongoing"),
      v.literal("at_prescription"),
      v.literal("home_mod"),
      v.literal("inquiry")
    ),
    assessmentDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    // Check if link already exists
    const existingLinks = await ctx.db
      .query("otParticipants")
      .withIndex("by_ot", (q) =>
        q.eq("occupationalTherapistId", args.occupationalTherapistId)
      )
      .collect();

    const existing = existingLinks.find((l) => l.participantId === args.participantId);
    if (existing) {
      // Update existing link
      await ctx.db.patch(existing._id, {
        relationshipType: args.relationshipType,
        assessmentDate: args.assessmentDate,
        notes: args.notes,
      });
      return existing._id;
    }

    // Create new link
    const linkId = await ctx.db.insert("otParticipants", {
      occupationalTherapistId: args.occupationalTherapistId,
      participantId: args.participantId,
      relationshipType: args.relationshipType,
      assessmentDate: args.assessmentDate,
      notes: args.notes,
      createdAt: Date.now(),
    });

    // Update assessment count if this is an SDA assessment
    if (args.relationshipType === "sda_assessment") {
      const therapist = await ctx.db.get(args.occupationalTherapistId);
      if (therapist) {
        await ctx.db.patch(args.occupationalTherapistId, {
          totalAssessments: (therapist.totalAssessments || 0) + 1,
        });
      }
    }

    return linkId;
  },
});

// Unlink a participant from an OT
export const unlinkParticipant = mutation({
  args: {
    userId: v.id("users"),
    linkId: v.id("otParticipants"),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    await ctx.db.delete(args.linkId);
    return { success: true };
  },
});

// Search OTs
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const therapists = await ctx.db.query("occupationalTherapists").collect();

    const term = args.searchTerm.toLowerCase();

    return therapists.filter(
      (t) =>
        t.firstName.toLowerCase().includes(term) ||
        t.lastName.toLowerCase().includes(term) ||
        (t.organization && t.organization.toLowerCase().includes(term)) ||
        t.email.toLowerCase().includes(term) ||
        t.areas.some((a) => a.toLowerCase().includes(term)) ||
        (t.specializations &&
          t.specializations.some((s) => s.toLowerCase().includes(term)))
    );
  },
});
