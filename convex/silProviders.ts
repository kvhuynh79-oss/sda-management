import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth, getUserFullName } from "./authHelpers";

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
    userId: v.id("users"),
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
    // Permission check - staff and above can create
    const user = await requireAuth(ctx, args.userId);
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

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "silProvider",
      entityId: providerId,
      entityName: args.companyName,
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
    userId: v.id("users"),
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
    // Permission check
    await requireAuth(ctx, args.userId);
    const { providerId, userId, ...updates } = args;

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
  args: {
    userId: v.id("users"),
    providerId: v.id("silProviders"),
  },
  handler: async (ctx, args) => {
    // Permission check - admin only
    await requirePermission(ctx, args.userId, "properties", "delete");
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

// ============================================
// PROPERTY ALLOCATION FUNCTIONS
// ============================================

// Link a property to a SIL provider
export const linkProperty = mutation({
  args: {
    silProviderId: v.id("silProviders"),
    propertyId: v.id("properties"),
    accessLevel: v.union(
      v.literal("full"),
      v.literal("incidents_only"),
      v.literal("maintenance_only"),
      v.literal("view_only")
    ),
    startDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if link already exists
    const existingLinks = await ctx.db
      .query("silProviderProperties")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .collect();

    const existing = existingLinks.find((l) => l.propertyId === args.propertyId);
    if (existing) {
      // Update existing link
      await ctx.db.patch(existing._id, {
        accessLevel: args.accessLevel,
        startDate: args.startDate,
        notes: args.notes,
        isActive: true,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new link
    const linkId = await ctx.db.insert("silProviderProperties", {
      silProviderId: args.silProviderId,
      propertyId: args.propertyId,
      accessLevel: args.accessLevel,
      startDate: args.startDate || new Date().toISOString().split("T")[0],
      notes: args.notes,
      isActive: true,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return linkId;
  },
});

// Unlink a property from a SIL provider
export const unlinkProperty = mutation({
  args: {
    linkId: v.id("silProviderProperties"),
  },
  handler: async (ctx, args) => {
    // Soft delete - mark as inactive with end date
    await ctx.db.patch(args.linkId, {
      isActive: false,
      endDate: new Date().toISOString().split("T")[0],
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Get properties for a SIL provider
export const getPropertiesForProvider = query({
  args: {
    silProviderId: v.id("silProviders"),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let links = await ctx.db
      .query("silProviderProperties")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .collect();

    // Filter active only unless includeInactive is true
    if (!args.includeInactive) {
      links = links.filter((l) => l.isActive);
    }

    // Get property details
    const properties = await Promise.all(
      links.map(async (link) => {
        const property = await ctx.db.get(link.propertyId);
        if (!property) return null;

        // Get dwellings for this property
        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .collect();

        // Get participants in these dwellings
        const participants = await Promise.all(
          dwellings.map(async (dwelling) => {
            return ctx.db
              .query("participants")
              .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
              .filter((q) => q.eq(q.field("status"), "active"))
              .collect();
          })
        );

        return {
          ...link,
          property,
          dwellings,
          participants: participants.flat(),
        };
      })
    );

    return properties.filter((p) => p !== null);
  },
});

// Get SIL providers for a property
export const getProvidersForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("silProviderProperties")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("isActive"), true))
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

// Get provider with all their properties (for detail view)
export const getByIdWithProperties = query({
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

    // Get linked properties
    const propertyLinks = await ctx.db
      .query("silProviderProperties")
      .withIndex("by_provider", (q) => q.eq("silProviderId", provider._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const properties = await Promise.all(
      propertyLinks.map(async (link) => {
        const property = await ctx.db.get(link.propertyId);
        if (!property) return null;

        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .collect();

        return {
          ...link,
          property,
          dwellings,
        };
      })
    );

    return {
      ...provider,
      participantHistory: participants.filter((p) => p !== null),
      allocatedProperties: properties.filter((p) => p !== null),
    };
  },
});

// Create a user account for SIL provider staff
export const createProviderUser = mutation({
  args: {
    silProviderId: v.id("silProviders"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    passwordHash: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("A user with this email already exists");
    }

    // Create the user with sil_provider role
    const userId = await ctx.db.insert("users", {
      email: args.email,
      passwordHash: args.passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      role: "sil_provider",
      phone: args.phone,
      silProviderId: args.silProviderId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

// Get users for a SIL provider
export const getProviderUsers = query({
  args: { silProviderId: v.id("silProviders") },
  handler: async (ctx, args) => {
    // Get all users with sil_provider role and matching silProviderId
    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "sil_provider"))
      .collect();

    return users.filter((u) => u.silProviderId === args.silProviderId);
  },
});

// ============================================
// DWELLING ALLOCATION FUNCTIONS
// ============================================

// Link a dwelling to a SIL provider
export const linkDwelling = mutation({
  args: {
    silProviderId: v.id("silProviders"),
    dwellingId: v.id("dwellings"),
    accessLevel: v.union(
      v.literal("full"),
      v.literal("incidents_only"),
      v.literal("maintenance_only"),
      v.literal("view_only")
    ),
    startDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if link already exists
    const existingLinks = await ctx.db
      .query("silProviderDwellings")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId))
      .collect();

    const existing = existingLinks.find((l) => l.silProviderId === args.silProviderId);
    if (existing) {
      // Update existing link
      await ctx.db.patch(existing._id, {
        accessLevel: args.accessLevel,
        startDate: args.startDate,
        notes: args.notes,
        isActive: true,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new link
    const linkId = await ctx.db.insert("silProviderDwellings", {
      silProviderId: args.silProviderId,
      dwellingId: args.dwellingId,
      accessLevel: args.accessLevel,
      startDate: args.startDate || new Date().toISOString().split("T")[0],
      notes: args.notes,
      isActive: true,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return linkId;
  },
});

// Unlink a dwelling from a SIL provider
export const unlinkDwelling = mutation({
  args: {
    linkId: v.id("silProviderDwellings"),
  },
  handler: async (ctx, args) => {
    // Soft delete - mark as inactive with end date
    await ctx.db.patch(args.linkId, {
      isActive: false,
      endDate: new Date().toISOString().split("T")[0],
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Get SIL providers for a dwelling
export const getProvidersForDwelling = query({
  args: { dwellingId: v.id("dwellings") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("silProviderDwellings")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId))
      .filter((q) => q.eq(q.field("isActive"), true))
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

// Get dwellings for a SIL provider
export const getDwellingsForProvider = query({
  args: {
    silProviderId: v.id("silProviders"),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let links = await ctx.db
      .query("silProviderDwellings")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .collect();

    // Filter active only unless includeInactive is true
    if (!args.includeInactive) {
      links = links.filter((l) => l.isActive);
    }

    // Get dwelling and property details
    const dwellings = await Promise.all(
      links.map(async (link) => {
        const dwelling = await ctx.db.get(link.dwellingId);
        if (!dwelling) return null;

        const property = await ctx.db.get(dwelling.propertyId);

        // Get participants in this dwelling
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        return {
          ...link,
          dwelling,
          property,
          participants,
        };
      })
    );

    return dwellings.filter((d) => d !== null);
  },
});