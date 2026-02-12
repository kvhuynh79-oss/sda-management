import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth, requireTenant } from "./authHelpers";
import { paginationArgs } from "./paginationHelpers";
import {
  validateRequiredString,
  validateNdisNumber,
  validateOptionalEmail,
  validateOptionalPhone,
  validateOptionalDate,
} from "./validationHelpers";
import { encryptField, decryptField, createBlindIndex, isEncrypted } from "./lib/encryption";

// Decrypt sensitive participant fields (handles both encrypted and plaintext for migration)
async function decryptParticipantFields<T extends Record<string, any>>(p: T): Promise<T> {
  const [ndisNumber, dateOfBirth, emergencyContactName, emergencyContactPhone, emergencyContactRelation] =
    await Promise.all([
      decryptField(p.ndisNumber),
      decryptField(p.dateOfBirth),
      decryptField(p.emergencyContactName),
      decryptField(p.emergencyContactPhone),
      decryptField(p.emergencyContactRelation),
    ]);
  return {
    ...p,
    ndisNumber: ndisNumber ?? p.ndisNumber,
    dateOfBirth: dateOfBirth ?? p.dateOfBirth,
    emergencyContactName: emergencyContactName ?? p.emergencyContactName,
    emergencyContactPhone: emergencyContactPhone ?? p.emergencyContactPhone,
    emergencyContactRelation: emergencyContactRelation ?? p.emergencyContactRelation,
  };
}

// Create a new participant
export const create = mutation({
  args: {
    userId: v.id("users"), // Required for audit logging
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
    status: v.optional(v.union(v.literal("active"), v.literal("pending_move_in"))),
    silProviderName: v.optional(v.string()),
    supportCoordinatorName: v.optional(v.string()),
    supportCoordinatorEmail: v.optional(v.string()),
    supportCoordinatorPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);
    // Verify user has permission
    const user = await requirePermission(ctx, args.userId, "participants", "create");

    // Validate inputs
    const validatedNdis = validateNdisNumber(args.ndisNumber);
    const validatedFirstName = validateRequiredString(args.firstName, "first name");
    const validatedLastName = validateRequiredString(args.lastName, "last name");
    const validatedEmail = validateOptionalEmail(args.email);
    const validatedPhone = validateOptionalPhone(args.phone);
    const validatedMoveInDate = validateOptionalDate(args.moveInDate, "move-in date");

    // Create blind index for NDIS number duplicate check
    const ndisBlindIndex = await createBlindIndex(validatedNdis);

    // Check if NDIS number already exists (using blind index for encrypted data)
    if (ndisBlindIndex) {
      const existingByIndex = await ctx.db
        .query("participants")
        .withIndex("by_ndisNumberIndex", (q) => q.eq("ndisNumberIndex", ndisBlindIndex))
        .first();
      if (existingByIndex) {
        throw new Error("A participant with this NDIS number already exists");
      }
    }
    // Fallback: also check legacy plaintext index (for pre-migration data)
    const existingPlaintext = await ctx.db
      .query("participants")
      .withIndex("by_ndisNumber", (q) => q.eq("ndisNumber", validatedNdis))
      .first();
    if (existingPlaintext) {
      throw new Error("A participant with this NDIS number already exists");
    }

    // Encrypt sensitive fields
    const [encNdisNumber, encDateOfBirth, encEmergencyName, encEmergencyPhone, encEmergencyRelation] =
      await Promise.all([
        encryptField(validatedNdis),
        encryptField(args.dateOfBirth),
        encryptField(args.emergencyContactName),
        encryptField(args.emergencyContactPhone),
        encryptField(args.emergencyContactRelation),
      ]);

    const now = Date.now();
    // Use provided status, or default to active if moveInDate is provided, pending_move_in otherwise
    const status = args.status || (validatedMoveInDate ? "active" : "pending_move_in");

    const participantId = await ctx.db.insert("participants", {
      organizationId, // Multi-tenant: Associate with organization
      ndisNumber: encNdisNumber ?? validatedNdis,
      ndisNumberIndex: ndisBlindIndex ?? undefined,
      firstName: validatedFirstName,
      lastName: validatedLastName,
      dateOfBirth: encDateOfBirth ?? args.dateOfBirth,
      email: validatedEmail,
      phone: validatedPhone,
      emergencyContactName: encEmergencyName ?? args.emergencyContactName,
      emergencyContactPhone: encEmergencyPhone ?? args.emergencyContactPhone,
      emergencyContactRelation: encEmergencyRelation ?? args.emergencyContactRelation,
      dwellingId: args.dwellingId,
      moveInDate: validatedMoveInDate,
      status,
      silProviderName: args.silProviderName,
      supportCoordinatorName: args.supportCoordinatorName,
      supportCoordinatorEmail: args.supportCoordinatorEmail,
      supportCoordinatorPhone: args.supportCoordinatorPhone,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Update dwelling occupancy (only counts active participants)
    await updateDwellingOccupancy(ctx, args.dwellingId);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "participant",
      entityId: participantId,
      entityName: `${args.firstName} ${args.lastName}`,
      metadata: JSON.stringify({ ndisNumberIndex: ndisBlindIndex, status }),
    });

    return participantId;
  },
});

// Helper to update dwelling occupancy
async function updateDwellingOccupancy(ctx: any, dwellingId: any) {
  const participants = await ctx.db
    .query("participants")
    .withIndex("by_dwelling", (q: any) => q.eq("dwellingId", dwellingId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect();

  const dwelling = await ctx.db.get(dwellingId);
  if (!dwelling) return;

  const currentOccupancy = participants.length;
  let occupancyStatus: "vacant" | "partially_occupied" | "fully_occupied";

  if (currentOccupancy === 0) {
    occupancyStatus = "vacant";
  } else if (currentOccupancy >= dwelling.maxParticipants) {
    occupancyStatus = "fully_occupied";
  } else {
    occupancyStatus = "partially_occupied";
  }

  await ctx.db.patch(dwellingId, {
    currentOccupancy,
    occupancyStatus,
    updatedAt: Date.now(),
  });
}

// Get all participants with dwelling and property info
export const getAll = query({
  args: {
    userId: v.id("users"), // Required for role-based filtering
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Get requesting user for role-based access control
    const requestingUser = await ctx.db.get(args.userId);
    if (!requestingUser) {
      throw new Error("User not found");
    }

    // Fetch participants scoped to organization using index
    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    let participants = allParticipants.filter((p) => p.status !== "moved_out");

    // Role-based filtering for SIL provider users
    if (requestingUser.role === "sil_provider" && requestingUser.silProviderId) {
      // Get all dwelling IDs this SIL provider has access to
      const silProviderDwellings = await ctx.db
        .query("silProviderDwellings")
        .withIndex("by_provider", (q) => q.eq("silProviderId", requestingUser.silProviderId!))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      const allowedDwellingIds = new Set(silProviderDwellings.map((spd) => spd.dwellingId));

      // Filter participants to only those in allowed dwellings
      participants = participants.filter((p) => allowedDwellingIds.has(p.dwellingId));
    }
    // Admin, property_manager, staff, accountant see all participants (no filtering)

    // Batch fetch all dwellings
    const dwellingIds = [...new Set(participants.map((p) => p.dwellingId))];
    const dwellings = await Promise.all(dwellingIds.map((id) => ctx.db.get(id)));
    const dwellingMap = new Map(dwellings.map((d, i) => [dwellingIds[i], d]));

    // Batch fetch all properties
    const propertyIds = [...new Set(dwellings.filter(Boolean).map((d) => d!.propertyId))];
    const properties = await Promise.all(propertyIds.map((id) => ctx.db.get(id)));
    const propertyMap = new Map(properties.map((p, i) => [propertyIds[i], p]));

    // Batch fetch all current plans
    const allPlans = await ctx.db
      .query("participantPlans")
      .withIndex("by_status", (q) => q.eq("planStatus", "current"))
      .collect();

    // Group plans by participant
    const plansByParticipant = new Map<string, typeof allPlans[0]>();
    for (const plan of allPlans) {
      plansByParticipant.set(plan.participantId, plan);
    }

    // Build result with pre-fetched data and decrypt sensitive fields
    const participantsWithDetails = await Promise.all(
      participants.map(async (participant) => {
        const dwelling = dwellingMap.get(participant.dwellingId);
        const property = dwelling ? propertyMap.get(dwelling.propertyId) : null;
        const currentPlan = plansByParticipant.get(participant._id);
        const decrypted = await decryptParticipantFields(participant);

        return {
          ...decrypted,
          dwelling,
          property,
          currentPlan,
        };
      })
    );

    return participantsWithDetails;
  },
});

// Get participant by ID with full details
export const getById = query({
  args: {
    participantId: v.id("participants"),
    userId: v.id("users"), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);

    const participant = await ctx.db.get(args.participantId);
    if (!participant) return null;

    // Verify record belongs to user's organization
    if (participant.organizationId !== organizationId) {
      throw new Error("Access denied: Participant belongs to different organization");
    }

    const decrypted = await decryptParticipantFields(participant);
    const dwelling = await ctx.db.get(participant.dwellingId);
    const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

    const plans = await ctx.db
      .query("participantPlans")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .collect();

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .collect();

    return {
      ...decrypted,
      dwelling,
      property,
      plans,
      payments,
    };
  },
});

// Update participant
export const update = mutation({
  args: {
    userId: v.id("users"), // Required for audit logging
    participantId: v.id("participants"),
    ndisNumber: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),
    dwellingId: v.optional(v.id("dwellings")),
    silProviderName: v.optional(v.string()),
    supportCoordinatorName: v.optional(v.string()),
    supportCoordinatorEmail: v.optional(v.string()),
    supportCoordinatorPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);
    // Verify user has permission
    const user = await requirePermission(ctx, args.userId, "participants", "update");

    const { participantId, userId, ...updates } = args;
    const participant = await ctx.db.get(participantId);
    if (!participant) throw new Error("Participant not found");

    // Verify record belongs to user's organization
    if (participant.organizationId !== organizationId) {
      throw new Error("Access denied: Participant belongs to different organization");
    }

    const oldDwellingId = participant.dwellingId;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // Encrypt sensitive fields if they are being updated
    if (filteredUpdates.ndisNumber !== undefined) {
      const plainNdis = filteredUpdates.ndisNumber as string;
      const newBlindIndex = await createBlindIndex(plainNdis);
      filteredUpdates.ndisNumber = await encryptField(plainNdis) ?? plainNdis;
      filteredUpdates.ndisNumberIndex = newBlindIndex ?? undefined;
    }
    if (filteredUpdates.dateOfBirth !== undefined) {
      const plain = filteredUpdates.dateOfBirth as string;
      filteredUpdates.dateOfBirth = await encryptField(plain) ?? plain;
    }
    if (filteredUpdates.emergencyContactName !== undefined) {
      const plain = filteredUpdates.emergencyContactName as string;
      filteredUpdates.emergencyContactName = await encryptField(plain) ?? plain;
    }
    if (filteredUpdates.emergencyContactPhone !== undefined) {
      const plain = filteredUpdates.emergencyContactPhone as string;
      filteredUpdates.emergencyContactPhone = await encryptField(plain) ?? plain;
    }
    if (filteredUpdates.emergencyContactRelation !== undefined) {
      const plain = filteredUpdates.emergencyContactRelation as string;
      filteredUpdates.emergencyContactRelation = await encryptField(plain) ?? plain;
    }

    await ctx.db.patch(participantId, filteredUpdates);

    // Update occupancy if dwelling changed
    if (updates.dwellingId && updates.dwellingId !== oldDwellingId) {
      await updateDwellingOccupancy(ctx, oldDwellingId);
      await updateDwellingOccupancy(ctx, updates.dwellingId);
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "participant",
      entityId: participantId,
      entityName: `${participant.firstName} ${participant.lastName}`,
      changes: JSON.stringify(filteredUpdates),
    });

    return { success: true };
  },
});

// Revert participant to pending move-in status (undo move-in)
export const revertToPending = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "participants", "update");

    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    // Verify record belongs to user's organization
    if (participant.organizationId !== organizationId) {
      throw new Error("Access denied: Participant belongs to different organization");
    }

    if (participant.status !== "active") {
      throw new Error("Can only revert active participants to pending");
    }

    // Just update status - keep moveInDate for reference (it will be overwritten on next move-in)
    await ctx.db.patch(args.participantId, {
      status: "pending_move_in",
      updatedAt: Date.now(),
    });

    // Update dwelling occupancy
    await updateDwellingOccupancy(ctx, participant.dwellingId);

    return { success: true };
  },
});

// Move participant in (change status from pending_move_in to active)
export const moveIn = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    moveInDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "participants", "update");

    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    // Verify record belongs to user's organization
    if (participant.organizationId !== organizationId) {
      throw new Error("Access denied: Participant belongs to different organization");
    }

    if (participant.status !== "pending_move_in") {
      throw new Error("Participant is not in pending move-in status");
    }

    await ctx.db.patch(args.participantId, {
      status: "active",
      moveInDate: args.moveInDate,
      updatedAt: Date.now(),
    });

    // Update dwelling occupancy
    await updateDwellingOccupancy(ctx, participant.dwellingId);

    return { success: true };
  },
});

// Move participant out
export const moveOut = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    moveOutDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "participants", "update");

    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    // Verify record belongs to user's organization
    if (participant.organizationId !== organizationId) {
      throw new Error("Access denied: Participant belongs to different organization");
    }

    await ctx.db.patch(args.participantId, {
      status: "moved_out",
      moveOutDate: args.moveOutDate,
      updatedAt: Date.now(),
    });

    // Update dwelling occupancy
    await updateDwellingOccupancy(ctx, participant.dwellingId);

    return { success: true };
  },
});

// Get participants by dwelling
export const getByDwelling = query({
  args: {
    dwellingId: v.id("dwellings"),
    userId: v.id("users"), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Get all participants and filter to organization + dwelling + active
    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const participants = allParticipants.filter(
      (p) => p.dwellingId === args.dwellingId && p.status === "active"
    );

    return Promise.all(participants.map(decryptParticipantFields));
  },
});

// Get participants with pagination
export const getAllPaginated = query({
  args: {
    userId: v.id("users"), // Required for tenant isolation
    ...paginationArgs,
    status: v.optional(v.string()),
    dwellingId: v.optional(v.id("dwellings")),
  },
  handler: async (ctx, args) => {
    // Get tenant context for multi-tenant isolation
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Build query based on filters - always scope to organizationId first
    let result;

    if (args.dwellingId) {
      // Filter by organization + dwelling
      let dwellingQuery = ctx.db
        .query("participants")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .filter((q) => q.eq(q.field("dwellingId"), args.dwellingId!));
      if (!args.status) {
        dwellingQuery = dwellingQuery.filter((q) => q.neq(q.field("status"), "moved_out"));
      }
      result = await dwellingQuery.paginate(args.paginationOpts);
    } else if (args.status) {
      // Filter by organization + status
      const statusQuery = ctx.db
        .query("participants")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .filter((q) => q.eq(q.field("status"), args.status as any));
      result = await statusQuery.paginate(args.paginationOpts);
    } else {
      // Default: organization + exclude moved_out
      const defaultQuery = ctx.db
        .query("participants")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .filter((q) => q.neq(q.field("status"), "moved_out"));
      result = await defaultQuery.paginate(args.paginationOpts);
    }

    // Enrich with dwelling, property, plan data and decrypt sensitive fields
    const enrichedPage = await Promise.all(
      result.page.map(async (participant) => {
        const decrypted = await decryptParticipantFields(participant);
        const dwelling = await ctx.db.get(participant.dwellingId);
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        const plans = await ctx.db
          .query("participantPlans")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .collect();
        const currentPlan = plans.find((p) => p.planStatus === "current");

        return {
          ...decrypted,
          dwelling,
          property,
          currentPlan,
        };
      })
    );

    return {
      ...result,
      page: enrichedPage,
    };
  },
});

// ============================================
// CONSENT MANAGEMENT MUTATIONS
// ============================================

// Record consent for a participant
export const recordConsent = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    consentDate: v.string(),
    consentDocumentId: v.optional(v.id("documents")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const user = await requirePermission(ctx, args.userId, "participants", "update");

    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    if (participant.organizationId !== organizationId) {
      throw new Error("Access denied: Participant belongs to different organization");
    }

    // Calculate expiry date (12 months from consent date)
    const consentDateObj = new Date(args.consentDate);
    const expiryDateObj = new Date(consentDateObj);
    expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 1);
    const consentExpiryDate = expiryDateObj.toISOString().split("T")[0];

    await ctx.db.patch(args.participantId, {
      consentStatus: "active",
      consentDate: args.consentDate,
      consentExpiryDate,
      consentDocumentId: args.consentDocumentId,
      consentRecordedBy: args.userId,
      consentNotes: args.notes,
      consentWithdrawnDate: undefined,
      consentWithdrawnBy: undefined,
      updatedAt: Date.now(),
    });

    // Resolve any existing consent alerts for this participant
    const activeAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_participant", (q) => q.eq("linkedParticipantId", args.participantId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const alert of activeAlerts) {
      if (alert.alertType === "consent_expiry" || alert.alertType === "consent_missing") {
        await ctx.db.patch(alert._id, {
          status: "resolved",
          resolvedBy: args.userId,
          resolvedAt: Date.now(),
        });
      }
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "participant",
      entityId: args.participantId,
      entityName: `${participant.firstName} ${participant.lastName}`,
      metadata: JSON.stringify({ consentAction: "recorded", consentDate: args.consentDate, consentExpiryDate }),
    });

    return { success: true, consentExpiryDate };
  },
});

// Withdraw consent for a participant (archives sensitive data)
export const withdrawConsent = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const user = await requirePermission(ctx, args.userId, "participants", "update");

    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    if (participant.organizationId !== organizationId) {
      throw new Error("Access denied: Participant belongs to different organization");
    }

    const today = new Date().toISOString().split("T")[0];
    const updateFields: Record<string, unknown> = {
      ndisNumber: undefined,
      ndisNumberIndex: undefined,
      dateOfBirth: undefined,
      emergencyContactName: undefined,
      emergencyContactPhone: undefined,
      emergencyContactRelation: undefined,
      notes: undefined,
      consentStatus: "withdrawn",
      consentWithdrawnDate: today,
      consentWithdrawnBy: args.userId,
      consentNotes: args.reason || "Consent withdrawn by participant",
      updatedAt: Date.now(),
    };

    if (participant.status === "active") {
      updateFields.status = "inactive";
      updateFields.moveOutDate = today;
    }

    await ctx.db.patch(args.participantId, updateFields);

    if (participant.status === "active") {
      await updateDwellingOccupancy(ctx, participant.dwellingId);
    }

    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "participant",
      entityId: args.participantId,
      entityName: `${participant.firstName} ${participant.lastName}`,
      metadata: JSON.stringify({ consentAction: "withdrawn", reason: args.reason, sensitiveDataArchived: true }),
    });

    return { success: true };
  },
});

// Renew consent for a participant
export const renewConsent = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    consentDate: v.string(),
    consentDocumentId: v.optional(v.id("documents")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const user = await requirePermission(ctx, args.userId, "participants", "update");

    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    if (participant.organizationId !== organizationId) {
      throw new Error("Access denied: Participant belongs to different organization");
    }

    const consentDateObj = new Date(args.consentDate);
    const expiryDateObj = new Date(consentDateObj);
    expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 1);
    const consentExpiryDate = expiryDateObj.toISOString().split("T")[0];

    await ctx.db.patch(args.participantId, {
      consentStatus: "active",
      consentDate: args.consentDate,
      consentExpiryDate,
      consentDocumentId: args.consentDocumentId,
      consentRecordedBy: args.userId,
      consentNotes: args.notes,
      consentWithdrawnDate: undefined,
      consentWithdrawnBy: undefined,
      updatedAt: Date.now(),
    });

    const activeAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_participant", (q) => q.eq("linkedParticipantId", args.participantId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const alert of activeAlerts) {
      if (alert.alertType === "consent_expiry" || alert.alertType === "consent_missing") {
        await ctx.db.patch(alert._id, {
          status: "resolved",
          resolvedBy: args.userId,
          resolvedAt: Date.now(),
        });
      }
    }

    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "participant",
      entityId: args.participantId,
      entityName: `${participant.firstName} ${participant.lastName}`,
      metadata: JSON.stringify({ consentAction: "renewed", consentDate: args.consentDate, consentExpiryDate }),
    });

    return { success: true, consentExpiryDate };
  },
});

// Get consent status summary for all participants (dashboard widget)
export const getConsentStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const activeParticipants = allParticipants.filter((p) => p.status !== "moved_out");

    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

    let active = 0;
    let expired = 0;
    let expiringSoon = 0;
    let missing = 0;

    for (const p of activeParticipants) {
      if (!p.consentStatus || p.consentStatus === "pending") {
        missing++;
      } else if (p.consentStatus === "active") {
        if (p.consentExpiryDate && p.consentExpiryDate < today) {
          expired++;
        } else if (p.consentExpiryDate && p.consentExpiryDate <= thirtyDaysStr) {
          expiringSoon++;
        } else {
          active++;
        }
      } else if (p.consentStatus === "expired") {
        expired++;
      }
    }

    return { active, expired, expiringSoon, missing, total: activeParticipants.length };
  },
});

// Internal raw query for migration (no decryption - returns data as-is)
export const getAllRaw = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("participants").collect();
  },
});
