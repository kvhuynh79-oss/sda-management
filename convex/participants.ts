import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth, requireTenant, requireActiveSubscription } from "./authHelpers";
import { paginationArgs } from "./paginationHelpers";
import {
  validateRequiredString,
  validateNdisNumber,
  validateOptionalEmail,
  validateOptionalPhone,
  validateOptionalDate,
} from "./validationHelpers";
import { encryptField, decryptField, createBlindIndex, isEncrypted } from "./lib/encryption";
import { createAlertIfNotExists } from "./alertHelpers";

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
    // B5 FIX: Require active subscription for write operations
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await requireActiveSubscription(ctx, organizationId, auditUser);

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

    // Trigger webhook
    await ctx.scheduler.runAfter(0, internal.webhooks.triggerWebhook, {
      organizationId,
      event: "participant.created",
      payload: JSON.stringify({ participantId, firstName: args.firstName, lastName: args.lastName }),
    });

    return participantId;
  },
});

// Create an incomplete participant (minimal data, no dwelling required)
export const createIncomplete = mutation({
  args: {
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    ndisNumber: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),
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

    // Validate required fields
    const validatedFirstName = validateRequiredString(args.firstName, "first name");
    const validatedLastName = validateRequiredString(args.lastName, "last name");

    // Optional field validation
    const validatedEmail = validateOptionalEmail(args.email);
    const validatedPhone = validateOptionalPhone(args.phone);

    // Encrypt sensitive fields
    let encNdisNumber: string | null = null;
    let ndisBlindIndex: string | null = null;
    let encDateOfBirth: string | null = null;
    let encEmergencyName: string | null = null;
    let encEmergencyPhone: string | null = null;

    // If NDIS number provided, validate format and check duplicates
    if (args.ndisNumber && args.ndisNumber.trim()) {
      const validatedNdis = validateNdisNumber(args.ndisNumber);

      ndisBlindIndex = await createBlindIndex(validatedNdis);

      // Check for duplicate NDIS number via blind index
      if (ndisBlindIndex) {
        const existingByIndex = await ctx.db
          .query("participants")
          .withIndex("by_ndisNumberIndex", (q) => q.eq("ndisNumberIndex", ndisBlindIndex!))
          .first();
        if (existingByIndex) {
          throw new Error("A participant with this NDIS number already exists");
        }
      }
      // Fallback: also check legacy plaintext index
      const existingPlaintext = await ctx.db
        .query("participants")
        .withIndex("by_ndisNumber", (q) => q.eq("ndisNumber", validatedNdis))
        .first();
      if (existingPlaintext) {
        throw new Error("A participant with this NDIS number already exists");
      }

      encNdisNumber = await encryptField(validatedNdis) ?? validatedNdis;
    }

    // Encrypt optional sensitive fields
    [encDateOfBirth, encEmergencyName, encEmergencyPhone] = await Promise.all([
      encryptField(args.dateOfBirth),
      encryptField(args.emergencyContactName),
      encryptField(args.emergencyContactPhone),
    ]);

    const now = Date.now();
    const participantId = await ctx.db.insert("participants", {
      organizationId,
      ndisNumber: encNdisNumber || "",
      ndisNumberIndex: ndisBlindIndex ?? undefined,
      firstName: validatedFirstName,
      lastName: validatedLastName,
      dateOfBirth: encDateOfBirth ?? args.dateOfBirth,
      email: validatedEmail,
      phone: validatedPhone,
      emergencyContactName: encEmergencyName ?? args.emergencyContactName,
      emergencyContactPhone: encEmergencyPhone ?? args.emergencyContactPhone,
      emergencyContactRelation: args.emergencyContactRelation,
      // No dwellingId - incomplete participants do not have a dwelling assigned yet
      status: "incomplete",
      silProviderName: args.silProviderName,
      supportCoordinatorName: args.supportCoordinatorName,
      supportCoordinatorEmail: args.supportCoordinatorEmail,
      supportCoordinatorPhone: args.supportCoordinatorPhone,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Create profile_incomplete alert
    const todayStr = new Date().toISOString().split("T")[0];
    await createAlertIfNotExists(ctx, {
      alertType: "profile_incomplete",
      severity: "warning",
      title: `Incomplete profile: ${validatedFirstName} ${validatedLastName}`,
      message: `Participant ${validatedFirstName} ${validatedLastName} has an incomplete profile. Missing: ${!encNdisNumber ? "NDIS number, " : ""}dwelling assignment.`,
      organizationId,
      linkedParticipantId: participantId,
      triggerDate: todayStr,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "participant",
      entityId: participantId,
      entityName: `${validatedFirstName} ${validatedLastName}`,
      metadata: JSON.stringify({ status: "incomplete", hasNdisNumber: !!encNdisNumber }),
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
    includeArchived: v.optional(v.boolean()),
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
    let participants = allParticipants.filter((p) => {
      if (p.status === "moved_out") return false;
      if (p.status === "archived" && !args.includeArchived) return false;
      return true;
    });

    // Role-based filtering for SIL provider users
    if (requestingUser.role === "sil_provider" && requestingUser.silProviderId) {
      // Get all dwelling IDs this SIL provider has access to
      const silProviderDwellings = await ctx.db
        .query("silProviderDwellings")
        .withIndex("by_provider", (q) => q.eq("silProviderId", requestingUser.silProviderId!))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      const allowedDwellingIds = new Set(silProviderDwellings.map((spd) => spd.dwellingId));

      // Filter participants to only those in allowed dwellings (incomplete participants without dwelling are excluded)
      participants = participants.filter((p) => p.dwellingId && allowedDwellingIds.has(p.dwellingId));
    }
    // Admin, property_manager, staff, accountant see all participants (no filtering)

    // Batch fetch all dwellings (filter out undefined dwellingIds for incomplete participants)
    const dwellingIds = [...new Set(participants.map((p) => p.dwellingId).filter((id): id is NonNullable<typeof id> => !!id))];
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
        const dwelling = participant.dwellingId ? dwellingMap.get(participant.dwellingId) : null;
        const property = dwelling ? propertyMap.get(dwelling.propertyId) : null;
        const currentPlan = plansByParticipant.get(participant._id);
        const decrypted = await decryptParticipantFields(participant);

        return {
          ...decrypted,
          dwelling: dwelling ?? null,
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
    const dwelling = participant.dwellingId ? await ctx.db.get(participant.dwellingId) : null;
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
    expectedUpdatedAt: v.optional(v.number()), // Optimistic concurrency check
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

    const { participantId, userId, expectedUpdatedAt, ...updates } = args;
    const participant = await ctx.db.get(participantId);
    if (!participant) throw new Error("Participant not found");

    // Verify record belongs to user's organization
    if (participant.organizationId !== organizationId) {
      throw new Error("Access denied: Participant belongs to different organization");
    }

    // Optimistic concurrency check
    if (expectedUpdatedAt !== undefined && participant.updatedAt !== expectedUpdatedAt) {
      throw new Error("CONFLICT: This record was modified by another user. Please refresh and try again.");
    }

    const oldDwellingId = participant.dwellingId;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // Validate and encrypt sensitive fields if they are being updated
    if (filteredUpdates.ndisNumber !== undefined) {
      const plainNdis = validateNdisNumber(filteredUpdates.ndisNumber as string);
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
      if (oldDwellingId) {
        await updateDwellingOccupancy(ctx, oldDwellingId);
      }
      await updateDwellingOccupancy(ctx, updates.dwellingId);
    }

    // Auto-transition: incomplete -> pending_move_in when profile is now complete
    if (participant.status === "incomplete") {
      const updated = await ctx.db.get(participantId);
      if (updated) {
        // Check if ndisNumber is present and non-empty (may be encrypted)
        const hasNdisNumber = updated.ndisNumber && updated.ndisNumber.trim() !== "";
        const hasDwelling = !!updated.dwellingId;

        if (hasNdisNumber && hasDwelling) {
          await ctx.db.patch(participantId, {
            status: "pending_move_in",
            updatedAt: Date.now(),
          });

          // Resolve any active profile_incomplete alerts for this participant
          const activeAlerts = await ctx.db
            .query("alerts")
            .withIndex("by_participant", (q) => q.eq("linkedParticipantId", participantId))
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();

          for (const alert of activeAlerts) {
            if (alert.alertType === "profile_incomplete") {
              await ctx.db.patch(alert._id, {
                status: "resolved",
                resolvedAt: Date.now(),
              });
            }
          }
        }
      }
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

    // Trigger webhook
    await ctx.scheduler.runAfter(0, internal.webhooks.triggerWebhook, {
      organizationId,
      event: "participant.updated",
      payload: JSON.stringify({ participantId: args.participantId }),
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

    // Update dwelling occupancy (guard for incomplete participants without dwelling)
    if (participant.dwellingId) {
      await updateDwellingOccupancy(ctx, participant.dwellingId);
    }

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

    // Update dwelling occupancy (guard for incomplete participants without dwelling)
    if (participant.dwellingId) {
      await updateDwellingOccupancy(ctx, participant.dwellingId);
    }

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

    // Update dwelling occupancy (guard for incomplete participants without dwelling)
    if (participant.dwellingId) {
      await updateDwellingOccupancy(ctx, participant.dwellingId);
    }

    return { success: true };
  },
});

// Archive a participant (soft delete - sets status to "archived")
export const archive = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "participants", "delete");

    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    if (participant.organizationId !== organizationId) {
      throw new Error("Access denied: Participant belongs to different organization");
    }

    await ctx.db.patch(args.participantId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Update dwelling occupancy if participant had a dwelling
    if (participant.dwellingId) {
      await updateDwellingOccupancy(ctx, participant.dwellingId);
    }

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
        const dwelling = participant.dwellingId ? await ctx.db.get(participant.dwellingId) : null;
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

// Withdraw consent for a participant (archives sensitive data per APP-3)
// Enhanced: copies ALL personal/encrypted fields to participantArchives before clearing
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

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Step 1: Archive ALL personal/sensitive data before clearing
    const personalData = {
      ndisNumber: participant.ndisNumber,
      ndisNumberIndex: participant.ndisNumberIndex,
      dateOfBirth: participant.dateOfBirth,
      email: participant.email,
      phone: participant.phone,
      emergencyContactName: participant.emergencyContactName,
      emergencyContactPhone: participant.emergencyContactPhone,
      emergencyContactRelation: participant.emergencyContactRelation,
      notes: participant.notes,
      supportCoordinatorName: participant.supportCoordinatorName,
      supportCoordinatorEmail: participant.supportCoordinatorEmail,
      supportCoordinatorPhone: participant.supportCoordinatorPhone,
      silProviderName: participant.silProviderName,
      firstName: participant.firstName,
      lastName: participant.lastName,
      consentDate: participant.consentDate,
      consentExpiryDate: participant.consentExpiryDate,
      consentNotes: participant.consentNotes,
    };

    // Encrypt the entire archive blob for at-rest protection
    const archiveJson = JSON.stringify(personalData);
    const encryptedArchive = await encryptField(archiveJson);

    // Calculate 7-year retention expiry (NDIS record-keeping requirement)
    const retentionExpiry = new Date(now);
    retentionExpiry.setFullYear(retentionExpiry.getFullYear() + 7);
    const retentionExpiresAt = retentionExpiry.toISOString().split("T")[0];

    // Insert into participantArchives
    await ctx.db.insert("participantArchives", {
      organizationId,
      originalParticipantId: args.participantId,
      encryptedData: encryptedArchive ?? archiveJson,
      archivedAt: now.toISOString(),
      archivedBy: args.userId,
      withdrawalReason: args.reason,
      retentionExpiresAt,
      status: "archived",
    });

    // Step 2: Pseudonymise the active participant record
    const updateFields: Record<string, unknown> = {
      firstName: "[Consent Withdrawn]",
      lastName: "[Consent Withdrawn]",
      ndisNumber: "[Consent Withdrawn]",
      ndisNumberIndex: undefined,
      dateOfBirth: undefined,
      email: undefined,
      phone: undefined,
      emergencyContactName: undefined,
      emergencyContactPhone: undefined,
      emergencyContactRelation: undefined,
      notes: undefined,
      supportCoordinatorName: undefined,
      supportCoordinatorEmail: undefined,
      supportCoordinatorPhone: undefined,
      silProviderName: undefined,
      consentStatus: "withdrawn" as const,
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

    if (participant.status === "active" && participant.dwellingId) {
      await updateDwellingOccupancy(ctx, participant.dwellingId);
    }

    // Step 3: Audit log with consent_withdrawal details
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "participant",
      entityId: args.participantId,
      entityName: `${participant.firstName} ${participant.lastName}`,
      metadata: JSON.stringify({
        consentAction: "consent_withdrawal",
        reason: args.reason,
        sensitiveDataArchived: true,
        archiveRetentionExpiry: retentionExpiresAt,
        fieldsArchived: Object.keys(personalData),
      }),
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

// Get archived participant data (super-admin only - for compliance/legal purposes)
export const getArchivedParticipant = query({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Only super-admins or org admins can access archived data
    if (!user.isSuperAdmin && user.role !== "admin") {
      throw new Error("Access denied: Only admins can access archived participant data");
    }

    const archives = await ctx.db
      .query("participantArchives")
      .withIndex("by_originalParticipant", (q) => q.eq("originalParticipantId", args.participantId))
      .collect();

    // Filter to this organization
    const orgArchives = archives.filter(a => a.organizationId === organizationId);
    if (orgArchives.length === 0) return null;

    // Return the most recent archive
    const latest = orgArchives.sort((a, b) => b.archivedAt.localeCompare(a.archivedAt))[0];

    // Decrypt the archived data blob
    const decryptedData = await decryptField(latest.encryptedData);
    let parsedData = null;
    try {
      parsedData = JSON.parse(decryptedData ?? latest.encryptedData);
    } catch {
      // If decryption or parsing fails, return as-is
      parsedData = { raw: latest.encryptedData };
    }

    return {
      ...latest,
      decryptedData: parsedData,
    };
  },
});

// Cleanup expired archives past 7-year retention period (NDIS compliance)
// Run daily via cron to permanently delete archives that have exceeded retention
export const cleanupExpiredArchives = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    const allArchives = await ctx.db
      .query("participantArchives")
      .withIndex("by_retentionExpiry")
      .collect();

    let deleted = 0;
    for (const archive of allArchives) {
      if (archive.status === "archived" && archive.retentionExpiresAt <= today) {
        // Mark as expired first, then delete on next cycle (safety net)
        if (archive.status === "archived") {
          await ctx.db.patch(archive._id, { status: "expired" });
          deleted++;
        }
      } else if (archive.status === "expired") {
        // Archives marked expired in previous cycle - now permanently delete
        await ctx.db.delete(archive._id);
        deleted++;
      }
    }

    return { processed: deleted };
  },
});
