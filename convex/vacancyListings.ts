import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create or update vacancy listing for a dwelling
export const upsert = mutation({
  args: {
    dwellingId: v.id("dwellings"),
    goNestListed: v.optional(v.boolean()),
    goNestListedDate: v.optional(v.string()),
    goNestListingUrl: v.optional(v.string()),
    housingHubListed: v.optional(v.boolean()),
    housingHubListedDate: v.optional(v.string()),
    housingHubListingUrl: v.optional(v.string()),
    ndisNotified: v.optional(v.boolean()),
    ndisNotifiedDate: v.optional(v.string()),
    ndisReferenceNumber: v.optional(v.string()),
    vacancyStatus: v.optional(
      v.union(
        v.literal("open"),
        v.literal("pending"),
        v.literal("filled"),
        v.literal("on_hold")
      )
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { dwellingId, ...updates } = args;
    const now = Date.now();

    // Check if listing exists
    const existing = await ctx.db
      .query("vacancyListings")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwellingId))
      .first();

    if (existing) {
      // Update existing
      const filteredUpdates: Record<string, unknown> = { updatedAt: now };
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          filteredUpdates[key] = value;
        }
      }
      await ctx.db.patch(existing._id, filteredUpdates);
      return existing._id;
    }

    // Create new
    const listingId = await ctx.db.insert("vacancyListings", {
      dwellingId,
      goNestListed: updates.goNestListed ?? false,
      goNestListedDate: updates.goNestListedDate,
      goNestListingUrl: updates.goNestListingUrl,
      housingHubListed: updates.housingHubListed ?? false,
      housingHubListedDate: updates.housingHubListedDate,
      housingHubListingUrl: updates.housingHubListingUrl,
      ndisNotified: updates.ndisNotified ?? false,
      ndisNotifiedDate: updates.ndisNotifiedDate,
      ndisReferenceNumber: updates.ndisReferenceNumber,
      vacancyStatus: updates.vacancyStatus ?? "open",
      notes: updates.notes,
      createdAt: now,
      updatedAt: now,
    });

    return listingId;
  },
});

// Get vacancy listing for a dwelling
export const getByDwelling = query({
  args: { dwellingId: v.id("dwellings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db
      .query("vacancyListings")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId))
      .first();

    if (!listing) return null;

    // Get notified coordinators
    const coordinators = listing.coordinatorsNotified
      ? await Promise.all(
          listing.coordinatorsNotified.map(async (id) => {
            const coordinator = await ctx.db.get(id);
            return coordinator;
          })
        )
      : [];

    return {
      ...listing,
      notifiedCoordinators: coordinators.filter((c) => c !== null),
    };
  },
});

// Get all vacancy listings (with dwelling and property info)
export const getAll = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("pending"),
        v.literal("filled"),
        v.literal("on_hold")
      )
    ),
  },
  handler: async (ctx, args) => {
    let listings;

    if (args.status) {
      listings = await ctx.db
        .query("vacancyListings")
        .withIndex("by_status", (q) => q.eq("vacancyStatus", args.status!))
        .collect();
    } else {
      listings = await ctx.db
        .query("vacancyListings")
        .collect();
    }

    // Enrich with dwelling and property info
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => {
        const dwelling = await ctx.db.get(listing.dwellingId);
        const property = dwelling
          ? await ctx.db.get(dwelling.propertyId)
          : null;

        return {
          ...listing,
          dwelling,
          property,
        };
      })
    );

    return enrichedListings;
  },
});

// Record coordinator notification
export const notifyCoordinator = mutation({
  args: {
    dwellingId: v.id("dwellings"),
    coordinatorId: v.id("supportCoordinators"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    // Get or create listing
    let listing = await ctx.db
      .query("vacancyListings")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId))
      .first();

    if (!listing) {
      const listingId = await ctx.db.insert("vacancyListings", {
        dwellingId: args.dwellingId,
        coordinatorsNotified: [args.coordinatorId],
        lastNotificationDate: today,
        vacancyStatus: "open",
        createdAt: now,
        updatedAt: now,
      });
      return listingId;
    }

    // Add coordinator to list if not already there
    const notified = listing.coordinatorsNotified || [];
    if (!notified.includes(args.coordinatorId)) {
      notified.push(args.coordinatorId);
    }

    await ctx.db.patch(listing._id, {
      coordinatorsNotified: notified,
      lastNotificationDate: today,
      updatedAt: now,
    });

    // Update coordinator's last contacted date
    await ctx.db.patch(args.coordinatorId, {
      lastContactedDate: today,
    });

    return listing._id;
  },
});

// Get vacancy summary (for dashboard)
export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    // Get all vacant or partially occupied dwellings
    const dwellings = await ctx.db
      .query("dwellings")
      .filter((q) =>
        q.or(
          q.eq(q.field("occupancyStatus"), "vacant"),
          q.eq(q.field("occupancyStatus"), "partially_occupied")
        )
      )
      .collect();

    // Get listings for these dwellings
    const summary = await Promise.all(
      dwellings.map(async (dwelling) => {
        const property = await ctx.db.get(dwelling.propertyId);
        const listing = await ctx.db
          .query("vacancyListings")
          .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
          .first();

        const vacantSpots = dwelling.maxParticipants - dwelling.currentOccupancy;

        return {
          dwelling,
          property,
          listing,
          vacantSpots,
          isFullyListed: listing
            ? listing.goNestListed && listing.housingHubListed && listing.ndisNotified
            : false,
        };
      })
    );

    return {
      totalVacantDwellings: summary.filter((s) => s.dwelling.occupancyStatus === "vacant").length,
      totalPartiallyOccupied: summary.filter((s) => s.dwelling.occupancyStatus === "partially_occupied").length,
      totalVacantSpots: summary.reduce((sum, s) => sum + s.vacantSpots, 0),
      fullyListedCount: summary.filter((s) => s.isFullyListed).length,
      vacancies: summary,
    };
  },
});
