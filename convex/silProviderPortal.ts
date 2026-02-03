import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// SIL PROVIDER PORTAL - RESTRICTED ACCESS QUERIES
// ============================================

// Get portal dashboard data for a SIL provider
export const getDashboard = query({
  args: { silProviderId: v.id("silProviders") },
  handler: async (ctx, args) => {
    // Get active property allocations
    const propertyLinks = await ctx.db
      .query("silProviderProperties")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const propertyIds = propertyLinks.map((l) => l.propertyId);

    // Get properties with basic info only (no owner/financial details)
    const properties = await Promise.all(
      propertyLinks.map(async (link) => {
        const property = await ctx.db.get(link.propertyId);
        if (!property) return null;

        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .collect();

        // Get participant names only (no NDIS details)
        const participants = await Promise.all(
          dwellings.map(async (dwelling) => {
            const dwellingParticipants = await ctx.db
              .query("participants")
              .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
              .filter((q) => q.eq(q.field("status"), "active"))
              .collect();

            return dwellingParticipants.map((p) => ({
              _id: p._id,
              firstName: p.firstName,
              lastName: p.lastName,
              dwellingId: p.dwellingId,
            }));
          })
        );

        return {
          _id: property._id,
          propertyName: property.propertyName,
          addressLine1: property.addressLine1,
          suburb: property.suburb,
          state: property.state,
          postcode: property.postcode,
          accessLevel: link.accessLevel,
          dwellings: dwellings.map((d) => ({
            _id: d._id,
            dwellingName: d.dwellingName,
            currentOccupancy: d.currentOccupancy,
            maxParticipants: d.maxParticipants,
          })),
          participants: participants.flat(),
        };
      })
    );

    // Get open incidents for these properties
    const allIncidents = await ctx.db.query("incidents").collect();
    const openIncidents = allIncidents.filter(
      (i) =>
        propertyIds.some((pid) => pid === i.propertyId) &&
        (i.status === "reported" || i.status === "under_investigation")
    );

    // Get open maintenance requests for dwellings in these properties
    const allDwellingIds: Id<"dwellings">[] = [];
    for (const prop of properties.filter((p) => p !== null)) {
      for (const d of prop!.dwellings) {
        allDwellingIds.push(d._id);
      }
    }

    const allMaintenance = await ctx.db.query("maintenanceRequests").collect();
    const openMaintenance = allMaintenance.filter(
      (m) =>
        allDwellingIds.some((did) => did === m.dwellingId) &&
        m.status !== "completed" &&
        m.status !== "cancelled"
    );

    return {
      properties: properties.filter((p) => p !== null),
      stats: {
        totalProperties: properties.filter((p) => p !== null).length,
        openIncidents: openIncidents.length,
        openMaintenance: openMaintenance.length,
      },
    };
  },
});

// Get incidents for SIL provider (only their allocated properties)
export const getIncidents = query({
  args: {
    silProviderId: v.id("silProviders"),
    status: v.optional(
      v.union(
        v.literal("reported"),
        v.literal("under_investigation"),
        v.literal("resolved"),
        v.literal("closed")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get property allocations with incidents access
    const propertyLinks = await ctx.db
      .query("silProviderProperties")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter to only properties where they have incident access
    const accessiblePropertyIds = propertyLinks
      .filter((l) => l.accessLevel === "full" || l.accessLevel === "incidents_only")
      .map((l) => l.propertyId);

    if (accessiblePropertyIds.length === 0) {
      return [];
    }

    // Get incidents
    let incidents = await ctx.db.query("incidents").collect();

    // Filter by accessible properties
    incidents = incidents.filter((i) =>
      accessiblePropertyIds.some((pid) => pid === i.propertyId)
    );

    // Filter by status if specified
    if (args.status) {
      incidents = incidents.filter((i) => i.status === args.status);
    }

    // Enrich with property and participant info
    const enrichedIncidents = await Promise.all(
      incidents.map(async (incident) => {
        const property = await ctx.db.get(incident.propertyId);
        const dwelling = incident.dwellingId
          ? await ctx.db.get(incident.dwellingId)
          : null;
        const participant = incident.participantId
          ? await ctx.db.get(incident.participantId)
          : null;

        return {
          ...incident,
          property: property
            ? {
                _id: property._id,
                propertyName: property.propertyName,
                addressLine1: property.addressLine1,
                suburb: property.suburb,
              }
            : null,
          dwelling: dwelling
            ? {
                _id: dwelling._id,
                dwellingName: dwelling.dwellingName,
              }
            : null,
          participant: participant
            ? {
                _id: participant._id,
                firstName: participant.firstName,
                lastName: participant.lastName,
              }
            : null,
        };
      })
    );

    return enrichedIncidents.sort(
      (a, b) =>
        new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime()
    );
  },
});

// Create incident (SIL provider)
export const createIncident = mutation({
  args: {
    silProviderId: v.id("silProviders"),
    userId: v.id("users"),
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
  },
  handler: async (ctx, args) => {
    // Verify provider has access to this property
    const propertyLink = await ctx.db
      .query("silProviderProperties")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .filter((q) =>
        q.and(
          q.eq(q.field("propertyId"), args.propertyId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!propertyLink) {
      throw new Error("You do not have access to this property");
    }

    if (
      propertyLink.accessLevel !== "full" &&
      propertyLink.accessLevel !== "incidents_only"
    ) {
      throw new Error("You do not have permission to create incidents");
    }

    const now = Date.now();

    // Determine if NDIS reportable
    const reportableTypes = [
      "death",
      "serious_injury",
      "unauthorized_restrictive_practice",
      "sexual_assault",
      "sexual_misconduct",
      "staff_assault",
      "unlawful_conduct",
      "unexplained_injury",
      "missing_participant",
    ];
    const isNdisReportable = reportableTypes.includes(args.incidentType);
    const is24Hour = [
      "death",
      "serious_injury",
      "unauthorized_restrictive_practice",
      "sexual_assault",
      "sexual_misconduct",
      "staff_assault",
    ].includes(args.incidentType);

    const incidentId = await ctx.db.insert("incidents", {
      propertyId: args.propertyId,
      dwellingId: args.dwellingId,
      participantId: args.participantId,
      incidentType: args.incidentType,
      severity: args.severity,
      title: args.title,
      description: args.description,
      incidentDate: args.incidentDate,
      incidentTime: args.incidentTime,
      location: args.location,
      witnessNames: args.witnessNames,
      immediateActionTaken: args.immediateActionTaken,
      followUpRequired: args.followUpRequired,
      followUpNotes: args.followUpNotes,
      status: "reported",
      reportedBy: args.userId,
      isNdisReportable,
      ndisNotificationTimeframe: isNdisReportable
        ? is24Hour
          ? "24_hours"
          : "5_business_days"
        : undefined,
      createdAt: now,
      updatedAt: now,
    });

    return incidentId;
  },
});

// Get maintenance requests for SIL provider
export const getMaintenanceRequests = query({
  args: {
    silProviderId: v.id("silProviders"),
    status: v.optional(
      v.union(
        v.literal("reported"),
        v.literal("awaiting_quotes"),
        v.literal("quoted"),
        v.literal("approved"),
        v.literal("scheduled"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get property allocations with maintenance access
    const propertyLinks = await ctx.db
      .query("silProviderProperties")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter to only properties where they have maintenance access
    const accessiblePropertyIds = propertyLinks
      .filter(
        (l) => l.accessLevel === "full" || l.accessLevel === "maintenance_only"
      )
      .map((l) => l.propertyId);

    if (accessiblePropertyIds.length === 0) {
      return [];
    }

    // Get dwelling IDs for these properties
    const dwellings = await Promise.all(
      accessiblePropertyIds.map(async (propertyId) => {
        return ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
          .collect();
      })
    );
    const accessibleDwellingIds = dwellings.flat().map((d) => d._id);

    // Get maintenance requests
    let requests = await ctx.db.query("maintenanceRequests").collect();

    // Filter by accessible dwellings
    requests = requests.filter((r) =>
      accessibleDwellingIds.some((did) => did === r.dwellingId)
    );

    // Filter by status if specified
    if (args.status) {
      requests = requests.filter((r) => r.status === args.status);
    }

    // Enrich with dwelling and property info (no costs for SIL providers)
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const dwelling = await ctx.db.get(request.dwellingId);
        const property = dwelling
          ? await ctx.db.get(dwelling.propertyId)
          : null;

        return {
          _id: request._id,
          dwellingId: request.dwellingId,
          requestType: request.requestType,
          category: request.category,
          priority: request.priority,
          title: request.title,
          description: request.description,
          reportedBy: request.reportedBy,
          reportedDate: request.reportedDate,
          status: request.status,
          scheduledDate: request.scheduledDate,
          completedDate: request.completedDate,
          notes: request.notes,
          createdAt: request.createdAt,
          // No cost info for SIL providers
          dwelling: dwelling
            ? {
                _id: dwelling._id,
                dwellingName: dwelling.dwellingName,
              }
            : null,
          property: property
            ? {
                _id: property._id,
                propertyName: property.propertyName,
                addressLine1: property.addressLine1,
                suburb: property.suburb,
              }
            : null,
        };
      })
    );

    return enrichedRequests.sort(
      (a, b) =>
        new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime()
    );
  },
});

// Create maintenance request (SIL provider)
export const createMaintenanceRequest = mutation({
  args: {
    silProviderId: v.id("silProviders"),
    userId: v.id("users"),
    dwellingId: v.id("dwellings"),
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
  },
  handler: async (ctx, args) => {
    // Get dwelling to find property
    const dwelling = await ctx.db.get(args.dwellingId);
    if (!dwelling) {
      throw new Error("Dwelling not found");
    }

    // Verify provider has access to this property
    const propertyLink = await ctx.db
      .query("silProviderProperties")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .filter((q) =>
        q.and(
          q.eq(q.field("propertyId"), dwelling.propertyId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!propertyLink) {
      throw new Error("You do not have access to this property");
    }

    if (
      propertyLink.accessLevel !== "full" &&
      propertyLink.accessLevel !== "maintenance_only"
    ) {
      throw new Error("You do not have permission to create maintenance requests");
    }

    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    const requestId = await ctx.db.insert("maintenanceRequests", {
      dwellingId: args.dwellingId,
      requestType: "reactive",
      category: args.category,
      priority: args.priority,
      title: args.title,
      description: args.description,
      reportedBy: args.reportedBy || "SIL Provider",
      reportedDate: today,
      status: "reported",
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return requestId;
  },
});

// Get single incident (for detail view)
export const getIncidentById = query({
  args: {
    silProviderId: v.id("silProviders"),
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) return null;

    // Verify provider has access
    const propertyLink = await ctx.db
      .query("silProviderProperties")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .filter((q) =>
        q.and(
          q.eq(q.field("propertyId"), incident.propertyId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!propertyLink) return null;
    if (
      propertyLink.accessLevel !== "full" &&
      propertyLink.accessLevel !== "incidents_only"
    ) {
      return null;
    }

    const property = await ctx.db.get(incident.propertyId);
    const dwelling = incident.dwellingId
      ? await ctx.db.get(incident.dwellingId)
      : null;
    const participant = incident.participantId
      ? await ctx.db.get(incident.participantId)
      : null;

    // Get photos
    const photos = await ctx.db
      .query("incidentPhotos")
      .withIndex("by_incident", (q) => q.eq("incidentId", incident._id))
      .collect();

    // Get actions
    const actions = await ctx.db
      .query("incidentActions")
      .withIndex("by_incident", (q) => q.eq("incidentId", incident._id))
      .collect();

    return {
      ...incident,
      property: property
        ? {
            _id: property._id,
            propertyName: property.propertyName,
            addressLine1: property.addressLine1,
            suburb: property.suburb,
          }
        : null,
      dwelling: dwelling
        ? {
            _id: dwelling._id,
            dwellingName: dwelling.dwellingName,
          }
        : null,
      participant: participant
        ? {
            _id: participant._id,
            firstName: participant.firstName,
            lastName: participant.lastName,
          }
        : null,
      photos,
      actions,
    };
  },
});

// Get single maintenance request (for detail view)
export const getMaintenanceRequestById = query({
  args: {
    silProviderId: v.id("silProviders"),
    requestId: v.id("maintenanceRequests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    const dwelling = await ctx.db.get(request.dwellingId);
    if (!dwelling) return null;

    // Verify provider has access
    const propertyLink = await ctx.db
      .query("silProviderProperties")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .filter((q) =>
        q.and(
          q.eq(q.field("propertyId"), dwelling.propertyId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!propertyLink) return null;
    if (
      propertyLink.accessLevel !== "full" &&
      propertyLink.accessLevel !== "maintenance_only"
    ) {
      return null;
    }

    const property = await ctx.db.get(dwelling.propertyId);

    // Get photos
    const photos = await ctx.db
      .query("maintenancePhotos")
      .withIndex("by_maintenance_request", (q) =>
        q.eq("maintenanceRequestId", request._id)
      )
      .collect();

    return {
      _id: request._id,
      dwellingId: request.dwellingId,
      requestType: request.requestType,
      category: request.category,
      priority: request.priority,
      title: request.title,
      description: request.description,
      reportedBy: request.reportedBy,
      reportedDate: request.reportedDate,
      status: request.status,
      scheduledDate: request.scheduledDate,
      completedDate: request.completedDate,
      notes: request.notes,
      createdAt: request.createdAt,
      // No cost info
      dwelling: {
        _id: dwelling._id,
        dwellingName: dwelling.dwellingName,
      },
      property: property
        ? {
            _id: property._id,
            propertyName: property.propertyName,
            addressLine1: property.addressLine1,
            suburb: property.suburb,
          }
        : null,
      photos,
    };
  },
});

// Check if user has SIL provider access
export const checkUserAccess = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    if (user.role !== "sil_provider" || !user.silProviderId) {
      return null;
    }

    const provider = await ctx.db.get(user.silProviderId);
    if (!provider || provider.status !== "active") {
      return null;
    }

    return {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      provider: {
        _id: provider._id,
        companyName: provider.companyName,
      },
    };
  },
});
