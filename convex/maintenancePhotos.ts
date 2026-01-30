import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate upload URL for file storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Add a photo to a maintenance request
export const addPhoto = mutation({
  args: {
    maintenanceRequestId: v.id("maintenanceRequests"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    description: v.optional(v.string()),
    photoType: v.union(
      v.literal("before"),
      v.literal("during"),
      v.literal("after"),
      v.literal("issue")
    ),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const photoId = await ctx.db.insert("maintenancePhotos", {
      ...args,
      createdAt: Date.now(),
    });
    return photoId;
  },
});

// Get all photos for a maintenance request
export const getByMaintenanceRequest = query({
  args: { maintenanceRequestId: v.id("maintenanceRequests") },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("maintenancePhotos")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", args.maintenanceRequestId)
      )
      .collect();

    // Get URLs for each photo
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        return {
          ...photo,
          url,
        };
      })
    );

    return photosWithUrls;
  },
});

// Update photo description
export const updateDescription = mutation({
  args: {
    photoId: v.id("maintenancePhotos"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, {
      description: args.description,
    });
    return { success: true };
  },
});

// Delete a photo
export const deletePhoto = mutation({
  args: { photoId: v.id("maintenancePhotos") },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (photo) {
      // Delete from storage
      await ctx.storage.delete(photo.storageId);
      // Delete record
      await ctx.db.delete(args.photoId);
    }
    return { success: true };
  },
});
