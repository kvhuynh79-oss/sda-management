import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * REST API Query & Mutation Module - Sprint 7
 *
 * These functions are designed specifically for the REST API layer.
 * They accept `organizationId` directly (authenticated via API key,
 * not user session) and return clean JSON responses without internal
 * Convex fields like `_creationTime`.
 *
 * All queries scope data by organizationId for full tenant isolation.
 * Results are capped at 100 records per request by default.
 */

const MAX_RESULTS = 100;

// ============================================================================
// PROPERTIES
// ============================================================================

/**
 * List properties for an organization.
 * Supports optional status and search filters.
 */
export const listProperties = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? MAX_RESULTS, MAX_RESULTS);

    let properties = await ctx.db
      .query("properties")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter by status
    if (args.status) {
      properties = properties.filter((p) => p.propertyStatus === args.status);
    }

    // Filter by search (address or name)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      properties = properties.filter(
        (p) =>
          p.addressLine1.toLowerCase().includes(searchLower) ||
          p.suburb.toLowerCase().includes(searchLower) ||
          (p.propertyName && p.propertyName.toLowerCase().includes(searchLower))
      );
    }

    // Cap results
    properties = properties.slice(0, limit);

    return properties.map((p) => ({
      id: p._id,
      propertyName: p.propertyName ?? null,
      addressLine1: p.addressLine1,
      addressLine2: p.addressLine2 ?? null,
      suburb: p.suburb,
      state: p.state,
      postcode: p.postcode,
      propertyStatus: p.propertyStatus ?? null,
      ownerId: p.ownerId ?? null,
      ownershipType: p.ownershipType ?? null,
      sdaRegistrationNumber: p.sdaRegistrationNumber ?? null,
      sdaRegistrationDate: p.sdaRegistrationDate ?? null,
      managementFeePercent: p.managementFeePercent ?? null,
      isActive: p.isActive,
      notes: p.notes ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },
});

/**
 * Create a property via the REST API.
 * Requires write:properties permission on the API key.
 */
export const createProperty = mutation({
  args: {
    organizationId: v.id("organizations"),
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
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, ...propertyData } = args;
    const now = Date.now();

    const propertyId = await ctx.db.insert("properties", {
      organizationId,
      ...propertyData,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { id: propertyId };
  },
});

// ============================================================================
// PARTICIPANTS
// ============================================================================

/**
 * List participants for an organization.
 * Supports optional status and search filters.
 */
export const listParticipants = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? MAX_RESULTS, MAX_RESULTS);

    let participants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter by status
    if (args.status) {
      participants = participants.filter((p) => p.status === args.status);
    }

    // Filter by search (name or NDIS number)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      participants = participants.filter(
        (p) =>
          p.firstName.toLowerCase().includes(searchLower) ||
          p.lastName.toLowerCase().includes(searchLower) ||
          p.ndisNumber.toLowerCase().includes(searchLower)
      );
    }

    // Cap results
    participants = participants.slice(0, limit);

    return participants.map((p) => ({
      id: p._id,
      ndisNumber: p.ndisNumber,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      dwellingId: p.dwellingId,
      moveInDate: p.moveInDate ?? null,
      moveOutDate: p.moveOutDate ?? null,
      status: p.status,
      silProviderName: p.silProviderName ?? null,
      supportCoordinatorName: p.supportCoordinatorName ?? null,
      supportCoordinatorEmail: p.supportCoordinatorEmail ?? null,
      supportCoordinatorPhone: p.supportCoordinatorPhone ?? null,
      notes: p.notes ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },
});

/**
 * Create a participant via the REST API.
 * Requires write:participants permission on the API key.
 */
export const createParticipant = mutation({
  args: {
    organizationId: v.id("organizations"),
    ndisNumber: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),
    dwellingId: v.id("dwellings"),
    moveInDate: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("pending_move_in"))
    ),
    silProviderName: v.optional(v.string()),
    supportCoordinatorName: v.optional(v.string()),
    supportCoordinatorEmail: v.optional(v.string()),
    supportCoordinatorPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, ...participantData } = args;
    const now = Date.now();

    // Verify the dwelling belongs to this organization
    const dwelling = await ctx.db.get(args.dwellingId);
    if (!dwelling || dwelling.organizationId !== organizationId) {
      throw new Error("Dwelling not found or does not belong to this organization");
    }

    const participantId = await ctx.db.insert("participants", {
      organizationId,
      ...participantData,
      status: participantData.status ?? "active",
      createdAt: now,
      updatedAt: now,
    });

    return { id: participantId };
  },
});

// ============================================================================
// MAINTENANCE REQUESTS
// ============================================================================

/**
 * List maintenance requests for an organization.
 * Supports optional status, priority, and search filters.
 */
export const listMaintenanceRequests = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? MAX_RESULTS, MAX_RESULTS);

    let requests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter by status
    if (args.status) {
      requests = requests.filter((r) => r.status === args.status);
    }

    // Filter by priority
    if (args.priority) {
      requests = requests.filter((r) => r.priority === args.priority);
    }

    // Filter by search (title or description)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      requests = requests.filter(
        (r) =>
          r.title.toLowerCase().includes(searchLower) ||
          r.description.toLowerCase().includes(searchLower)
      );
    }

    // Cap results
    requests = requests.slice(0, limit);

    return requests.map((r) => ({
      id: r._id,
      dwellingId: r.dwellingId,
      requestType: r.requestType,
      category: r.category,
      priority: r.priority,
      title: r.title,
      description: r.description,
      reportedBy: r.reportedBy ?? null,
      reportedDate: r.reportedDate,
      status: r.status,
      scheduledDate: r.scheduledDate ?? null,
      completedDate: r.completedDate ?? null,
      contractorName: r.contractorName ?? null,
      assignedContractorId: r.assignedContractorId ?? null,
      quotedAmount: r.quotedAmount ?? null,
      actualCost: r.actualCost ?? null,
      invoiceNumber: r.invoiceNumber ?? null,
      notes: r.notes ?? null,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },
});

/**
 * Create a maintenance request via the REST API.
 * Requires write:maintenance permission on the API key.
 *
 * NOTE: The createdBy field is set to a placeholder value because
 * API key auth does not have a user context. In production, the
 * organizationId is used for tenant isolation.
 */
export const createMaintenanceRequest = mutation({
  args: {
    organizationId: v.id("organizations"),
    dwellingId: v.id("dwellings"),
    requestType: v.union(v.literal("reactive"), v.literal("preventative")),
    category: v.union(
      v.literal("plumbing"),
      v.literal("electrical"),
      v.literal("appliances"),
      v.literal("building"),
      v.literal("grounds"),
      v.literal("safety"),
      v.literal("general")
    ),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    title: v.string(),
    description: v.string(),
    reportedBy: v.optional(v.string()),
    reportedDate: v.string(),
    contractorName: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId, ...requestData } = args;

    // Verify the dwelling belongs to this organization
    const dwelling = await ctx.db.get(args.dwellingId);
    if (!dwelling || dwelling.organizationId !== organizationId) {
      throw new Error("Dwelling not found or does not belong to this organization");
    }

    const now = Date.now();

    const requestId = await ctx.db.insert("maintenanceRequests", {
      organizationId,
      ...requestData,
      status: "reported",
      createdAt: now,
      updatedAt: now,
    });

    return { id: requestId };
  },
});

// ============================================================================
// INCIDENTS
// ============================================================================

/**
 * List incidents for an organization.
 * Supports optional status, severity, and search filters.
 */
export const listIncidents = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    severity: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? MAX_RESULTS, MAX_RESULTS);

    let incidents = await ctx.db
      .query("incidents")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter by status
    if (args.status) {
      incidents = incidents.filter((i) => i.status === args.status);
    }

    // Filter by severity
    if (args.severity) {
      incidents = incidents.filter((i) => i.severity === args.severity);
    }

    // Filter by search (title or description)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      incidents = incidents.filter(
        (i) =>
          i.title.toLowerCase().includes(searchLower) ||
          i.description.toLowerCase().includes(searchLower)
      );
    }

    // Cap results
    incidents = incidents.slice(0, limit);

    return incidents.map((i) => ({
      id: i._id,
      propertyId: i.propertyId,
      dwellingId: i.dwellingId ?? null,
      participantId: i.participantId ?? null,
      incidentType: i.incidentType,
      severity: i.severity,
      isNdisReportable: i.isNdisReportable ?? false,
      ndisNotificationTimeframe: i.ndisNotificationTimeframe ?? null,
      ndisCommissionNotified: i.ndisCommissionNotified ?? false,
      ndisNotificationDueDate: i.ndisNotificationDueDate ?? null,
      title: i.title,
      description: i.description,
      incidentDate: i.incidentDate,
      incidentTime: i.incidentTime ?? null,
      location: i.location ?? null,
      followUpRequired: i.followUpRequired,
      status: i.status,
      reportedBy: i.reportedBy,
      notes: i.followUpNotes ?? null,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  },
});

/**
 * Create an incident via the REST API.
 * Requires write:incidents permission on the API key.
 */
export const createIncident = mutation({
  args: {
    organizationId: v.id("organizations"),
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
      v.literal("death"),
      v.literal("serious_injury"),
      v.literal("unauthorized_restrictive_practice"),
      v.literal("sexual_assault"),
      v.literal("sexual_misconduct"),
      v.literal("staff_assault"),
      v.literal("unlawful_conduct"),
      v.literal("unexplained_injury"),
      v.literal("missing_participant"),
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
    reportedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId, ...incidentData } = args;

    // Verify the property belongs to this organization
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.organizationId !== organizationId) {
      throw new Error("Property not found or does not belong to this organization");
    }

    const now = Date.now();

    const incidentId = await ctx.db.insert("incidents", {
      organizationId,
      ...incidentData,
      status: "reported",
      createdAt: now,
      updatedAt: now,
    });

    return { id: incidentId };
  },
});
