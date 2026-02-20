import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth, requireTenant } from "./authHelpers";

// ============================================
// DWELLING TEMPLATE MERGE HELPER
// ============================================

// Merges a base template's categories with a dwelling-specific diff (added/removed items + categories).
// Used at inspection creation time to produce the final item list for a dwelling.
function mergeDwellingTemplate(
  baseCategories: Array<{
    name: string;
    items: Array<{ name: string; required: boolean }>;
  }>,
  diff: {
    addedItems: Array<{ category: string; name: string; required: boolean }>;
    removedItems: Array<{ category: string; name: string }>;
    addedCategories: string[];
  }
): Array<{ name: string; items: Array<{ name: string; required: boolean }> }> {
  // Start with deep copy of base
  const merged = baseCategories.map((cat) => ({
    name: cat.name,
    items: cat.items.map((item) => ({ ...item })),
  }));

  // Remove items
  for (const removed of diff.removedItems) {
    const cat = merged.find((c) => c.name === removed.category);
    if (cat) {
      cat.items = cat.items.filter((i) => i.name !== removed.name);
    }
  }

  // Add new categories
  for (const catName of diff.addedCategories) {
    if (!merged.find((c) => c.name === catName)) {
      merged.push({ name: catName, items: [] });
    }
  }

  // Add items
  for (const added of diff.addedItems) {
    let cat = merged.find((c) => c.name === added.category);
    if (!cat) {
      cat = { name: added.category, items: [] };
      merged.push(cat);
    }
    if (!cat.items.find((i) => i.name === added.name)) {
      cat.items.push({ name: added.name, required: added.required });
    }
  }

  return merged;
}

// ============================================
// INSPECTION TEMPLATES
// ============================================

// Get all active inspection templates
export const getTemplates = query({
  args: {
    userId: v.id("users"),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    if (args.includeInactive) {
      const templates = await ctx.db.query("inspectionTemplates").collect();
      return templates.filter(t => t.organizationId === organizationId);
    }
    return await ctx.db
      .query("inspectionTemplates")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .filter(q => q.eq(q.field("organizationId"), organizationId))
      .collect();
  },
});

// Get a single template by ID
export const getTemplateById = query({
  args: {
    userId: v.id("users"),
    templateId: v.id("inspectionTemplates")
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const template = await ctx.db.get(args.templateId);

    if (!template) return null;
    if (template.organizationId !== organizationId) {
      throw new Error("Access denied: Template belongs to different organization");
    }

    return template;
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
    const { organizationId } = await requireTenant(ctx, args.createdBy);
    const now = Date.now();
    return await ctx.db.insert("inspectionTemplates", {
      organizationId,
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
    userId: v.id("users"),
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
    const { organizationId } = await requireTenant(ctx, args.userId);
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    if (template.organizationId !== organizationId) {
      throw new Error("Access denied: Template belongs to different organization");
    }

    const { templateId, userId, ...updates } = args;
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
    userId: v.id("users"),
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
    const { organizationId } = await requireTenant(ctx, args.userId);
    let inspections;

    if (args.propertyId) {
      inspections = await ctx.db
        .query("inspections")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId!))
        .filter(q => q.eq(q.field("organizationId"), organizationId))
        .collect();
    } else if (args.dwellingId) {
      inspections = await ctx.db
        .query("inspections")
        .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId!))
        .filter(q => q.eq(q.field("organizationId"), organizationId))
        .collect();
    } else if (args.inspectorId) {
      inspections = await ctx.db
        .query("inspections")
        .withIndex("by_inspector", (q) => q.eq("inspectorId", args.inspectorId!))
        .filter(q => q.eq(q.field("organizationId"), organizationId))
        .collect();
    } else if (args.status) {
      inspections = await ctx.db
        .query("inspections")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .filter(q => q.eq(q.field("organizationId"), organizationId))
        .collect();
    } else {
      const allInspections = await ctx.db.query("inspections").collect();
      inspections = allInspections.filter(i => i.organizationId === organizationId);
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
  args: {
    userId: v.id("users"),
    inspectionId: v.id("inspections")
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) return null;
    if (inspection.organizationId !== organizationId) {
      throw new Error("Access denied: Inspection belongs to different organization");
    }

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
    const { organizationId } = await requireTenant(ctx, args.createdBy);
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }
    if (template.organizationId !== organizationId) {
      throw new Error("Access denied: Template belongs to different organization");
    }

    const now = Date.now();

    // Check for dwelling-specific template override
    let categories = template.categories;
    if (args.dwellingId) {
      const dwellingDiff = await ctx.db
        .query("dwellingInspectionTemplates")
        .withIndex("by_dwelling_template", (q) =>
          q
            .eq("dwellingId", args.dwellingId!)
            .eq("baseTemplateId", args.templateId)
        )
        .first();
      if (dwellingDiff) {
        categories = mergeDwellingTemplate(template.categories, dwellingDiff);
      }
    }

    // Count total items
    let totalItems = 0;
    categories.forEach((category) => {
      totalItems += category.items.length;
    });

    // Create the inspection
    const inspectionId = await ctx.db.insert("inspections", {
      organizationId,
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

    // Create inspection items from merged template
    let itemOrder = 0;
    for (const category of categories) {
      for (const item of category.items) {
        await ctx.db.insert("inspectionItems", {
          organizationId,
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
    userId: v.id("users"),
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
    const { organizationId } = await requireTenant(ctx, args.userId);
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new Error("Inspection not found");
    if (inspection.organizationId !== organizationId) {
      throw new Error("Access denied: Inspection belongs to different organization");
    }

    const { inspectionId, userId, ...updates } = args;
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
  args: {
    userId: v.id("users"),
    inspectionId: v.id("inspections"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new Error("Inspection not found");
    if (inspection.organizationId !== organizationId) {
      throw new Error("Access denied: Inspection belongs to different organization");
    }

    return await ctx.db.patch(args.inspectionId, {
      status: "in_progress",
      updatedAt: Date.now(),
    });
  },
});

// Category-to-maintenance-category mapping for auto-creating MRs from failed inspection items
const INSPECTION_CATEGORY_MAP: Record<string, string> = {
  "Heating & Cooling": "appliances",
  "Electrical": "electrical",
  "Plumbing": "plumbing",
  "Windows": "building",
  "Doors": "building",
  "Exterior / Porches / Decks": "building",
  "Garage & Structures": "building",
  "Kitchen": "appliances",
  "Bathroom": "plumbing",
  "Bedroom 1": "building",
  "Bedroom 2": "building",
  "Bedroom 3": "building",
  "Carers Room": "building",
  "Hallways": "building",
  "Living Room": "building",
  "Laundry": "plumbing",
  "Ensuite": "plumbing",
  "Safety & Miscellaneous": "safety",
  "Accessibility Features": "building",
};

// Complete an inspection with auto-MR creation for failed items and auto-reschedule
export const completeInspection = mutation({
  args: {
    userId: v.id("users"),
    inspectionId: v.id("inspections"),
    additionalComments: v.optional(v.string()),
    createMaintenanceRequests: v.optional(v.boolean()), // default true
    scheduleNext: v.optional(v.boolean()), // default true
    nextScheduledDate: v.optional(v.string()), // override for next date (default: today + 3 months)
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new Error("Inspection not found");
    if (inspection.organizationId !== organizationId) {
      throw new Error("Access denied: Inspection belongs to different organization");
    }

    const today = new Date().toISOString().split("T")[0];

    // 1. Mark inspection as completed
    await ctx.db.patch(args.inspectionId, {
      status: "completed",
      completedDate: today,
      additionalComments: args.additionalComments,
      updatedAt: Date.now(),
    });

    // Trigger webhook
    await ctx.scheduler.runAfter(0, internal.webhooks.triggerWebhook, {
      organizationId,
      event: "inspection.completed",
      payload: { inspectionId: args.inspectionId },
    });

    // 2. Get all inspection items
    const allItems = await ctx.db
      .query("inspectionItems")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    // 3. Collect failed items
    const failedItems = allItems.filter((item) => item.status === "fail");

    // 4. Auto-create maintenance requests for failed items
    let maintenanceRequestsCreated = 0;
    const skippedNoDwelling = !inspection.dwellingId;
    const shouldCreateMRs = args.createMaintenanceRequests !== false;

    if (inspection.dwellingId && shouldCreateMRs && failedItems.length > 0) {
      for (const item of failedItems) {
        const mappedCategory = INSPECTION_CATEGORY_MAP[item.category] || "general";
        const description = `Failed during inspection on ${today}. ${item.condition || ""} ${item.remarks || ""}`.trim();

        await ctx.runMutation(internal.maintenanceRequests.createFromInspection, {
          dwellingId: inspection.dwellingId,
          organizationId,
          title: `[Inspection] ${item.itemName}`,
          description,
          category: mappedCategory as "plumbing" | "electrical" | "appliances" | "building" | "grounds" | "safety" | "general",
          priority: "medium",
          inspectionId: args.inspectionId,
          inspectionItemId: item._id,
          createdBy: args.userId,
          reportedDate: today,
        });
        maintenanceRequestsCreated++;
      }
    }

    // 5. Auto-reschedule: check if a future scheduled inspection already exists
    let nextInspectionId: string | null = null;
    let nextInspectionDate: string | null = null;
    let alreadyScheduled = false;
    const shouldScheduleNext = args.scheduleNext !== false;

    if (shouldScheduleNext) {
      // Check for existing future scheduled inspection for same property+dwelling
      const existingScheduled = await ctx.db
        .query("inspections")
        .withIndex("by_property", (q) => q.eq("propertyId", inspection.propertyId))
        .filter((q) =>
          q.and(
            q.eq(q.field("organizationId"), organizationId),
            q.eq(q.field("status"), "scheduled"),
            q.gt(q.field("scheduledDate"), today),
            // Match dwelling: either both null or same dwelling
            inspection.dwellingId
              ? q.eq(q.field("dwellingId"), inspection.dwellingId)
              : q.eq(q.field("dwellingId"), undefined)
          )
        )
        .first();

      if (existingScheduled) {
        // Link to the existing scheduled inspection
        alreadyScheduled = true;
        nextInspectionId = existingScheduled._id;
        nextInspectionDate = existingScheduled.scheduledDate;

        // Set the link on the current inspection
        await ctx.db.patch(args.inspectionId, {
          nextInspectionId: existingScheduled._id,
        });
      } else {
        // Create a new inspection 3 months out
        const scheduledDate = args.nextScheduledDate || (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 3);
          return d.toISOString().split("T")[0];
        })();

        // Check for dwelling-level template override
        let templateCategories: Array<{ name: string; items: Array<{ name: string; required: boolean }> }> | null = null;

        if (inspection.dwellingId) {
          const dwellingOverride = await ctx.db
            .query("dwellingInspectionTemplates")
            .withIndex("by_dwelling_template", (q) =>
              q.eq("dwellingId", inspection.dwellingId!).eq("baseTemplateId", inspection.templateId)
            )
            .first();

          if (dwellingOverride) {
            // Get base template and merge with override
            const baseTemplate = await ctx.db.get(inspection.templateId);
            if (baseTemplate) {
              // Start with base categories
              const mergedCategories = baseTemplate.categories.map((cat) => {
                // Remove items that are in removedItems
                const filteredItems = cat.items.filter(
                  (item) =>
                    !dwellingOverride.removedItems.some(
                      (removed) => removed.category === cat.name && removed.name === item.name
                    )
                );
                // Add items that are in addedItems for this category
                const addedForCategory = dwellingOverride.addedItems.filter(
                  (added) => added.category === cat.name
                );
                return {
                  name: cat.name,
                  items: [
                    ...filteredItems,
                    ...addedForCategory.map((a) => ({ name: a.name, required: a.required })),
                  ],
                };
              });

              // Add entirely new categories
              for (const addedCatName of dwellingOverride.addedCategories) {
                if (!mergedCategories.some((c) => c.name === addedCatName)) {
                  const addedItemsForCat = dwellingOverride.addedItems.filter(
                    (a) => a.category === addedCatName
                  );
                  if (addedItemsForCat.length > 0) {
                    mergedCategories.push({
                      name: addedCatName,
                      items: addedItemsForCat.map((a) => ({ name: a.name, required: a.required })),
                    });
                  }
                }
              }

              templateCategories = mergedCategories;
            }
          }
        }

        // If no override, load base template categories
        if (!templateCategories) {
          const baseTemplate = await ctx.db.get(inspection.templateId);
          templateCategories = baseTemplate?.categories || [];
        }

        // Count total items
        let totalItems = 0;
        for (const cat of templateCategories) {
          totalItems += cat.items.length;
        }

        const now = Date.now();

        // Create the next inspection
        const newInspectionId = await ctx.db.insert("inspections", {
          organizationId,
          templateId: inspection.templateId,
          propertyId: inspection.propertyId,
          dwellingId: inspection.dwellingId,
          inspectorId: inspection.inspectorId,
          scheduledDate,
          status: "scheduled",
          location: inspection.location,
          preparedBy: inspection.preparedBy,
          totalItems,
          completedItems: 0,
          passedItems: 0,
          failedItems: 0,
          sourceInspectionId: args.inspectionId,
          createdBy: args.userId,
          createdAt: now,
          updatedAt: now,
        });

        // Create inspection items from template categories
        let itemOrder = 0;
        for (const category of templateCategories) {
          for (const item of category.items) {
            await ctx.db.insert("inspectionItems", {
              organizationId,
              inspectionId: newInspectionId,
              category: category.name,
              itemName: item.name,
              itemOrder: itemOrder++,
              status: "pending",
              hasIssue: false,
              updatedAt: now,
            });
          }
        }

        // Link current inspection to the new one
        await ctx.db.patch(args.inspectionId, {
          nextInspectionId: newInspectionId,
        });

        nextInspectionId = newInspectionId;
        nextInspectionDate = scheduledDate;
      }
    }

    return {
      maintenanceRequestsCreated,
      failedItems: failedItems.length,
      skippedNoDwelling,
      nextInspectionId,
      nextInspectionDate,
      alreadyScheduled,
    };
  },
});

// Get completion summary: failed items, created MRs, next inspection info
export const getCompletionSummary = query({
  args: {
    userId: v.id("users"),
    inspectionId: v.id("inspections"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) return null;
    if (inspection.organizationId !== organizationId) {
      throw new Error("Access denied: Inspection belongs to different organization");
    }

    // Get all items
    const allItems = await ctx.db
      .query("inspectionItems")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    const failedItems = allItems.filter((item) => item.status === "fail");
    const passedItems = allItems.filter((item) => item.status === "pass");
    const naItems = allItems.filter((item) => item.status === "na");

    // Get maintenance requests created from this inspection
    const createdMRs = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    // Enrich MRs with dwelling info
    const enrichedMRs = await Promise.all(
      createdMRs.map(async (mr) => {
        const dwelling = await ctx.db.get(mr.dwellingId);
        return {
          _id: mr._id,
          title: mr.title,
          category: mr.category,
          priority: mr.priority,
          status: mr.status,
          reportedDate: mr.reportedDate,
          dwellingName: dwelling?.dwellingName || null,
        };
      })
    );

    // Get next inspection info (post-completion: linked via nextInspectionId)
    let nextInspection = null;
    if (inspection.nextInspectionId) {
      const next = await ctx.db.get(inspection.nextInspectionId);
      if (next) {
        const nextInspector = await ctx.db.get(next.inspectorId);
        nextInspection = {
          _id: next._id,
          scheduledDate: next.scheduledDate,
          status: next.status,
          totalItems: next.totalItems,
          inspector: nextInspector
            ? { firstName: nextInspector.firstName, lastName: nextInspector.lastName }
            : null,
        };
      }
    }

    // Check for existing future scheduled inspection (pre-completion preview)
    let existingNextInspection: { _id: string; scheduledDate: string } | null = null;
    if (!nextInspection && inspection.status !== "completed") {
      const today = new Date().toISOString().split("T")[0];
      const existingScheduled = await ctx.db
        .query("inspections")
        .withIndex("by_property", (q) => q.eq("propertyId", inspection.propertyId))
        .filter((q) =>
          q.and(
            q.eq(q.field("organizationId"), organizationId),
            q.eq(q.field("status"), "scheduled"),
            q.gt(q.field("scheduledDate"), today),
            q.neq(q.field("_id"), args.inspectionId),
            inspection.dwellingId
              ? q.eq(q.field("dwellingId"), inspection.dwellingId)
              : q.eq(q.field("dwellingId"), undefined)
          )
        )
        .first();

      if (existingScheduled) {
        existingNextInspection = {
          _id: existingScheduled._id,
          scheduledDate: existingScheduled.scheduledDate,
        };
      }
    }

    // Get source inspection info (if this was auto-scheduled)
    let sourceInspection = null;
    if (inspection.sourceInspectionId) {
      const source = await ctx.db.get(inspection.sourceInspectionId);
      if (source) {
        sourceInspection = {
          _id: source._id,
          completedDate: source.completedDate,
          scheduledDate: source.scheduledDate,
        };
      }
    }

    // Enrich failed items with category and remarks
    const enrichedFailedItems = failedItems.map((item) => ({
      _id: item._id,
      category: item.category,
      itemName: item.itemName,
      condition: item.condition || null,
      remarks: item.remarks || null,
    }));

    const assessed = passedItems.length + failedItems.length;
    const passRate = assessed > 0 ? Math.round((passedItems.length / assessed) * 100) : 0;

    return {
      inspectionId: args.inspectionId,
      status: inspection.status,
      completedDate: inspection.completedDate || null,
      hasDwelling: !!inspection.dwellingId,
      summary: {
        totalItems: allItems.length,
        passedItems: passedItems.length,
        failedItems: failedItems.length,
        naItems: naItems.length,
        pendingItems: allItems.filter((i) => i.status === "pending").length,
        passRate,
      },
      failedItemDetails: enrichedFailedItems,
      maintenanceRequests: enrichedMRs,
      maintenanceRequestsCreated: enrichedMRs.length,
      nextInspection,
      existingNextInspection,
      sourceInspection,
    };
  },
});

// Delete an inspection and all its items/photos
export const deleteInspection = mutation({
  args: {
    userId: v.id("users"),
    inspectionId: v.id("inspections"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new Error("Inspection not found");
    if (inspection.organizationId !== organizationId) {
      throw new Error("Access denied: Inspection belongs to different organization");
    }

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
  args: {
    userId: v.id("users"),
    inspectionId: v.id("inspections")
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const items = await ctx.db
      .query("inspectionItems")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .filter(q => q.eq(q.field("organizationId"), organizationId))
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
    await requireAuth(ctx, args.updatedBy);
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
    await requireAuth(ctx, args.updatedBy);
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
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
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
    const { organizationId } = await requireTenant(ctx, args.uploadedBy);
    return await ctx.db.insert("inspectionPhotos", {
      organizationId,
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
  args: {
    userId: v.id("users"),
    photoId: v.id("inspectionPhotos"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
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
    const { organizationId } = await requireTenant(ctx, args.uploadedBy);
    return await ctx.db.insert("inspectionPhotos", {
      organizationId,
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
    const { organizationId } = await requireTenant(ctx, args.createdBy);
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) {
      throw new Error("Inspection not found");
    }
    if (inspection.organizationId !== organizationId) {
      throw new Error("Access denied: Inspection belongs to different organization");
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
      organizationId,
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

    // Auto-save to dwelling template diff
    if (inspection.dwellingId) {
      const template = await ctx.db.get(inspection.templateId);
      const isNewCategory = !template?.categories.some(
        (cat) => cat.name === args.category
      );

      const existingDiff = await ctx.db
        .query("dwellingInspectionTemplates")
        .withIndex("by_dwelling_template", (q) =>
          q
            .eq("dwellingId", inspection.dwellingId!)
            .eq("baseTemplateId", inspection.templateId)
        )
        .first();

      const newItem = {
        category: args.category,
        name: args.itemName,
        required: false,
      };

      if (existingDiff) {
        const addedItems = [...existingDiff.addedItems, newItem];
        const addedCategories =
          isNewCategory &&
          !existingDiff.addedCategories.includes(args.category)
            ? [...existingDiff.addedCategories, args.category]
            : existingDiff.addedCategories;
        await ctx.db.patch(existingDiff._id, {
          addedItems,
          addedCategories,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("dwellingInspectionTemplates", {
          organizationId: inspection.organizationId,
          dwellingId: inspection.dwellingId!,
          baseTemplateId: inspection.templateId,
          addedItems: [newItem],
          removedItems: [],
          addedCategories: isNewCategory ? [args.category] : [],
          createdBy: args.createdBy,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return itemId;
  },
});

// Delete a custom inspection item
export const deleteCustomItem = mutation({
  args: {
    userId: v.id("users"),
    itemId: v.id("inspectionItems"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
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

    // Auto-save to dwelling template diff
    if (inspection && inspection.dwellingId) {
      const template = await ctx.db.get(inspection.templateId);
      const existingDiff = await ctx.db
        .query("dwellingInspectionTemplates")
        .withIndex("by_dwelling_template", (q) =>
          q
            .eq("dwellingId", inspection.dwellingId!)
            .eq("baseTemplateId", inspection.templateId)
        )
        .first();

      // Check if item was from base template (needs removedItems) or custom-added (remove from addedItems)
      const isBaseItem = template?.categories.some(
        (cat) =>
          cat.name === item.category &&
          cat.items.some((i) => i.name === item.itemName)
      );

      if (existingDiff) {
        if (isBaseItem) {
          const removedItems = [
            ...existingDiff.removedItems,
            { category: item.category, name: item.itemName },
          ];
          await ctx.db.patch(existingDiff._id, {
            removedItems,
            updatedAt: Date.now(),
          });
        } else {
          const addedItems = existingDiff.addedItems.filter(
            (a) =>
              !(a.category === item.category && a.name === item.itemName)
          );
          await ctx.db.patch(existingDiff._id, {
            addedItems,
            updatedAt: Date.now(),
          });
        }
      } else if (isBaseItem) {
        await ctx.db.insert("dwellingInspectionTemplates", {
          organizationId: inspection.organizationId,
          dwellingId: inspection.dwellingId!,
          baseTemplateId: inspection.templateId,
          addedItems: [],
          removedItems: [{ category: item.category, name: item.itemName }],
          addedCategories: [],
          createdBy: args.userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Delete the item
    await ctx.db.delete(args.itemId);
  },
});

// Delete all items in a category from an inspection
export const deleteCategoryItems = mutation({
  args: {
    userId: v.id("users"),
    inspectionId: v.id("inspections"),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new Error("Inspection not found");
    if (inspection.status === "completed") {
      throw new Error("Cannot remove items from a completed inspection");
    }

    // Get all items in this category
    const allItems = await ctx.db
      .query("inspectionItems")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();
    const categoryItems = allItems.filter((i) => i.category === args.category);

    if (categoryItems.length === 0) return;

    // Delete photos and accumulate count deltas
    let totalRemoved = 0;
    let completedRemoved = 0;
    let passedRemoved = 0;
    let failedRemoved = 0;

    for (const item of categoryItems) {
      // Delete associated photos + storage
      const photos = await ctx.db
        .query("inspectionPhotos")
        .withIndex("by_item", (q) => q.eq("inspectionItemId", item._id))
        .collect();
      for (const photo of photos) {
        await ctx.storage.delete(photo.storageId);
        await ctx.db.delete(photo._id);
      }

      totalRemoved++;
      if (item.status !== "pending") {
        completedRemoved++;
        if (item.status === "pass") passedRemoved++;
        else if (item.status === "fail") failedRemoved++;
      }
    }

    // Update inspection counts in one patch
    await ctx.db.patch(args.inspectionId, {
      totalItems: Math.max(0, inspection.totalItems - totalRemoved),
      completedItems: Math.max(0, inspection.completedItems - completedRemoved),
      passedItems: Math.max(0, inspection.passedItems - passedRemoved),
      failedItems: Math.max(0, inspection.failedItems - failedRemoved),
      updatedAt: Date.now(),
    });

    // Update dwelling template diff (batch)
    if (inspection.dwellingId) {
      const template = await ctx.db.get(inspection.templateId);
      const existingDiff = await ctx.db
        .query("dwellingInspectionTemplates")
        .withIndex("by_dwelling_template", (q) =>
          q
            .eq("dwellingId", inspection.dwellingId!)
            .eq("baseTemplateId", inspection.templateId)
        )
        .first();

      // Separate base template items from custom-added items
      const newRemovedItems: Array<{ category: string; name: string }> = [];
      const customItemNames: Array<{ category: string; name: string }> = [];

      for (const item of categoryItems) {
        const isBaseItem = template?.categories.some(
          (cat) =>
            cat.name === item.category &&
            cat.items.some((i) => i.name === item.itemName)
        );
        if (isBaseItem) {
          newRemovedItems.push({ category: item.category, name: item.itemName });
        } else {
          customItemNames.push({ category: item.category, name: item.itemName });
        }
      }

      if (existingDiff) {
        const removedItems = [...existingDiff.removedItems, ...newRemovedItems];
        const addedItems = existingDiff.addedItems.filter(
          (a) => !customItemNames.some((c) => c.category === a.category && c.name === a.name)
        );
        const addedCategories = existingDiff.addedCategories.filter(
          (c) => c !== args.category
        );
        await ctx.db.patch(existingDiff._id, {
          removedItems,
          addedItems,
          addedCategories,
          updatedAt: Date.now(),
        });
      } else if (newRemovedItems.length > 0) {
        await ctx.db.insert("dwellingInspectionTemplates", {
          organizationId: inspection.organizationId,
          dwellingId: inspection.dwellingId!,
          baseTemplateId: inspection.templateId,
          addedItems: [],
          removedItems: newRemovedItems,
          addedCategories: [],
          createdBy: args.userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Delete all items in the category
    for (const item of categoryItems) {
      await ctx.db.delete(item._id);
    }
  },
});

// ============================================
// INSPECTION PDF REPORT
// ============================================

// Get full inspection data for PDF report generation
export const getInspectionReport = query({
  args: {
    inspectionId: v.id("inspections"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new Error("Inspection not found");

    // Fetch related records
    const [template, property, inspector, dwelling] = await Promise.all([
      ctx.db.get(inspection.templateId),
      ctx.db.get(inspection.propertyId),
      ctx.db.get(inspection.inspectorId),
      inspection.dwellingId ? ctx.db.get(inspection.dwellingId) : null,
    ]);

    // Fetch items and photos in parallel
    const [items, photos] = await Promise.all([
      ctx.db
        .query("inspectionItems")
        .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
        .collect(),
      ctx.db
        .query("inspectionPhotos")
        .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
        .collect(),
    ]);

    // Get photo URLs
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      }))
    );

    // Build photo lookup by item ID
    const photosByItem = new Map<string, typeof photosWithUrls>();
    const generalPhotos: typeof photosWithUrls = [];

    for (const photo of photosWithUrls) {
      if (!photo.inspectionItemId || photo.isGeneralPhoto) {
        generalPhotos.push(photo);
      } else {
        const key = photo.inspectionItemId;
        if (!photosByItem.has(key)) photosByItem.set(key, []);
        photosByItem.get(key)!.push(photo);
      }
    }

    // Enrich items with photos, sort by order
    const enrichedItems = items
      .sort((a, b) => a.itemOrder - b.itemOrder)
      .map((item) => ({
        category: item.category,
        itemName: item.itemName,
        status: item.status,
        condition: item.condition || null,
        remarks: item.remarks || null,
        hasIssue: item.hasIssue,
        photos: photosByItem.get(item._id) || [],
      }));

    // Calculate summary + category breakdown
    const categoryMap = new Map<string, { total: number; passed: number; failed: number; na: number }>();
    let totalItems = 0;
    let passedItems = 0;
    let failedItems = 0;
    let naItems = 0;

    for (const item of enrichedItems) {
      totalItems++;
      if (item.status === "pass") passedItems++;
      else if (item.status === "fail") failedItems++;
      else if (item.status === "na") naItems++;

      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, { total: 0, passed: 0, failed: 0, na: 0 });
      }
      const cat = categoryMap.get(item.category)!;
      cat.total++;
      if (item.status === "pass") cat.passed++;
      else if (item.status === "fail") cat.failed++;
      else if (item.status === "na") cat.na++;
    }

    const assessed = passedItems + failedItems;
    const passRate = assessed > 0 ? Math.round((passedItems / assessed) * 100) : 0;

    const categorySummary = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));

    return {
      inspection,
      property: property
        ? {
            propertyName: property.propertyName,
            addressLine1: property.addressLine1,
            suburb: property.suburb,
            state: property.state,
            postcode: property.postcode,
          }
        : null,
      dwelling: dwelling ? { dwellingName: dwelling.dwellingName } : null,
      inspector: inspector
        ? { firstName: inspector.firstName, lastName: inspector.lastName }
        : null,
      template: template ? { name: template.name } : null,
      items: enrichedItems,
      generalPhotos,
      summary: {
        totalItems,
        passedItems,
        failedItems,
        naItems,
        passRate,
        categorySummary,
      },
    };
  },
});

// ============================================
// SEED DATA - BLS INSPECTION TEMPLATE
// ============================================

// Create the default BLS inspection template
export const seedBLSTemplate = mutation({
  args: { createdBy: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.createdBy);
    // Check if Standard SDA Inspection template already exists for this organization
    const existing = await ctx.db
      .query("inspectionTemplates")
      .filter((q) => q.and(
        q.eq(q.field("name"), "Standard SDA Inspection"),
        q.eq(q.field("organizationId"), organizationId)
      ))
      .first();

    if (existing) {
      throw new Error("Standard SDA Inspection Template already exists");
    }

    const now = Date.now();

    const blsTemplate = {
      organizationId,
      name: "Standard SDA Inspection",
      description:
        "Standard property inspection checklist for SDA properties",
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

// ============================================
// MIGRATION: Rename existing BLS templates
// ============================================

// Rename existing "BLS Property Inspection" templates to "Standard SDA Inspection"
export const renameBLSTemplates = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const templates = await ctx.db
      .query("inspectionTemplates")
      .filter((q) =>
        q.and(
          q.eq(q.field("name"), "BLS Property Inspection"),
          q.eq(q.field("organizationId"), organizationId)
        )
      )
      .collect();

    for (const t of templates) {
      await ctx.db.patch(t._id, {
        name: "Standard SDA Inspection",
        description: "Standard property inspection checklist for SDA properties",
        updatedAt: Date.now(),
      });
    }

    return { renamed: templates.length };
  },
});

// ============================================
// DWELLING TEMPLATE DIFF + MERGE
// ============================================

// Save current inspection items as a new reusable template
export const saveAsTemplate = mutation({
  args: {
    userId: v.id("users"),
    inspectionId: v.id("inspections"),
    templateName: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Check for duplicate name
    const existing = await ctx.db
      .query("inspectionTemplates")
      .filter((q) =>
        q.and(
          q.eq(q.field("name"), args.templateName),
          q.eq(q.field("organizationId"), organizationId)
        )
      )
      .first();
    if (existing) {
      throw new Error("A template with this name already exists");
    }

    // Get all items from current inspection
    const items = await ctx.db
      .query("inspectionItems")
      .withIndex("by_inspection", (q) => q.eq("inspectionId", args.inspectionId))
      .collect();

    // Group by category preserving item order
    const categoryMap = new Map<string, Array<{ name: string; required: boolean }>>();
    for (const item of items) {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, []);
      }
      categoryMap.get(item.category)!.push({ name: item.itemName, required: false });
    }

    const categories = Array.from(categoryMap.entries()).map(([name, catItems]) => ({
      name,
      items: catItems,
    }));

    const now = Date.now();

    return await ctx.db.insert("inspectionTemplates", {
      organizationId,
      name: args.templateName,
      description: "Template saved from inspection",
      categories,
      isActive: true,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get common inspection items across all active templates for this org
export const getCommonItems = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const templates = await ctx.db
      .query("inspectionTemplates")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .collect();

    // Collect unique items across all templates, grouped by category
    const itemMap = new Map<string, Set<string>>();
    for (const template of templates) {
      for (const cat of template.categories) {
        if (!itemMap.has(cat.name)) {
          itemMap.set(cat.name, new Set());
        }
        for (const item of cat.items) {
          itemMap.get(cat.name)!.add(item.name);
        }
      }
    }

    return Array.from(itemMap.entries()).map(([category, items]) => ({
      category,
      items: Array.from(items).sort(),
    }));
  },
});

// Get inspections grouped by property with dwelling breakdown
export const getByPropertyGrouped = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Get all inspections for this org
    const allInspections = await ctx.db
      .query("inspections")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Get unique property IDs
    const propertyIds = [...new Set(allInspections.map((i) => i.propertyId))];

    // Build grouped result
    const grouped = await Promise.all(
      propertyIds.map(async (propertyId) => {
        const property = await ctx.db.get(propertyId);
        if (!property) return null;

        const propertyInspections = allInspections.filter(
          (i) => i.propertyId === propertyId
        );

        // Get dwellings for this property
        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
          .collect();

        const dwellingData = await Promise.all(
          dwellings.map(async (dwelling) => {
            const dwellingInspections = propertyInspections
              .filter((i) => i.dwellingId === dwelling._id)
              .sort(
                (a, b) =>
                  new Date(b.scheduledDate).getTime() -
                  new Date(a.scheduledDate).getTime()
              );

            // Check for custom template override
            const hasCustomTemplate = await ctx.db
              .query("dwellingInspectionTemplates")
              .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
              .first();

            const nextScheduled = dwellingInspections.find(
              (i) => i.status === "scheduled"
            );
            const lastCompleted = dwellingInspections.find(
              (i) => i.status === "completed"
            );

            return {
              dwellingId: dwelling._id,
              dwellingName: dwelling.dwellingName,
              inspections: dwellingInspections,
              nextScheduled: nextScheduled || null,
              lastCompleted: lastCompleted || null,
              hasCustomTemplate: !!hasCustomTemplate,
              totalFailed: dwellingInspections.reduce(
                (sum, i) => sum + i.failedItems,
                0
              ),
            };
          })
        );

        // Also get inspections not linked to a specific dwelling
        const unlinkedInspections = propertyInspections
          .filter((i) => !i.dwellingId)
          .sort(
            (a, b) =>
              new Date(b.scheduledDate).getTime() -
              new Date(a.scheduledDate).getTime()
          );

        const lastInspectionDate =
          propertyInspections
            .filter((i) => i.status === "completed")
            .sort(
              (a, b) =>
                new Date(b.completedDate || b.scheduledDate).getTime() -
                new Date(a.completedDate || a.scheduledDate).getTime()
            )[0]?.completedDate || null;

        const nextScheduledDate =
          propertyInspections
            .filter((i) => i.status === "scheduled")
            .sort(
              (a, b) =>
                new Date(a.scheduledDate).getTime() -
                new Date(b.scheduledDate).getTime()
            )[0]?.scheduledDate || null;

        return {
          propertyId,
          propertyName: property.propertyName,
          addressLine1: property.addressLine1,
          suburb: property.suburb,
          dwellings: dwellingData,
          unlinkedInspections,
          lastInspectionDate,
          nextScheduledDate,
          totalInspections: propertyInspections.length,
          totalIssues: propertyInspections.reduce(
            (sum, i) => sum + i.failedItems,
            0
          ),
          hasOverdue: propertyInspections.some(
            (i) =>
              i.status === "scheduled" &&
              new Date(i.scheduledDate) < new Date()
          ),
        };
      })
    );

    return grouped
      .filter(Boolean)
      .sort((a, b) => {
        // Sort: overdue first, then by property name
        if (a!.hasOverdue && !b!.hasOverdue) return -1;
        if (!a!.hasOverdue && b!.hasOverdue) return 1;
        return (a!.propertyName || "").localeCompare(b!.propertyName || "");
      });
  },
});

// Get dwelling template diff for a specific dwelling + base template combo
export const getDwellingTemplateDiff = query({
  args: {
    userId: v.id("users"),
    dwellingId: v.id("dwellings"),
    baseTemplateId: v.id("inspectionTemplates"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    return await ctx.db
      .query("dwellingInspectionTemplates")
      .withIndex("by_dwelling_template", (q) =>
        q.eq("dwellingId", args.dwellingId).eq("baseTemplateId", args.baseTemplateId)
      )
      .filter((q) => q.eq(q.field("organizationId"), organizationId))
      .first();
  },
});
