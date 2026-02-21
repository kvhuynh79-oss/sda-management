import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth, requireTenant, enforcePlanLimit, requireActiveSubscription } from "./authHelpers";
import { paginationArgs, DEFAULT_PAGE_SIZE } from "./paginationHelpers";
import { decryptField } from "./lib/encryption";

// Create a new property
export const create = mutation({
  args: {
    userId: v.id("users"), // Required for audit logging
    propertyName: v.optional(v.string()),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    suburb: v.string(),
    state: v.union(
      v.literal("NSW"),
      v.literal("VIC"),
      v.literal("QLD"),
      v.literal("SA"),
      v.literal("WA"),
      v.literal("TAS"),
      v.literal("NT"),
      v.literal("ACT")
    ),
    postcode: v.string(),
    propertyStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("under_construction"),
        v.literal("planning"),
        v.literal("sil_property")
      )
    ),
    expectedCompletionDate: v.optional(v.string()),
    // SIL Property fields
    silProviderName: v.optional(v.string()), // Legacy free text
    silProviderId: v.optional(v.id("silProviders")), // Link to SIL provider
    silServiceScope: v.optional(
      v.union(
        v.literal("full_management"),
        v.literal("maintenance_only"),
        v.literal("incidents_only"),
        v.literal("maintenance_and_incidents")
      )
    ),
    silContractStartDate: v.optional(v.string()),
    silContractEndDate: v.optional(v.string()),
    silMonthlyFee: v.optional(v.number()),
    silContactName: v.optional(v.string()),
    silContactPhone: v.optional(v.string()),
    silContactEmail: v.optional(v.string()),
    // Owner fields - optional for SIL properties
    ownerId: v.optional(v.id("owners")),
    ownershipType: v.optional(v.union(v.literal("investor"), v.literal("self_owned"), v.literal("sil_managed"))),
    revenueSharePercent: v.optional(v.number()),
    managementFeePercent: v.optional(v.number()), // % of revenue kept as management fee (0-100)
    sdaRegistrationNumber: v.optional(v.string()),
    sdaRegistrationDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);
    // Verify user has permission to create properties
    const user = await requirePermission(ctx, args.userId, "properties", "create");
    // B2 FIX: Enforce plan limits on property creation
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await enforcePlanLimit(ctx, organizationId, "properties", auditUser);
    // B5 FIX: Require active subscription for write operations
    await requireActiveSubscription(ctx, organizationId, auditUser);

    const { userId, ...propertyData } = args;
    const now = Date.now();
    const propertyId = await ctx.db.insert("properties", {
      organizationId, // Multi-tenant: Associate with organization
      ...propertyData,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log the creation
    const propertyName = args.propertyName || args.addressLine1;
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "property",
      entityId: propertyId,
      entityName: propertyName,
      metadata: JSON.stringify({
        suburb: args.suburb,
        state: args.state,
        postcode: args.postcode,
      }),
    });

    return propertyId;
  },
});

// Get all properties with owner info
export const getAll = query({
  args: {
    userId: v.id("users"), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);

    const properties = await ctx.db
      .query("properties")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Batch fetch all owners to avoid N+1 queries (filter out undefined for SIL properties)
    const ownerIds = [...new Set(properties.map((p) => p.ownerId).filter((id): id is NonNullable<typeof id> => id !== undefined))];
    const owners = await Promise.all(ownerIds.map((id) => ctx.db.get(id)));
    const ownerMap = new Map(owners.map((o, i) => [ownerIds[i], o]));

    // Batch fetch all active dwellings using index for performance
    const allDwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    // Group dwellings by property
    const dwellingsByProperty = new Map<string, typeof allDwellings>();
    for (const dwelling of allDwellings) {
      const key = dwelling.propertyId;
      if (!dwellingsByProperty.has(key)) {
        dwellingsByProperty.set(key, []);
      }
      dwellingsByProperty.get(key)!.push(dwelling);
    }

    // Build result with pre-fetched data
    const propertiesWithDetails = properties.map((property) => {
      const owner = property.ownerId ? ownerMap.get(property.ownerId) : null;
      const dwellings = dwellingsByProperty.get(property._id) || [];

      const totalCapacity = dwellings.reduce((sum, d) => sum + d.maxParticipants, 0);
      const currentOccupancy = dwellings.reduce((sum, d) => sum + d.currentOccupancy, 0);

      return {
        ...property,
        owner,
        dwellingCount: dwellings.length,
        totalCapacity,
        currentOccupancy,
        vacancies: totalCapacity - currentOccupancy,
      };
    });

    return propertiesWithDetails;
  },
});

// Get property by ID with full details
export const getById = query({
  args: {
    propertyId: v.id("properties"),
    userId: v.id("users"), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);

    const property = await ctx.db.get(args.propertyId);
    if (!property) return null;

    // Verify record belongs to user's organization
    if (property.organizationId !== organizationId) {
      throw new Error("Access denied: Property belongs to different organization");
    }

    const owner = property.ownerId ? await ctx.db.get(property.ownerId) : null;
    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Decrypt sensitive owner fields before returning to frontend
    const decryptedOwner = owner
      ? { ...owner, bankAccountNumber: await decryptField(owner.bankAccountNumber) ?? owner.bankAccountNumber }
      : null;

    return {
      ...property,
      owner: decryptedOwner,
      dwellings,
    };
  },
});

// Update property
export const update = mutation({
  args: {
    userId: v.id("users"),
    propertyId: v.id("properties"),
    propertyName: v.optional(v.string()),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.union(
      v.literal("NSW"),
      v.literal("VIC"),
      v.literal("QLD"),
      v.literal("SA"),
      v.literal("WA"),
      v.literal("TAS"),
      v.literal("NT"),
      v.literal("ACT")
    )),
    postcode: v.optional(v.string()),
    propertyStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("under_construction"),
        v.literal("planning"),
        v.literal("sil_property")
      )
    ),
    expectedCompletionDate: v.optional(v.string()),
    // SIL Property fields
    silProviderName: v.optional(v.string()),
    silProviderId: v.optional(v.id("silProviders")),
    silServiceScope: v.optional(
      v.union(
        v.literal("full_management"),
        v.literal("maintenance_only"),
        v.literal("incidents_only"),
        v.literal("maintenance_and_incidents")
      )
    ),
    silContractStartDate: v.optional(v.string()),
    silContractEndDate: v.optional(v.string()),
    silMonthlyFee: v.optional(v.number()),
    silContactName: v.optional(v.string()),
    silContactPhone: v.optional(v.string()),
    silContactEmail: v.optional(v.string()),
    // Owner fields
    ownerId: v.optional(v.id("owners")),
    ownershipType: v.optional(v.union(v.literal("investor"), v.literal("self_owned"), v.literal("sil_managed"))),
    revenueSharePercent: v.optional(v.number()),
    managementFeePercent: v.optional(v.number()), // % of revenue kept as management fee (0-100)
    sdaRegistrationNumber: v.optional(v.string()),
    sdaRegistrationDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { propertyId, userId, ...updates } = args;

    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, userId);
    // Verify user has permission to update properties
    const user = await requirePermission(ctx, userId, "properties", "update");

    // Get property for audit log
    const property = await ctx.db.get(propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    // Verify record belongs to user's organization
    if (property.organizationId !== organizationId) {
      throw new Error("Access denied: Property belongs to different organization");
    }

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(propertyId, filteredUpdates);

    // Audit log the update
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "property",
      entityId: propertyId,
      entityName: property.propertyName || property.addressLine1,
      changes: JSON.stringify(filteredUpdates),
    });

    return { success: true };
  },
});

// Delete (soft delete) property
export const remove = mutation({
  args: {
    propertyId: v.id("properties"),
    userId: v.id("users"), // Required for audit logging
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);
    // Verify user has permission to delete properties
    const user = await requirePermission(ctx, args.userId, "properties", "delete");

    // Get property details for audit log before deletion
    const property = await ctx.db.get(args.propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    // Verify record belongs to user's organization
    if (property.organizationId !== organizationId) {
      throw new Error("Access denied: Property belongs to different organization");
    }

    await ctx.db.patch(args.propertyId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Audit log the deletion
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "delete",
      entityType: "property",
      entityId: args.propertyId,
      entityName: property.propertyName || property.addressLine1,
      previousValues: JSON.stringify({
        propertyName: property.propertyName,
        addressLine1: property.addressLine1,
        suburb: property.suburb,
        state: property.state,
      }),
    });

    return { success: true };
  },
});

// Get properties with pagination
export const getAllPaginated = query({
  args: {
    userId: v.id("users"), // Required for tenant isolation
    ...paginationArgs,
    status: v.optional(v.string()),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Build query based on filters - always scope to organizationId first
    let result;

    if (args.status) {
      // Filter by status + organization
      const statusQuery = ctx.db
        .query("properties")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .filter((q) =>
          q.and(
            q.eq(q.field("isActive"), true),
            q.eq(q.field("propertyStatus"), args.status as any)
          )
        );
      result = await statusQuery.paginate(args.paginationOpts);
    } else if (args.state) {
      // Filter by state + organization
      const stateQuery = ctx.db
        .query("properties")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .filter((q) =>
          q.and(
            q.eq(q.field("isActive"), true),
            q.eq(q.field("state"), args.state as any)
          )
        );
      result = await stateQuery.paginate(args.paginationOpts);
    } else {
      // Default: all active properties in organization
      const defaultQuery = ctx.db
        .query("properties")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .filter((q) => q.eq(q.field("isActive"), true));
      result = await defaultQuery.paginate(args.paginationOpts);
    }

    // Enrich with owner and dwelling data
    const enrichedPage = await Promise.all(
      result.page.map(async (property) => {
        const owner = property.ownerId ? await ctx.db.get(property.ownerId) : null;
        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        const totalCapacity = dwellings.reduce((sum, d) => sum + d.maxParticipants, 0);
        const currentOccupancy = dwellings.reduce((sum, d) => sum + d.currentOccupancy, 0);

        return {
          ...property,
          owner,
          dwellingCount: dwellings.length,
          totalCapacity,
          currentOccupancy,
          vacancies: totalCapacity - currentOccupancy,
        };
      })
    );

    return {
      ...result,
      page: enrichedPage,
    };
  },
});
