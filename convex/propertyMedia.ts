import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenant } from "./authHelpers";

// Get all media for a property
export const getByProperty = query({
  args: {
    userId: v.id("users"),
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify property belongs to this organization
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.organizationId !== organizationId) return [];

    const media = await ctx.db
      .query("propertyMedia")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    // Get download URLs for all media
    const mediaWithUrls = await Promise.all(
      media.map(async (item) => {
        const url = await ctx.storage.getUrl(item.storageId);
        return {
          ...item,
          url,
        };
      })
    );

    // Sort by sortOrder (if set), then by createdAt
    return mediaWithUrls.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      return b.createdAt - a.createdAt;
    });
  },
});

// Generate upload URL for new media
export const generateUploadUrl = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);
    return await ctx.storage.generateUploadUrl();
  },
});

// Save media record after upload
export const saveMedia = mutation({
  args: {
    propertyId: v.id("properties"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    mediaType: v.union(v.literal("photo"), v.literal("video")),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isFeatured: v.optional(v.boolean()),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.uploadedBy);

    // Verify property belongs to this organization
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.organizationId !== organizationId) {
      throw new Error("Property not found or does not belong to this organization");
    }
    // If setting as featured, unset any existing featured media
    if (args.isFeatured) {
      const existingFeatured = await ctx.db
        .query("propertyMedia")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .filter((q) => q.eq(q.field("isFeatured"), true))
        .collect();

      for (const media of existingFeatured) {
        await ctx.db.patch(media._id, { isFeatured: false });
      }
    }

    // Get current max sort order
    const existingMedia = await ctx.db
      .query("propertyMedia")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    const maxOrder = existingMedia.reduce(
      (max, m) => Math.max(max, m.sortOrder || 0),
      0
    );

    const mediaId = await ctx.db.insert("propertyMedia", {
      organizationId,
      propertyId: args.propertyId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      mediaType: args.mediaType,
      title: args.title,
      description: args.description,
      isFeatured: args.isFeatured || false,
      sortOrder: maxOrder + 1,
      uploadedBy: args.uploadedBy,
      createdAt: Date.now(),
    });

    return mediaId;
  },
});

// Update media details
export const updateMedia = mutation({
  args: {
    userId: v.id("users"),
    mediaId: v.id("propertyMedia"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isFeatured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { mediaId, userId, ...updates } = args;
    const media = await ctx.db.get(mediaId);
    if (!media || media.organizationId !== organizationId) throw new Error("Media not found");

    // If setting as featured, unset any existing featured media
    if (updates.isFeatured) {
      const existingFeatured = await ctx.db
        .query("propertyMedia")
        .withIndex("by_property", (q) => q.eq("propertyId", media.propertyId))
        .filter((q) => q.eq(q.field("isFeatured"), true))
        .collect();

      for (const m of existingFeatured) {
        if (m._id !== mediaId) {
          await ctx.db.patch(m._id, { isFeatured: false });
        }
      }
    }

    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(mediaId, filteredUpdates);
    return { success: true };
  },
});

// Delete media
export const deleteMedia = mutation({
  args: {
    userId: v.id("users"),
    mediaId: v.id("propertyMedia"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const media = await ctx.db.get(args.mediaId);
    if (!media || media.organizationId !== organizationId) throw new Error("Media not found");

    // Delete from storage
    await ctx.storage.delete(media.storageId);

    // Delete record
    await ctx.db.delete(args.mediaId);

    return { success: true };
  },
});

// Reorder media (update sort orders)
export const reorderMedia = mutation({
  args: {
    userId: v.id("users"),
    propertyId: v.id("properties"),
    mediaOrder: v.array(v.id("propertyMedia")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify property belongs to this organization
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.organizationId !== organizationId) {
      throw new Error("Property not found");
    }

    for (let i = 0; i < args.mediaOrder.length; i++) {
      await ctx.db.patch(args.mediaOrder[i], { sortOrder: i });
    }
    return { success: true };
  },
});

// Set featured media
export const setFeatured = mutation({
  args: {
    userId: v.id("users"),
    mediaId: v.id("propertyMedia"),
    isFeatured: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const media = await ctx.db.get(args.mediaId);
    if (!media || media.organizationId !== organizationId) throw new Error("Media not found");

    if (args.isFeatured) {
      // Unset any existing featured
      const existingFeatured = await ctx.db
        .query("propertyMedia")
        .withIndex("by_property", (q) => q.eq("propertyId", media.propertyId))
        .filter((q) => q.eq(q.field("isFeatured"), true))
        .collect();

      for (const m of existingFeatured) {
        await ctx.db.patch(m._id, { isFeatured: false });
      }
    }

    await ctx.db.patch(args.mediaId, { isFeatured: args.isFeatured });
    return { success: true };
  },
});
