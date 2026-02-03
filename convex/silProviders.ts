import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

// SIL Services offered
export const SIL_SERVICES = [
  "24/7 Support",
  "Daily Living Assistance",
  "Community Access",
  "Personal Care",
  "Medication Support",
  "Meal Preparation",
  "Household Tasks",
  "Transport",
  "Behaviour Support",
  "Complex Care",
] as const;

// Create a new SIL provider
export const create = mutation({
  args: {
    companyName: v.string(),
    contactName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    abn: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    areas: v.array(v.string()),
    services: v.optional(v.array(v.string())),
    ndisRegistrationNumber: v.optional(v.string()),
    relationship: v.optional(v.string()),
    notes: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const providerId = await ctx.db.insert("silProviders", {
      companyName: args.companyName,
      contactName: args.contactName,
      email: args.email,
      phone: args.phone,
      abn: args.abn,
      address: args.address,
      suburb: args.suburb,
      state: args.state,
      postcode: args.postcode,
      areas: args.areas,
      services: args.services,
      ndisRegistrationNumber: args.ndisRegistrationNumber,
      relationship: args.relationship,
      notes: args.notes,
      rating: args.rating,
      totalParticipants: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return providerId;
  },
});

// Get all SIL providers
export const getAll = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    let providers;

    if (args.status) {
      providers = await ctx.db
        .query("silProviders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      providers = await ctx.db.query("silProviders").collect();
    }

    // Get participant counts for each provider
    const providersWithCounts = await Promise.all(
      providers.map(async (provider) => {
        const participantLinks = await ctx.db
          .query("silProviderParticipants")
          .withIndex("by_provider", (q) => q.eq("silProviderId", provider._id))
          .collect();

        return {
          ...provider,
          participantCount: participantLinks.length,
        };
      })
    );

    return providersWithCounts;
  },
});

// Get a single SIL provider by ID
export const getById = query({
  args: { providerId: v.id("silProviders") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return null;

    // Get linked participants
    const participantLinks = await ctx.db
      .query("silProviderParticipants")
      .withIndex("by_provider", (q) => q.eq("silProviderId", provider._id))
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
      ...provider,
      participantHistory: participants.filter((p) => p !== null),
    };
  },
});

// Get providers by area
export const getByArea = query({
  args: { area: v.string() },
  handler: async (ctx, args) => {
    const providers = await ctx.db
      .query("silProviders")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Filter by area (case-insensitive partial match)
    return providers.filter((p) =>
      p.areas.some(
        (a) =>
          a.toLowerCase().includes(args.area.toLowerCase()) ||
          args.area.toLowerCase().includes(a.toLowerCase())
      )
    );
  },
});

// Update a SIL provider
export const update = mutation({
  args: {
    providerId: v.id("silProviders"),
    companyName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    abn: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    areas: v.optional(v.array(v.string())),
    services: v.optional(v.array(v.string())),
    ndisRegistrationNumber: v.optional(v.string()),
    relationship: v.optional(v.string()),
    notes: v.optional(v.string()),
    rating: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    lastContactedDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { providerId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(providerId, filteredUpdates);
    return { success: true };
  },
});

// Delete a SIL provider
export const remove = mutation({
  args: { providerId: v.id("silProviders") },
  handler: async (ctx, args) => {
    // Delete participant links first
    const links = await ctx.db
      .query("silProviderParticipants")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.providerId))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.providerId);
    return { success: true };
  },
});

// Link a participant to a SIL provider
export const linkParticipant = mutation({
  args: {
    silProviderId: v.id("silProviders"),
    participantId: v.id("participants"),
    relationshipType: v.union(
      v.literal("current"),
      v.literal("past"),
      v.literal("inquiry")
    ),
    startDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if link already exists
    const existingLinks = await ctx.db
      .query("silProviderParticipants")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
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
    const linkId = await ctx.db.insert("silProviderParticipants", {
      silProviderId: args.silProviderId,
      participantId: args.participantId,
      relationshipType: args.relationshipType,
      startDate: args.startDate,
      notes: args.notes,
      createdAt: Date.now(),
    });

    // Update participant count
    if (args.relationshipType === "current") {
      const provider = await ctx.db.get(args.silProviderId);
      if (provider) {
        await ctx.db.patch(args.silProviderId, {
          totalParticipants: (provider.totalParticipants || 0) + 1,
        });
      }
    }

    return linkId;
  },
});

// Unlink a participant from a SIL provider
export const unlinkParticipant = mutation({
  args: {
    linkId: v.id("silProviderParticipants"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.linkId);
    return { success: true };
  },
});

// Get providers for a specific participant
export const getByParticipant = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("silProviderParticipants")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .collect();

    const providers = await Promise.all(
      links.map(async (link) => {
        const provider = await ctx.db.get(link.silProviderId);
        return {
          ...link,
          provider,
        };
      })
    );

    return providers.filter((p) => p.provider !== null);
  },
});

// Search SIL providers
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const providers = await ctx.db.query("silProviders").collect();

    const term = args.searchTerm.toLowerCase();

    return providers.filter(
      (p) =>
        p.companyName.toLowerCase().includes(term) ||
        (p.contactName && p.contactName.toLowerCase().includes(term)) ||
        p.email.toLowerCase().includes(term) ||
        p.areas.some((a) => a.toLowerCase().includes(term))
    );
  },
});