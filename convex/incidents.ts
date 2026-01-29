import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new incident report
export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    dwellingId: v.optional(v.id("dwellings")),
    participantId: v.optional(v.id("participants")),
    incidentType: v.union(
      v.literal("injury"),
      v.literal("near_miss"),
      v.literal("property_damage"),
      v.literal("behavioral"),
      v.literal("medication"),
      v.literal("abuse_neglect"),
      v.literal("complaint"),
      v.literal("other")
    ),
    severity: v.union(
      v.literal("minor"),
      v.literal("moderate"),
      v.literal("major"),
      v.literal("critical")
    ),
    title: v.string(),
    description: v.string(),
    incidentDate: v.string(),
    incidentTime: v.optional(v.string()),
    location: v.optional(v.string()),
    witnessNames: v.optional(v.string()),
    immediateActionTaken: v.optional(v.string()),
    followUpRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
    reportedToNdis: v.optional(v.boolean()),
    ndisReportDate: v.optional(v.string()),
    reportedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const incidentId = await ctx.db.insert("incidents", {
      ...args,
      status: "reported",
      createdAt: now,
      updatedAt: now,
    });
    return incidentId;
  },
});

// Get all incidents for a property
export const getByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .collect();

    // Get participant details for each incident
    const incidentsWithDetails = await Promise.all(
      incidents.map(async (incident) => {
        let participant = null;
        if (incident.participantId) {
          participant = await ctx.db.get(incident.participantId);
        }
        let dwelling = null;
        if (incident.dwellingId) {
          dwelling = await ctx.db.get(incident.dwellingId);
        }
        return {
          ...incident,
          participant,
          dwelling,
        };
      })
    );

    return incidentsWithDetails;
  },
});

// Get all incidents (with optional filters)
export const getAll = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let incidents;
    if (args.status) {
      incidents = await ctx.db
        .query("incidents")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .order("desc")
        .collect();
    } else {
      incidents = await ctx.db.query("incidents").order("desc").collect();
    }

    // Get details for each incident
    const incidentsWithDetails = await Promise.all(
      incidents.map(async (incident) => {
        const property = await ctx.db.get(incident.propertyId);
        let participant = null;
        if (incident.participantId) {
          participant = await ctx.db.get(incident.participantId);
        }
        let dwelling = null;
        if (incident.dwellingId) {
          dwelling = await ctx.db.get(incident.dwellingId);
        }
        return {
          ...incident,
          property,
          participant,
          dwelling,
        };
      })
    );

    return incidentsWithDetails;
  },
});

// Get incident by ID
export const getById = query({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) return null;

    const property = await ctx.db.get(incident.propertyId);
    let participant = null;
    if (incident.participantId) {
      participant = await ctx.db.get(incident.participantId);
    }
    let dwelling = null;
    if (incident.dwellingId) {
      dwelling = await ctx.db.get(incident.dwellingId);
    }

    // Get photos
    const photos = await ctx.db
      .query("incidentPhotos")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        return { ...photo, url };
      })
    );

    return {
      ...incident,
      property,
      participant,
      dwelling,
      photos: photosWithUrls,
    };
  },
});

// Update incident
export const update = mutation({
  args: {
    incidentId: v.id("incidents"),
    incidentType: v.optional(
      v.union(
        v.literal("injury"),
        v.literal("near_miss"),
        v.literal("property_damage"),
        v.literal("behavioral"),
        v.literal("medication"),
        v.literal("abuse_neglect"),
        v.literal("complaint"),
        v.literal("other")
      )
    ),
    severity: v.optional(
      v.union(
        v.literal("minor"),
        v.literal("moderate"),
        v.literal("major"),
        v.literal("critical")
      )
    ),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    incidentDate: v.optional(v.string()),
    incidentTime: v.optional(v.string()),
    location: v.optional(v.string()),
    witnessNames: v.optional(v.string()),
    immediateActionTaken: v.optional(v.string()),
    followUpRequired: v.optional(v.boolean()),
    followUpNotes: v.optional(v.string()),
    reportedToNdis: v.optional(v.boolean()),
    ndisReportDate: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("reported"),
        v.literal("under_investigation"),
        v.literal("resolved"),
        v.literal("closed")
      )
    ),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { incidentId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(incidentId, filteredUpdates);
    return { success: true };
  },
});

// Resolve incident
export const resolve = mutation({
  args: {
    incidentId: v.id("incidents"),
    resolvedBy: v.id("users"),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.incidentId, {
      status: "resolved",
      resolvedBy: args.resolvedBy,
      resolvedAt: Date.now(),
      resolutionNotes: args.resolutionNotes,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Add photo to incident
export const addPhoto = mutation({
  args: {
    incidentId: v.id("incidents"),
    storageId: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    description: v.optional(v.string()),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const photoId = await ctx.db.insert("incidentPhotos", {
      ...args,
      createdAt: Date.now(),
    });
    return photoId;
  },
});

// Delete incident photo
export const deletePhoto = mutation({
  args: { photoId: v.id("incidentPhotos") },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (photo) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(args.photoId);
    }
    return { success: true };
  },
});
