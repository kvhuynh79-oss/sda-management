import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// SIL PROVIDER PORTAL - RESTRICTED ACCESS QUERIES
// Uses dwelling-level allocations (silProviderDwellings)
// ============================================

// Get portal dashboard data for a SIL provider
export const getDashboard = query({
  args: { silProviderId: v.id("silProviders") },
  handler: async (ctx, args) => {
    // Get active dwelling allocations
    const dwellingLinks = await ctx.db
      .query("silProviderDwellings")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get dwellings with property info grouped by property
    const propertyMap = new Map<
      Id<"properties">,
      {
        property: any;
        dwellings: Array<{
          _id: Id<"dwellings">;
          dwellingName: string;
          currentOccupancy: number;
          maxParticipants: number;
          accessLevel: string;
        }>;
        participants: Array<{
          _id: Id<"participants">;
          firstName: string;
          lastName: string;
          dwellingId?: Id<"dwellings">;
        }>;
      }
    >();

    for (const link of dwellingLinks) {
      const dwelling = await ctx.db.get(link.dwellingId);
      if (!dwelling) continue;

      const property = await ctx.db.get(dwelling.propertyId);
      if (!property) continue;

      // Get participants for this dwelling
      const dwellingParticipants = await ctx.db
        .query("participants")
        .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      const participants = dwellingParticipants.map((p) => ({
        _id: p._id,
        firstName: p.firstName,
        lastName: p.lastName,
        dwellingId: p.dwellingId,
      }));

      if (!propertyMap.has(property._id)) {
        propertyMap.set(property._id, {
          property: {
            _id: property._id,
            propertyName: property.propertyName,
            addressLine1: property.addressLine1,
            suburb: property.suburb,
            state: property.state,
            postcode: property.postcode,
          },
          dwellings: [],
          participants: [],
        });
      }

      const entry = propertyMap.get(property._id)!;
      entry.dwellings.push({
        _id: dwelling._id,
        dwellingName: dwelling.dwellingName,
        currentOccupancy: dwelling.currentOccupancy,
        maxParticipants: dwelling.maxParticipants,
        accessLevel: link.accessLevel,
      });
      entry.participants.push(...participants);
    }

    // Convert map to array format
    const properties = Array.from(propertyMap.values()).map((entry) => ({
      _id: entry.property._id,
      propertyName: entry.property.propertyName,
      addressLine1: entry.property.addressLine1,
      suburb: entry.property.suburb,
      state: entry.property.state,
      postcode: entry.property.postcode,
      // Access level is now per-dwelling, not per-property
      dwellings: entry.dwellings,
      participants: entry.participants,
    }));

    // Get property IDs for incident filtering
    const propertyIds = Array.from(propertyMap.keys());
    const allDwellingIds = dwellingLinks.map((l) => l.dwellingId);

    // Get open incidents for properties with dwellings we have access to
    const allIncidents = await ctx.db.query("incidents").collect();
    const openIncidents = allIncidents.filter(
      (i) =>
        propertyIds.some((pid) => pid === i.propertyId) &&
        (i.status === "reported" || i.status === "under_investigation")
    );

    // Get open maintenance requests for dwellings we have access to
    const allMaintenance = await ctx.db.query("maintenanceRequests").collect();
    const openMaintenance = allMaintenance.filter(
      (m) =>
        allDwellingIds.some((did) => did === m.dwellingId) &&
        m.status !== "completed" &&
        m.status !== "cancelled"
    );

    // Calculate vacancies - only for dwellings we have access to
    const vacancies: Array<{
      propertyId: Id<"properties">;
      propertyName: string;
      propertyAddress: string;
      dwellingId: Id<"dwellings">;
      dwellingName: string;
      availableSpots: number;
      maxParticipants: number;
      currentOccupancy: number;
    }> = [];

    for (const entry of propertyMap.values()) {
      for (const dwelling of entry.dwellings) {
        const availableSpots = dwelling.maxParticipants - dwelling.currentOccupancy;
        if (availableSpots > 0) {
          vacancies.push({
            propertyId: entry.property._id,
            propertyName: entry.property.propertyName || entry.property.addressLine1,
            propertyAddress: `${entry.property.addressLine1}, ${entry.property.suburb}`,
            dwellingId: dwelling._id,
            dwellingName: dwelling.dwellingName,
            availableSpots,
            maxParticipants: dwelling.maxParticipants,
            currentOccupancy: dwelling.currentOccupancy,
          });
        }
      }
    }

    // Count total vacant spots
    const totalVacantSpots = vacancies.reduce((sum, v) => sum + v.availableSpots, 0);

    return {
      properties,
      vacancies,
      stats: {
        totalProperties: properties.length,
        totalDwellings: allDwellingIds.length,
        openIncidents: openIncidents.length,
        openMaintenance: openMaintenance.length,
        totalVacantSpots,
        vacantDwellings: vacancies.length,
      },
    };
  },
});

// Get incidents for SIL provider (only for dwellings they have access to)
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
    // Get dwelling allocations with incidents access
    const dwellingLinks = await ctx.db
      .query("silProviderDwellings")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter to dwellings where they have incident access
    const accessibleDwellingLinks = dwellingLinks.filter(
      (l) => l.accessLevel === "full" || l.accessLevel === "incidents_only"
    );

    if (accessibleDwellingLinks.length === 0) {
      return [];
    }

    // Get property IDs for these dwellings
    const dwellingToPropertyMap = new Map<Id<"dwellings">, Id<"properties">>();
    const accessiblePropertyIds: Id<"properties">[] = [];

    for (const link of accessibleDwellingLinks) {
      const dwelling = await ctx.db.get(link.dwellingId);
      if (dwelling) {
        dwellingToPropertyMap.set(dwelling._id, dwelling.propertyId);
        if (!accessiblePropertyIds.includes(dwelling.propertyId)) {
          accessiblePropertyIds.push(dwelling.propertyId);
        }
      }
    }

    // Get incidents for properties that have accessible dwellings
    let incidents = await ctx.db.query("incidents").collect();

    // Filter by accessible properties (incidents are at property level)
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

// Create incident (SIL provider) - requires dwelling to be specified
export const createIncident = mutation({
  args: {
    silProviderId: v.id("silProviders"),
    userId: v.id("users"),
    propertyId: v.id("properties"),
    dwellingId: v.id("dwellings"), // Now required - incidents are tied to dwellings
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
    // Verify provider has access to this dwelling
    const dwellingLink = await ctx.db
      .query("silProviderDwellings")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId))
      .filter((q) =>
        q.and(
          q.eq(q.field("silProviderId"), args.silProviderId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!dwellingLink) {
      throw new Error("You do not have access to this dwelling");
    }

    if (
      dwellingLink.accessLevel !== "full" &&
      dwellingLink.accessLevel !== "incidents_only"
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

    // Get organizationId from the property for tenant isolation
    const propertyRecord = await ctx.db.get(args.propertyId);
    const incidentOrganizationId = propertyRecord?.organizationId;

    const incidentId = await ctx.db.insert("incidents", {
      organizationId: incidentOrganizationId,
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

// Get maintenance requests for SIL provider (only for dwellings they have access to)
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
    // Get dwelling allocations with maintenance access
    const dwellingLinks = await ctx.db
      .query("silProviderDwellings")
      .withIndex("by_provider", (q) => q.eq("silProviderId", args.silProviderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter to dwellings where they have maintenance access
    const accessibleDwellingIds = dwellingLinks
      .filter(
        (l) => l.accessLevel === "full" || l.accessLevel === "maintenance_only"
      )
      .map((l) => l.dwellingId);

    if (accessibleDwellingIds.length === 0) {
      return [];
    }

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
    // Verify provider has access to this dwelling
    const dwellingLink = await ctx.db
      .query("silProviderDwellings")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", args.dwellingId))
      .filter((q) =>
        q.and(
          q.eq(q.field("silProviderId"), args.silProviderId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!dwellingLink) {
      throw new Error("You do not have access to this dwelling");
    }

    if (
      dwellingLink.accessLevel !== "full" &&
      dwellingLink.accessLevel !== "maintenance_only"
    ) {
      throw new Error("You do not have permission to create maintenance requests");
    }

    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    // Get organizationId from the dwelling for tenant isolation
    const dwellingRecord = await ctx.db.get(args.dwellingId);
    const mrOrganizationId = dwellingRecord?.organizationId;

    const requestId = await ctx.db.insert("maintenanceRequests", {
      organizationId: mrOrganizationId,
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

    // Incident must have a dwelling to verify access
    if (!incident.dwellingId) return null;

    // Verify provider has access to this dwelling
    const dwellingLink = await ctx.db
      .query("silProviderDwellings")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", incident.dwellingId!))
      .filter((q) =>
        q.and(
          q.eq(q.field("silProviderId"), args.silProviderId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!dwellingLink) return null;
    if (
      dwellingLink.accessLevel !== "full" &&
      dwellingLink.accessLevel !== "incidents_only"
    ) {
      return null;
    }

    const property = await ctx.db.get(incident.propertyId);
    const dwelling = await ctx.db.get(incident.dwellingId);
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

    // Verify provider has access to this dwelling
    const dwellingLink = await ctx.db
      .query("silProviderDwellings")
      .withIndex("by_dwelling", (q) => q.eq("dwellingId", request.dwellingId))
      .filter((q) =>
        q.and(
          q.eq(q.field("silProviderId"), args.silProviderId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!dwellingLink) return null;
    if (
      dwellingLink.accessLevel !== "full" &&
      dwellingLink.accessLevel !== "maintenance_only"
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
