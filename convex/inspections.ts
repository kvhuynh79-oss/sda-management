import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ============================================
// INSPECTION TEMPLATES
// ============================================

// Get all active inspection templates
export const getTemplates = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.includeInactive) {
      return await ctx.db.query("inspectionTemplates").collect();
    }
    return await ctx.db
      .query("inspectionTemplates")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get a single template by ID
export const getTemplateById = query({
  args: { templateId: v.id("inspectionTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

// Create a new inspection template
export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    categories: v.array(
      v.object({
        name: v.string(),
        items: v.array(
          v.object({
            name: v.string(),
            required: v.boolean(),
          })
        ),
      })
    ),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("inspectionTemplates", {
      name: args.name,
      description: args.description,
      categories: args.categories,
      isActive: true,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an inspection template
export const updateTemplate = mutation({
  args: {
    templateId: v.id("inspectionTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categories: v.optional(
      v.array(
        v.object({
          name: v.string(),
          items: v.array(
            v.object({
              name: v.string(),
              required: v.boolean(),
            })
          ),
        })
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { templateId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    return await ctx.db.patch(templateId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// INSPECTIONS
// ============================================

// Get all inspections with optional filters
export const getInspections = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    dwellingId: v.optional(v.id("dwellings")),
    inspectorId: v.optional(v.id("users")),
    status: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    let inspections;

    if (args.propertyId) {
      inspections = await ctx.db
        .query("inspections")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId!))
        .collect();
    } else if (args.dwellingId) {
      inspections = await ctx.db
        .query("inspections")
        .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId!))
        .collect();
    } else if (args.inspectorId) {
      inspections = await ctx.db
        .query("inspections")
        .withIndex("by_inspector", (q) => q.eq("inspectorId", args.inspectorId!))
        .collect();
    } else if (args.status) {
      inspections = await ctx.db
        .query("inspections")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      inspections = await ctx.db.query("inspections").collect();
    }

    // Enrich with related data
    const enrichedInspections = await Promise.all(
      inspections.map(async (inspection) => {
        const template = await ctx.db.get(inspection.templateId);
        const property = await ctx.db.get(inspection.propertyId);
        const inspector = await ctx.db.get(inspection.inspectorId);
        const dwelling = inspection.dwellingId
          ? await ctx.db.get(inspection.dwellingId)
          : null;

        return {
          ...inspection,
          template: template ? { name: template.name } : null,
          property: property
            ? {
                propertyName: property.propertyName,
                addressLine1: property.addressLine1,
                suburb: property.suburb,
              }
            : null,
          dwelling: dwelling ? { dwellingName: dwelling.dwellingName } : null,
          inspector: inspector
            ? { firstName: inspector.firstName, lastName: inspector.lastName }
            : null,
        };
      })
    );

    // Sort by scheduled date (newest first)
    return enrichedInspections.sort(
      (a, b) =>
        new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
  },
});

// Get a single inspection by ID with all items
export const getInspectionById = query({
  args: { inspectionId: v.id("inspections") },
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) return null;

    const template = await ctx.db.get(inspection.templateId);
    const property = await ctx.db.get(inspection.propertyId);
    const inspector = await ctx.db.get(inspection.inspectorId);
    const dwelling = inspection.dwellingId
      ? await ctx.db.get(inspection.dwellingId)
      : null;

    // Get all items for this inspection
    const items = await ctx.db
      .query("inspectionItems")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    // Get all photos for this inspection
    const photos = await ctx.db
      .query("inspectionPhotos")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    // Get photo URLs
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        return { ...photo, url };
      })
    );

    // Group items by category
    const itemsByCategory: Record<string, typeof items> = {};
    items.forEach((item) => {
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = [];
      }
      itemsByCategory[item.category].push(item);
    });

    // Sort items within each category by itemOrder
    Object.keys(itemsByCategory).forEach((category) => {
      itemsByCategory[category].sort((a, b) => a.itemOrder - b.itemOrder);
    });

    return {
      ...inspection,
      template,
      property,
      dwelling,
      inspector,
      items,
      itemsByCategory,
      photos: photosWithUrls,
    };
  },
});

// Create a new inspection from a template
export const createInspection = mutation({
  args: {
    templateId: v.id("inspectionTemplates"),
    propertyId: v.id("properties"),
    dwellingId: v.optional(v.id("dwellings")),
    inspectorId: v.id("users"),
    scheduledDate: v.string(),
    location: v.optional(v.string()),
    preparedBy: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const now = Date.now();

    // Count total items
    let totalItems = 0;
    template.categories.forEach((category) => {
      totalItems += category.items.length;
    });

    // Create the inspection
    const inspectionId = await ctx.db.insert("inspections", {
      templateId: args.templateId,
      propertyId: args.propertyId,
      dwellingId: args.dwellingId,
      inspectorId: args.inspectorId,
      scheduledDate: args.scheduledDate,
      status: "scheduled",
      location: args.location,
      preparedBy: args.preparedBy,
      totalItems,
      completedItems: 0,
      passedItems: 0,
      failedItems: 0,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    // Create inspection items from template
    let itemOrder = 0;
    for (const category of template.categories) {
      for (const item of category.items) {
        await ctx.db.insert("inspectionItems", {
          inspectionId,
          category: category.name,
          itemName: item.name,
          itemOrder: itemOrder++,
          status: "pending",
          hasIssue: false,
          updatedAt: now,
        });
      }
    }

    return inspectionId;
  },
});

// Update inspection details
export const updateInspection = mutation({
  args: {
    inspectionId: v.id("inspections"),
    scheduledDate: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
    location: v.optional(v.string()),
    preparedBy: v.optional(v.string()),
    additionalComments: v.optional(v.string()),
    inspectorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { inspectionId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    return await ctx.db.patch(inspectionId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Start an inspection (change status to in_progress)
export const startInspection = mutation({
  args: { inspectionId: v.id("inspections") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.inspectionId, {
      status: "in_progress",
      updatedAt: Date.now(),
    });
  },
});

// Complete an inspection
export const completeInspection = mutation({
  args: {
    inspectionId: v.id("inspections"),
    additionalComments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    return await ctx.db.patch(args.inspectionId, {
      status: "completed",
      completedDate: today,
      additionalComments: args.additionalComments,
      updatedAt: Date.now(),
    });
  },
});

// Delete an inspection and all its items/photos
export const deleteInspection = mutation({
  args: { inspectionId: v.id("inspections") },
  handler: async (ctx, args) => {
    // Delete all photos
    const photos = await ctx.db
      .query("inspectionPhotos")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    for (const photo of photos) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(photo._id);
    }

    // Delete all items
    const items = await ctx.db
      .query("inspectionItems")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete the inspection
    await ctx.db.delete(args.inspectionId);
  },
});

// ============================================
// INSPECTION ITEMS
// ============================================

// Get items for an inspection
export const getItemsByInspection = query({
  args: { inspectionId: v.id("inspections") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("inspectionItems")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    // Get photos for each item
    const itemsWithPhotos = await Promise.all(
      items.map(async (item) => {
        const photos = await ctx.db
          .query("inspectionPhotos")
          .withIndex("by_item", (q) => q.eq("inspectionItemId", item._id))
          .collect();

        const photosWithUrls = await Promise.all(
          photos.map(async (photo) => {
            const url = await ctx.storage.getUrl(photo.storageId);
            return { ...photo, url };
          })
        );

        return { ...item, photos: photosWithUrls };
      })
    );

    return itemsWithPhotos.sort((a, b) => a.itemOrder - b.itemOrder);
  },
});

// Update an inspection item's status
export const updateItemStatus = mutation({
  args: {
    itemId: v.id("inspectionItems"),
    status: v.union(
      v.literal("pending"),
      v.literal("pass"),
      v.literal("fail"),
      v.literal("na")
    ),
    condition: v.optional(v.string()),
    remarks: v.optional(v.string()),
    updatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const hasIssue = args.status === "fail";

    // Update the item
    await ctx.db.patch(args.itemId, {
      status: args.status,
      condition: args.condition,
      remarks: args.remarks,
      hasIssue,
      updatedBy: args.updatedBy,
      updatedAt: Date.now(),
    });

    // Update inspection counts
    const inspection = await ctx.db.get(item.inspectionId);
    if (inspection) {
      const allItems = await ctx.db
        .query("inspectionItems")
        .withIndex("by_inspection", (q) =>
          q.eq("inspectionId", item.inspectionId)
        )
        .collect();

      // Recalculate counts
      let completedItems = 0;
      let passedItems = 0;
      let failedItems = 0;

      allItems.forEach((i) => {
        // Use updated status for the current item
        const status = i._id === args.itemId ? args.status : i.status;
        if (status !== "pending") {
          completedItems++;
          if (status === "pass") passedItems++;
          if (status === "fail") failedItems++;
        }
      });

      await ctx.db.patch(item.inspectionId, {
        completedItems,
        passedItems,
        failedItems,
        updatedAt: Date.now(),
      });
    }

    return args.itemId;
  },
});

// Bulk update multiple items at once
export const bulkUpdateItems = mutation({
  args: {
    updates: v.array(
      v.object({
        itemId: v.id("inspectionItems"),
        status: v.union(
          v.literal("pending"),
          v.literal("pass"),
          v.literal("fail"),
          v.literal("na")
        ),
        condition: v.optional(v.string()),
        remarks: v.optional(v.string()),
      })
    ),
    updatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inspectionId: any = null;

    for (const update of args.updates) {
      const item = await ctx.db.get(update.itemId);
      if (!item) continue;

      inspectionId = item.inspectionId;
      const hasIssue = update.status === "fail";

      await ctx.db.patch(update.itemId, {
        status: update.status,
        condition: update.condition,
        remarks: update.remarks,
        hasIssue,
        updatedBy: args.updatedBy,
        updatedAt: now,
      });
    }

    // Update inspection counts if we have an inspection
    if (inspectionId) {
      const allItems = await ctx.db
        .query("inspectionItems")
        .withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId))
        .collect();

      let completedItems = 0;
      let passedItems = 0;
      let failedItems = 0;

      allItems.forEach((item) => {
        if (item.status !== "pending") {
          completedItems++;
          if (item.status === "pass") passedItems++;
          if (item.status === "fail") failedItems++;
        }
      });

      await ctx.db.patch(inspectionId, {
        completedItems,
        passedItems,
        failedItems,
        updatedAt: now,
      });
    }
  },
});

// ============================================
// INSPECTION PHOTOS
// ============================================

// Get photos for an inspection item
export const getPhotosByItem = query({
  args: { itemId: v.id("inspectionItems") },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("inspectionPhotos")
      .withIndex("by_item", (q) => q.eq("inspectionItemId", args.itemId))
      .collect();

    return await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        return { ...photo, url };
      })
    );
  },
});

// Generate upload URL for inspection photo
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save inspection photo after upload
export const saveInspectionPhoto = mutation({
  args: {
    inspectionId: v.id("inspections"),
    inspectionItemId: v.id("inspectionItems"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    description: v.optional(v.string()),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("inspectionPhotos", {
      inspectionId: args.inspectionId,
      inspectionItemId: args.inspectionItemId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      description: args.description,
      uploadedBy: args.uploadedBy,
      createdAt: Date.now(),
    });
  },
});

// Delete an inspection photo
export const deleteInspectionPhoto = mutation({
  args: { photoId: v.id("inspectionPhotos") },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (photo) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(args.photoId);
    }
  },
});

// Save a general inspection photo (not tied to a specific item)
export const saveGeneralPhoto = mutation({
  args: {
    inspectionId: v.id("inspections"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    description: v.optional(v.string()),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("inspectionPhotos", {
      inspectionId: args.inspectionId,
      inspectionItemId: undefined,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      description: args.description,
      isGeneralPhoto: true,
      uploadedBy: args.uploadedBy,
      createdAt: Date.now(),
    });
  },
});

// Get general photos for an inspection (not tied to items)
export const getGeneralPhotos = query({
  args: { inspectionId: v.id("inspections") },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("inspectionPhotos")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    // Filter to only general photos (no item ID)
    const generalPhotos = photos.filter((p) => !p.inspectionItemId || p.isGeneralPhoto);

    return await Promise.all(
      generalPhotos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        return { ...photo, url };
      })
    );
  },
});

// ============================================
// CUSTOM INSPECTION ITEMS
// ============================================

// Add a custom inspection item during an inspection
export const addCustomItem = mutation({
  args: {
    inspectionId: v.id("inspections"),
    category: v.string(),
    itemName: v.string(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) {
      throw new Error("Inspection not found");
    }

    // Get all items to determine the next order number
    const existingItems = await ctx.db
      .query("inspectionItems")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    // Find highest order in this category, or overall if category doesn't exist
    const categoryItems = existingItems.filter((i) => i.category === args.category);
    let itemOrder = 0;

    if (categoryItems.length > 0) {
      itemOrder = Math.max(...categoryItems.map((i) => i.itemOrder)) + 1;
    } else {
      // New category - put at end
      itemOrder = existingItems.length > 0
        ? Math.max(...existingItems.map((i) => i.itemOrder)) + 1
        : 0;
    }

    const now = Date.now();

    // Create the custom item
    const itemId = await ctx.db.insert("inspectionItems", {
      inspectionId: args.inspectionId,
      category: args.category,
      itemName: args.itemName,
      itemOrder,
      status: "pending",
      hasIssue: false,
      updatedBy: args.createdBy,
      updatedAt: now,
    });

    // Update inspection total items count
    await ctx.db.patch(args.inspectionId, {
      totalItems: inspection.totalItems + 1,
      updatedAt: now,
    });

    return itemId;
  },
});

// Delete a custom inspection item
export const deleteCustomItem = mutation({
  args: {
    itemId: v.id("inspectionItems"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Delete any photos associated with this item
    const photos = await ctx.db
      .query("inspectionPhotos")
      .withIndex("by_item", (q) => q.eq("inspectionItemId", args.itemId))
      .collect();

    for (const photo of photos) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(photo._id);
    }

    // Update inspection counts
    const inspection = await ctx.db.get(item.inspectionId);
    if (inspection) {
      const updates: Record<string, number> = {
        totalItems: Math.max(0, inspection.totalItems - 1),
        updatedAt: Date.now(),
      };

      if (item.status !== "pending") {
        updates.completedItems = Math.max(0, inspection.completedItems - 1);
        if (item.status === "pass") {
          updates.passedItems = Math.max(0, inspection.passedItems - 1);
        } else if (item.status === "fail") {
          updates.failedItems = Math.max(0, inspection.failedItems - 1);
        }
      }

      await ctx.db.patch(item.inspectionId, updates);
    }

    // Delete the item
    await ctx.db.delete(args.itemId);
  },
});

// ============================================
// SEED DATA - BLS INSPECTION TEMPLATE
// ============================================

// Create the default BLS inspection template
export const seedBLSTemplate = mutation({
  args: { createdBy: v.id("users") },
  handler: async (ctx, args) => {
    // Check if BLS template already exists
    const existing = await ctx.db
      .query("inspectionTemplates")
      .filter((q) => q.eq(q.field("name"), "BLS Property Inspection"))
      .first();

    if (existing) {
      throw new Error("BLS Template already exists");
    }

    const now = Date.now();

    const blsTemplate = {
      name: "BLS Property Inspection",
      description:
        "Better Living Solutions standard property inspection checklist for SDA properties",
      categories: [
        {
          name: "Heating & Cooling",
          items: [
            { name: "Check to see if AC is working", required: true },
            { name: "Check AC filters are clean", required: false },
            { name: "Check thermostat is functioning", required: false },
          ],
        },
        {
          name: "Electrical",
          items: [
            { name: "All switches working properly", required: true },
            { name: "All light fixtures working", required: true },
            { name: "Doorbell working (if applicable)", required: false },
            { name: "Power points tested and working", required: true },
            { name: "Safety switches (RCDs) tested", required: true },
          ],
        },
        {
          name: "Plumbing",
          items: [
            { name: "All faucets working properly", required: true },
            { name: "Good water flow in all taps", required: true },
            { name: "Hot water working and at safe temperature", required: true },
            { name: "All drains flowing properly", required: true },
            { name: "No visible leaks under sinks", required: true },
            { name: "Toilet flushing and filling properly", required: true },
          ],
        },
        {
          name: "Windows",
          items: [
            { name: "Glass in good condition (no cracks)", required: true },
            { name: "Windows open and close properly", required: true },
            { name: "Fly screens intact and in place", required: false },
            { name: "Window locks/latches working", required: true },
            { name: "Window seals in good condition", required: false },
          ],
        },
        {
          name: "Doors",
          items: [
            { name: "All doors open and close properly", required: true },
            { name: "Door latches working correctly", required: true },
            { name: "Door stoppers in place", required: false },
            { name: "Door locks working (keys tested)", required: true },
            { name: "Weatherstripping in good condition", required: false },
          ],
        },
        {
          name: "Exterior / Porches / Decks",
          items: [
            { name: "Cladding/siding in good condition", required: true },
            { name: "Gutters clear and attached", required: true },
            { name: "Downpipes clear and attached", required: true },
            { name: "Sidewalks/pathways safe and clear", required: true },
            { name: "Handrails secure (if applicable)", required: true },
            { name: "Drainage away from building", required: true },
            { name: "Exterior lighting working", required: true },
          ],
        },
        {
          name: "Garage & Structures",
          items: [
            { name: "Garage door opens/closes properly", required: true },
            { name: "Garage remote working", required: false },
            { name: "Lock codes working (if keypad)", required: false },
            { name: "Garage floor in good condition", required: false },
            { name: "Shed/outbuilding in good condition", required: false },
          ],
        },
        {
          name: "Safety & Miscellaneous",
          items: [
            { name: "Smoke alarms tested and working", required: true },
            { name: "CO2 detector tested (if applicable)", required: true },
            { name: "Security system working (if applicable)", required: false },
            { name: "Intercom working (if applicable)", required: false },
            { name: "Emergency exits clear and accessible", required: true },
            { name: "First aid kit present and stocked", required: false },
          ],
        },
        {
          name: "Bedroom 1",
          items: [
            { name: "Walls in good condition", required: true },
            { name: "Floor/carpet in good condition", required: true },
            { name: "Windows and blinds working", required: true },
            { name: "Built-in wardrobe doors working", required: false },
            { name: "Power points working", required: true },
            { name: "Lighting working", required: true },
            { name: "Ceiling fan working (if applicable)", required: false },
          ],
        },
        {
          name: "Bedroom 2",
          items: [
            { name: "Walls in good condition", required: true },
            { name: "Floor/carpet in good condition", required: true },
            { name: "Windows and blinds working", required: true },
            { name: "Built-in wardrobe doors working", required: false },
            { name: "Power points working", required: true },
            { name: "Lighting working", required: true },
            { name: "Ceiling fan working (if applicable)", required: false },
          ],
        },
        {
          name: "Bedroom 3",
          items: [
            { name: "Walls in good condition", required: true },
            { name: "Floor/carpet in good condition", required: true },
            { name: "Windows and blinds working", required: true },
            { name: "Built-in wardrobe doors working", required: false },
            { name: "Power points working", required: true },
            { name: "Lighting working", required: true },
            { name: "Ceiling fan working (if applicable)", required: false },
          ],
        },
        {
          name: "Bathroom",
          items: [
            { name: "Shower working properly", required: true },
            { name: "Good water flow and temperature", required: true },
            { name: "Basin tap working", required: true },
            { name: "Toilet flushing properly", required: true },
            { name: "Exhaust fan working", required: true },
            { name: "Cabinets/vanity in good condition", required: false },
            { name: "No signs of moisture/mould", required: true },
            { name: "Floor tiles in good condition", required: true },
            { name: "Towel rails secure", required: false },
          ],
        },
        {
          name: "Ensuite",
          items: [
            { name: "Shower working properly", required: true },
            { name: "Good water flow and temperature", required: true },
            { name: "Basin tap working", required: true },
            { name: "Toilet flushing properly", required: true },
            { name: "Exhaust fan working", required: true },
            { name: "No signs of moisture/mould", required: true },
          ],
        },
        {
          name: "Carers Room",
          items: [
            { name: "Walls in good condition", required: true },
            { name: "Floor in good condition", required: true },
            { name: "Windows and blinds working", required: true },
            { name: "Wardrobe/storage working", required: false },
            { name: "Power points working", required: true },
            { name: "Lighting working", required: true },
          ],
        },
        {
          name: "Hallways",
          items: [
            { name: "Walls in good condition", required: true },
            { name: "Floor/carpet in good condition", required: true },
            { name: "Lighting working", required: true },
            { name: "Handrails secure (if applicable)", required: true },
          ],
        },
        {
          name: "Living Room",
          items: [
            { name: "Walls in good condition", required: true },
            { name: "Floor/carpet in good condition", required: true },
            { name: "Windows and blinds working", required: true },
            { name: "Power points working", required: true },
            { name: "Lighting working", required: true },
            { name: "Ceiling fan working (if applicable)", required: false },
          ],
        },
        {
          name: "Kitchen",
          items: [
            { name: "Cabinetry in good condition", required: true },
            { name: "All cabinet doors/drawers working", required: true },
            { name: "Countertops in good condition", required: true },
            { name: "Sink and tap working properly", required: true },
            { name: "Dishwasher working (if applicable)", required: false },
            { name: "Oven/stove working", required: true },
            { name: "Rangehood/exhaust working", required: true },
            { name: "Fridge space adequate", required: false },
            { name: "Walls in good condition", required: true },
            { name: "Floor in good condition", required: true },
            { name: "Lighting working", required: true },
          ],
        },
        {
          name: "Laundry",
          items: [
            { name: "Taps working properly", required: true },
            { name: "Tub/sink draining properly", required: true },
            { name: "Washing machine connections ok", required: true },
            { name: "Dryer vent clear (if applicable)", required: false },
            { name: "Cabinetry in good condition", required: false },
            { name: "Floor in good condition", required: true },
          ],
        },
      ],
      isActive: true,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    return await ctx.db.insert("inspectionTemplates", blsTemplate);
  },
});
