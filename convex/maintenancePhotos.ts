import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireTenant } from "./authHelpers";

// Generate upload URL for file storage
export const generateUploadUrl = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
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
    const { organizationId } = await requireTenant(ctx, args.uploadedBy);

    // Verify maintenance request belongs to user's organization and get its organizationId
    const maintenanceRequest = await ctx.db.get(args.maintenanceRequestId);
    if (!maintenanceRequest) {
      throw new Error("Maintenance request not found");
    }
    if (maintenanceRequest.organizationId !== organizationId) {
      throw new Error("Access denied: maintenance request belongs to different organization");
    }

    const photoId = await ctx.db.insert("maintenancePhotos", {
      ...args,
      organizationId,  // Inherit from parent
      createdAt: Date.now(),
    });
    return photoId;
  },
});

// Get all photos for a maintenance request
export const getByMaintenanceRequest = query({
  args: {
    userId: v.id("users"),
    maintenanceRequestId: v.id("maintenanceRequests")
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify maintenance request belongs to user's organization
    const maintenanceRequest = await ctx.db.get(args.maintenanceRequestId);
    if (!maintenanceRequest || maintenanceRequest.organizationId !== organizationId) {
      return [];
    }

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
    userId: v.id("users"),
    photoId: v.id("maintenancePhotos"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new Error("Photo not found");
    }
    if (photo.organizationId !== organizationId) {
      throw new Error("Access denied: photo belongs to different organization");
    }

    await ctx.db.patch(args.photoId, {
      description: args.description,
    });
    return { success: true };
  },
});

// Delete a photo
export const deletePhoto = mutation({
  args: {
    userId: v.id("users"),
    photoId: v.id("maintenancePhotos"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const photo = await ctx.db.get(args.photoId);
    if (photo) {
      if (photo.organizationId !== organizationId) {
        throw new Error("Access denied: photo belongs to different organization");
      }
      // Delete from storage
      await ctx.storage.delete(photo.storageId);
      // Delete record
      await ctx.db.delete(args.photoId);
    }
    return { success: true };
  },
});
