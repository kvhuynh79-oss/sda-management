import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, getUserFullName, requireTenant } from "./authHelpers";
import { decryptField } from "./lib/encryption";

// ============================================================================
// Helper: Decrypt participant NDIS number safely
// ============================================================================
async function decryptNdisNumber(ndisNumber: string | undefined): Promise<string> {
  if (!ndisNumber) return "";
  const decrypted = await decryptField(ndisNumber);
  if (!decrypted || decrypted === "[encrypted]" || decrypted.startsWith("enc:")) {
    return ndisNumber.startsWith("enc:") ? "[encrypted]" : (ndisNumber || "");
  }
  return decrypted;
}

// ============================================================================
// Helper: Format today as ISO date string YYYY-MM-DD
// ============================================================================
function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ============================================================================
// Helper: Add days to an ISO date string
// ============================================================================
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// ============================================================================
// Helper: Calculate number of days between two ISO dates (inclusive of start)
// ============================================================================
function daysBetween(startStr: string, endStr: string): number {
  const start = new Date(startStr + "T00:00:00Z").getTime();
  const end = new Date(endStr + "T00:00:00Z").getTime();
  return Math.ceil((end - start) / 86400000);
}

// ============================================================================
// Queries
// ============================================================================

/**
 * getDashboard - Get all MTA claims for the org with summary stats.
 * Returns claims enriched with participant, dwelling, property details
 * plus a summary object with totals and status breakdowns.
 */
export const getDashboard = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allClaims = await ctx.db
      .query("mtaClaims")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const today = todayIso();

    // Enrich each claim with participant, dwelling, property details
    const claimsWithDetails = await Promise.all(
      allClaims.map(async (claim) => {
        const participant = await ctx.db.get(claim.participantId);
        let dwelling = null;
        let property = null;

        if (participant?.dwellingId) {
          dwelling = await ctx.db.get(participant.dwellingId);
          if (dwelling?.propertyId) {
            property = await ctx.db.get(dwelling.propertyId);
          }
        }

        const decryptedParticipant = participant
          ? {
              ...participant,
              ndisNumber: await decryptNdisNumber(participant.ndisNumber),
              dateOfBirth: await (async () => {
                if (!participant.dateOfBirth) return participant.dateOfBirth;
                const d = await decryptField(participant.dateOfBirth);
                return d && d !== "[encrypted]" && !d.startsWith("enc:") ? d : participant.dateOfBirth;
              })(),
            }
          : null;

        const plan = claim.planId ? await ctx.db.get(claim.planId) : null;

        return {
          ...claim,
          participant: decryptedParticipant,
          plan,
          dwelling,
          property,
        };
      })
    );

    // Sort by claimPeriodStart descending (most recent first)
    claimsWithDetails.sort((a, b) => b.claimPeriodStart.localeCompare(a.claimPeriodStart));

    // Calculate unique active agreements (today falls within agreement period)
    const activeAgreementKeys = new Set<string>();
    for (const claim of allClaims) {
      if (claim.mtaAgreementStart <= today && claim.mtaAgreementEnd >= today) {
        activeAgreementKeys.add(`${claim.participantId}_${claim.mtaAgreementStart}_${claim.mtaAgreementEnd}`);
      }
    }

    const summary = {
      totalClaims: allClaims.length,
      activeAgreements: activeAgreementKeys.size,
      totalAmount: allClaims.reduce((sum, c) => sum + c.claimAmount, 0),
      pending: allClaims.filter((c) => c.status === "pending").length,
      submitted: allClaims.filter((c) => c.status === "submitted").length,
      paid: allClaims.filter((c) => c.status === "paid").length,
      rejected: allClaims.filter((c) => c.status === "rejected").length,
      partial: allClaims.filter((c) => c.status === "partial").length,
      totalPaid: allClaims
        .filter((c) => c.status === "paid")
        .reduce((sum, c) => sum + (c.paidAmount || c.claimAmount), 0),
    };

    return {
      claims: claimsWithDetails,
      summary,
    };
  },
});

/**
 * getByOrganization - Get MTA claims for the org with optional status/participant filters.
 */
export const getByOrganization = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("submitted"),
        v.literal("paid"),
        v.literal("rejected"),
        v.literal("partial")
      )
    ),
    participantId: v.optional(v.id("participants")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    let claims;

    // Use most specific index available
    if (args.participantId) {
      const allForParticipant = await ctx.db
        .query("mtaClaims")
        .withIndex("by_participant", (q) => q.eq("participantId", args.participantId!))
        .collect();
      claims = allForParticipant.filter((c) => c.organizationId === organizationId);
    } else if (args.status) {
      const allForStatus = await ctx.db
        .query("mtaClaims")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
      claims = allForStatus.filter((c) => c.organizationId === organizationId);
    } else {
      claims = await ctx.db
        .query("mtaClaims")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect();
    }

    // Apply remaining filters in memory
    if (args.status && args.participantId) {
      claims = claims.filter((c) => c.status === args.status);
    }

    // Enrich with participant details
    const claimsWithDetails = await Promise.all(
      claims.map(async (claim) => {
        const participant = await ctx.db.get(claim.participantId);
        const decryptedParticipant = participant
          ? {
              ...participant,
              ndisNumber: await decryptNdisNumber(participant.ndisNumber),
              dateOfBirth: await (async () => {
                if (!participant.dateOfBirth) return participant.dateOfBirth;
                const d = await decryptField(participant.dateOfBirth);
                return d && d !== "[encrypted]" && !d.startsWith("enc:") ? d : participant.dateOfBirth;
              })(),
            }
          : null;

        return {
          ...claim,
          participant: decryptedParticipant,
        };
      })
    );

    // Sort by claimPeriodStart descending
    return claimsWithDetails.sort((a, b) => b.claimPeriodStart.localeCompare(a.claimPeriodStart));
  },
});

/**
 * getByParticipant - Get all MTA claims for a specific participant.
 * Verifies participant belongs to the user's organization.
 */
export const getByParticipant = query({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify participant belongs to this organization
    const participant = await ctx.db.get(args.participantId);
    if (!participant || participant.organizationId !== organizationId) {
      return [];
    }

    const claims = await ctx.db
      .query("mtaClaims")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .collect();

    // Filter by org (defense in depth)
    const orgClaims = claims.filter((c) => c.organizationId === organizationId);

    return orgClaims.sort((a, b) => b.claimPeriodStart.localeCompare(a.claimPeriodStart));
  },
});

/**
 * getById - Get a single MTA claim with full details (participant, plan, dwelling, property).
 * Used for invoice PDF generation and detail views.
 */
export const getById = query({
  args: {
    userId: v.id("users"),
    claimId: v.id("mtaClaims"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) {
      return null;
    }

    const participant = await ctx.db.get(claim.participantId);
    const plan = claim.planId ? await ctx.db.get(claim.planId) : null;

    let dwelling = null;
    let property = null;

    if (participant?.dwellingId) {
      dwelling = await ctx.db.get(participant.dwellingId);
      if (dwelling?.propertyId) {
        property = await ctx.db.get(dwelling.propertyId);
      }
    }

    const decryptedParticipant = participant
      ? {
          ...participant,
          ndisNumber: await decryptNdisNumber(participant.ndisNumber),
          dateOfBirth: await (async () => {
            if (!participant.dateOfBirth) return participant.dateOfBirth;
            const d = await decryptField(participant.dateOfBirth);
            return d && d !== "[encrypted]" && !d.startsWith("enc:") ? d : participant.dateOfBirth;
          })(),
        }
      : null;

    // Get provider settings for invoice details
    const providerSettings = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .first();

    // Get organization for branding
    const organization = organizationId ? await ctx.db.get(organizationId) : null;

    return {
      ...claim,
      participant: decryptedParticipant,
      plan,
      dwelling,
      property,
      providerSettings,
      organization,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * getNextInvoiceNumber - Generate the next sequential invoice number for this org.
 * Format: INV-0001
 * Uses invoiceCounters table for atomic incrementing.
 */
export const getNextInvoiceNumber = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = new Date();
    const yearMonth = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getFullYear()).slice(-2)}`;

    // Look up existing counter for this org + month
    const existing = await ctx.db
      .query("invoiceCounters")
      .withIndex("by_org_yearMonth", (q) =>
        q.eq("organizationId", organizationId).eq("yearMonth", yearMonth)
      )
      .first();

    let nextNumber: number;

    if (existing) {
      nextNumber = existing.lastNumber + 1;
      await ctx.db.patch(existing._id, {
        lastNumber: nextNumber,
        updatedAt: Date.now(),
      });
    } else {
      nextNumber = 1;
      await ctx.db.insert("invoiceCounters", {
        organizationId,
        yearMonth,
        lastNumber: nextNumber,
        updatedAt: Date.now(),
      });
    }

    return `INV-${String(nextNumber).padStart(4, "0")}`;
  },
});

/**
 * create - Create a single MTA claim.
 * Validates date ranges, checks for overlaps, calculates amounts,
 * auto-generates invoice number, and logs to audit trail.
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    planId: v.optional(v.id("participantPlans")),
    mtaAgreementStart: v.string(),
    mtaAgreementEnd: v.string(),
    claimPeriodStart: v.string(),
    claimPeriodEnd: v.string(),
    claimFrequency: v.union(
      v.literal("weekly"),
      v.literal("fortnightly"),
      v.literal("monthly")
    ),
    dailyRate: v.optional(v.number()),
    supportItemNumber: v.optional(v.string()),
    planManagerName: v.optional(v.string()),
    planManagerEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "payments", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    // Verify participant belongs to this organization
    const participant = await ctx.db.get(args.participantId);
    if (!participant || participant.organizationId !== organizationId) {
      throw new Error("Participant not found or does not belong to this organization");
    }

    // Validate: claim period must fall within agreement period
    if (args.claimPeriodStart < args.mtaAgreementStart) {
      throw new Error("Claim period start cannot be before agreement start date");
    }
    if (args.claimPeriodEnd > args.mtaAgreementEnd) {
      throw new Error("Claim period end cannot be after agreement end date");
    }
    if (args.claimPeriodStart > args.claimPeriodEnd) {
      throw new Error("Claim period start must be before or equal to claim period end");
    }

    // Validate: no overlapping claim periods for same participant + same agreement
    const existingClaims = await ctx.db
      .query("mtaClaims")
      .withIndex("by_participant_agreement", (q) =>
        q.eq("participantId", args.participantId).eq("mtaAgreementStart", args.mtaAgreementStart)
      )
      .collect();

    const orgClaims = existingClaims.filter((c) => c.organizationId === organizationId);

    for (const existing of orgClaims) {
      // Overlap check: two periods overlap if start1 < end2 AND start2 < end1
      if (args.claimPeriodStart < existing.claimPeriodEnd && existing.claimPeriodStart < args.claimPeriodEnd) {
        throw new Error(
          `Overlapping claim period exists: ${existing.claimPeriodStart} to ${existing.claimPeriodEnd} (Invoice ${existing.invoiceNumber})`
        );
      }
    }

    // Resolve daily rate: use provided value, fall back to providerSettings, then error
    let dailyRate = args.dailyRate;
    if (dailyRate === undefined || dailyRate === null) {
      const settings = await ctx.db
        .query("providerSettings")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .first();
      if (settings?.mtaDailyRate) {
        dailyRate = settings.mtaDailyRate;
      } else {
        throw new Error("Daily rate is required. Set it in Provider Settings or provide it in the form.");
      }
    }

    // Resolve support item number
    let supportItemNumber = args.supportItemNumber;
    if (!supportItemNumber) {
      const settings = await ctx.db
        .query("providerSettings")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .first();
      supportItemNumber = settings?.mtaSupportItemNumber || "01_082_0115_1_1";
    }

    // Calculate numberOfDays and claimAmount
    const numberOfDays = daysBetween(args.claimPeriodStart, args.claimPeriodEnd);
    if (numberOfDays <= 0) {
      throw new Error("Claim period must span at least 1 day");
    }
    const claimAmount = numberOfDays * dailyRate;

    // Idempotency check: prevent duplicate MTA claims for same period + participant + amount
    const idempotencyKey = `${organizationId}_${args.participantId}_${args.claimPeriodStart}_${args.claimPeriodEnd}_${claimAmount}`;
    const existingByKey = await ctx.db
      .query("mtaClaims")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();

    if (existingByKey) {
      // Duplicate prevented - return existing record instead of creating new one
      console.warn(`Idempotency: Duplicate MTA claim prevented for key ${idempotencyKey}, returning existing ID ${existingByKey._id}`);
      return existingByKey._id;
    }

    // Auto-generate invoice number
    const invoiceNumber = await generateInvoiceNumber(ctx, organizationId);

    // Set invoice date to today, due date to today + 30 days
    const today = todayIso();
    const dueDate = addDays(today, 30);

    const claimId = await ctx.db.insert("mtaClaims", {
      organizationId,
      participantId: args.participantId,
      planId: args.planId,
      mtaAgreementStart: args.mtaAgreementStart,
      mtaAgreementEnd: args.mtaAgreementEnd,
      claimPeriodStart: args.claimPeriodStart,
      claimPeriodEnd: args.claimPeriodEnd,
      claimFrequency: args.claimFrequency,
      dailyRate,
      numberOfDays,
      claimAmount,
      supportItemNumber,
      invoiceNumber,
      invoiceDate: today,
      dueDate,
      planManagerName: args.planManagerName,
      planManagerEmail: args.planManagerEmail,
      status: "pending",
      notes: args.notes,
      createdBy: args.userId,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "mta_claim",
      entityId: claimId,
      entityName: `${participant.firstName} ${participant.lastName} - MTA ${args.claimPeriodStart} to ${args.claimPeriodEnd}`,
    });

    return claimId;
  },
});

/**
 * bulkCreateForAgreement - Generate all claim period windows for an entire MTA agreement.
 * Splits the agreement period into windows based on frequency (weekly/fortnightly/monthly).
 * Skips windows where a claim already exists (idempotent).
 */
export const bulkCreateForAgreement = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    planId: v.optional(v.id("participantPlans")),
    mtaAgreementStart: v.string(),
    mtaAgreementEnd: v.string(),
    claimFrequency: v.union(
      v.literal("weekly"),
      v.literal("fortnightly"),
      v.literal("monthly")
    ),
    dailyRate: v.optional(v.number()),
    supportItemNumber: v.optional(v.string()),
    planManagerName: v.optional(v.string()),
    planManagerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "payments", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    // Verify participant belongs to this organization
    const participant = await ctx.db.get(args.participantId);
    if (!participant || participant.organizationId !== organizationId) {
      throw new Error("Participant not found or does not belong to this organization");
    }

    // Resolve daily rate
    let dailyRate = args.dailyRate;
    if (dailyRate === undefined || dailyRate === null) {
      const settings = await ctx.db
        .query("providerSettings")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .first();
      if (settings?.mtaDailyRate) {
        dailyRate = settings.mtaDailyRate;
      } else {
        throw new Error("Daily rate is required. Set it in Provider Settings or provide it in the form.");
      }
    }

    // Resolve support item number
    let supportItemNumber = args.supportItemNumber;
    if (!supportItemNumber) {
      const settings = await ctx.db
        .query("providerSettings")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .first();
      supportItemNumber = settings?.mtaSupportItemNumber || "01_082_0115_1_1";
    }

    // Generate claim period windows based on frequency
    const windows = generateClaimWindows(
      args.mtaAgreementStart,
      args.mtaAgreementEnd,
      args.claimFrequency
    );

    // Get existing claims for this participant + agreement to check for overlaps
    const existingClaims = await ctx.db
      .query("mtaClaims")
      .withIndex("by_participant_agreement", (q) =>
        q.eq("participantId", args.participantId).eq("mtaAgreementStart", args.mtaAgreementStart)
      )
      .collect();

    const orgExistingClaims = existingClaims.filter((c) => c.organizationId === organizationId);

    let created = 0;
    let skipped = 0;
    const claimIds: string[] = [];

    for (const window of windows) {
      // Check if a claim already exists that overlaps this window
      const hasOverlap = orgExistingClaims.some((existing) =>
        window.start < existing.claimPeriodEnd && existing.claimPeriodStart < window.end
      );

      if (hasOverlap) {
        skipped++;
        continue;
      }

      const numberOfDays = daysBetween(window.start, window.end);
      if (numberOfDays <= 0) {
        skipped++;
        continue;
      }

      const claimAmount = numberOfDays * dailyRate;
      const invoiceNumber = await generateInvoiceNumber(ctx, organizationId);
      const today = todayIso();
      const dueDate = addDays(today, 30);

      const claimId = await ctx.db.insert("mtaClaims", {
        organizationId,
        participantId: args.participantId,
        planId: args.planId,
        mtaAgreementStart: args.mtaAgreementStart,
        mtaAgreementEnd: args.mtaAgreementEnd,
        claimPeriodStart: window.start,
        claimPeriodEnd: window.end,
        claimFrequency: args.claimFrequency,
        dailyRate,
        numberOfDays,
        claimAmount,
        supportItemNumber,
        invoiceNumber,
        invoiceDate: today,
        dueDate,
        planManagerName: args.planManagerName,
        planManagerEmail: args.planManagerEmail,
        status: "pending",
        createdBy: args.userId,
        createdAt: now,
        updatedAt: now,
      });

      claimIds.push(claimId);
      created++;
    }

    // Audit log for bulk creation
    if (created > 0) {
      await ctx.runMutation(internal.auditLog.log, {
        userId: args.userId,
        userEmail: user.email,
        userName: getUserFullName(user),
        action: "create",
        entityType: "mta_claim",
        entityId: claimIds[0],
        entityName: `${participant.firstName} ${participant.lastName} - Bulk MTA ${args.mtaAgreementStart} to ${args.mtaAgreementEnd}`,
        metadata: JSON.stringify({
          mtaAgreementStart: args.mtaAgreementStart,
          mtaAgreementEnd: args.mtaAgreementEnd,
          claimFrequency: args.claimFrequency,
          created,
          skipped,
          claimIds,
        }),
      });
    }

    return { created, skipped, claimIds };
  },
});

/**
 * markSubmitted - Transition a pending MTA claim to submitted status.
 */
export const markSubmitted = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("mtaClaims"),
    claimDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "payments", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) {
      throw new Error("MTA claim not found");
    }

    const previousValues = {
      status: claim.status,
      claimDate: claim.claimDate,
      notes: claim.notes,
    };

    const claimDate = args.claimDate || todayIso();
    const updates: Record<string, unknown> = {
      status: "submitted",
      claimDate,
      updatedAt: Date.now(),
    };
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.claimId, updates);

    // Audit log
    const participant = await ctx.db.get(claim.participantId);
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "update",
      entityType: "mta_claim",
      entityId: args.claimId,
      entityName: `${participant?.firstName} ${participant?.lastName} - MTA ${claim.claimPeriodStart} to ${claim.claimPeriodEnd}`,
      changes: JSON.stringify(updates),
      previousValues: JSON.stringify(previousValues),
    });

    return { success: true };
  },
});

/**
 * markPaid - Transition a submitted MTA claim to paid status.
 */
export const markPaid = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("mtaClaims"),
    paidDate: v.optional(v.string()),
    paidAmount: v.number(),
    paymentReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "payments", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) {
      throw new Error("MTA claim not found");
    }

    const previousValues = {
      status: claim.status,
      paidDate: claim.paidDate,
      paidAmount: claim.paidAmount,
      paymentReference: claim.paymentReference,
      notes: claim.notes,
    };

    const updates: Record<string, unknown> = {
      status: "paid",
      paidDate: args.paidDate || todayIso(),
      paidAmount: args.paidAmount,
      updatedAt: Date.now(),
    };
    if (args.paymentReference !== undefined) {
      updates.paymentReference = args.paymentReference;
    }
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.claimId, updates);

    // Audit log
    const participant = await ctx.db.get(claim.participantId);
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "update",
      entityType: "mta_claim",
      entityId: args.claimId,
      entityName: `${participant?.firstName} ${participant?.lastName} - MTA ${claim.claimPeriodStart} to ${claim.claimPeriodEnd}`,
      changes: JSON.stringify(updates),
      previousValues: JSON.stringify(previousValues),
    });

    return { success: true };
  },
});

/**
 * markRejected - Transition an MTA claim to rejected status with optional reason.
 */
export const markRejected = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("mtaClaims"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "payments", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) {
      throw new Error("MTA claim not found");
    }

    const previousValues = {
      status: claim.status,
      notes: claim.notes,
    };

    const updates: Record<string, unknown> = {
      status: "rejected",
      updatedAt: Date.now(),
    };
    if (args.reason) {
      updates.notes = args.reason;
    }

    await ctx.db.patch(args.claimId, updates);

    // Audit log
    const participant = await ctx.db.get(claim.participantId);
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "update",
      entityType: "mta_claim",
      entityId: args.claimId,
      entityName: `${participant?.firstName} ${participant?.lastName} - MTA ${claim.claimPeriodStart} to ${claim.claimPeriodEnd}`,
      changes: JSON.stringify(updates),
      previousValues: JSON.stringify(previousValues),
    });

    return { success: true };
  },
});

/**
 * revertToPending - Reset an MTA claim back to pending, clearing payment fields.
 */
export const revertToPending = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("mtaClaims"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "payments", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) {
      throw new Error("MTA claim not found");
    }

    const previousValues = {
      status: claim.status,
      claimDate: claim.claimDate,
      paidDate: claim.paidDate,
      paidAmount: claim.paidAmount,
      paymentReference: claim.paymentReference,
    };

    await ctx.db.patch(args.claimId, {
      status: "pending",
      claimDate: undefined,
      paidDate: undefined,
      paidAmount: undefined,
      paymentReference: undefined,
      updatedAt: Date.now(),
    });

    // Audit log
    const participant = await ctx.db.get(claim.participantId);
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "update",
      entityType: "mta_claim",
      entityId: args.claimId,
      entityName: `${participant?.firstName} ${participant?.lastName} - MTA ${claim.claimPeriodStart} to ${claim.claimPeriodEnd}`,
      changes: JSON.stringify({ status: "pending" }),
      previousValues: JSON.stringify(previousValues),
    });

    return { success: true };
  },
});

/**
 * remove - Delete an MTA claim (admin only).
 */
export const remove = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("mtaClaims"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "payments", "delete");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) {
      throw new Error("MTA claim not found");
    }

    // Audit log before deletion
    const participant = await ctx.db.get(claim.participantId);
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "delete",
      entityType: "mta_claim",
      entityId: args.claimId,
      entityName: `${participant?.firstName} ${participant?.lastName} - MTA ${claim.claimPeriodStart} to ${claim.claimPeriodEnd}`,
      previousValues: JSON.stringify({
        invoiceNumber: claim.invoiceNumber,
        claimAmount: claim.claimAmount,
        status: claim.status,
        claimPeriodStart: claim.claimPeriodStart,
        claimPeriodEnd: claim.claimPeriodEnd,
      }),
    });

    await ctx.db.delete(args.claimId);

    return { success: true };
  },
});

/**
 * update - Update mutable fields on an MTA claim (e.g. plan manager, daily rate recalculation).
 */
export const update = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("mtaClaims"),
    dailyRate: v.optional(v.number()),
    planManagerName: v.optional(v.string()),
    planManagerEmail: v.optional(v.string()),
    invoiceDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "payments", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) {
      throw new Error("MTA claim not found");
    }

    const previousValues: Record<string, unknown> = {};
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    // Build patch, tracking previous values for audit
    if (args.dailyRate !== undefined) {
      previousValues.dailyRate = claim.dailyRate;
      previousValues.claimAmount = claim.claimAmount;
      updates.dailyRate = args.dailyRate;
      updates.claimAmount = claim.numberOfDays * args.dailyRate;
    }
    if (args.planManagerName !== undefined) {
      previousValues.planManagerName = claim.planManagerName;
      updates.planManagerName = args.planManagerName;
    }
    if (args.planManagerEmail !== undefined) {
      previousValues.planManagerEmail = claim.planManagerEmail;
      updates.planManagerEmail = args.planManagerEmail;
    }
    if (args.invoiceDate !== undefined) {
      previousValues.invoiceDate = claim.invoiceDate;
      updates.invoiceDate = args.invoiceDate;
    }
    if (args.dueDate !== undefined) {
      previousValues.dueDate = claim.dueDate;
      updates.dueDate = args.dueDate;
    }
    if (args.notes !== undefined) {
      previousValues.notes = claim.notes;
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.claimId, updates);

    // Audit log if meaningful changes made
    if (Object.keys(updates).length > 1) {
      const participant = await ctx.db.get(claim.participantId);
      await ctx.runMutation(internal.auditLog.log, {
        userId: args.userId,
        userEmail: user.email,
        userName: getUserFullName(user),
        action: "update",
        entityType: "mta_claim",
        entityId: args.claimId,
        entityName: `${participant?.firstName} ${participant?.lastName} - MTA ${claim.claimPeriodStart} to ${claim.claimPeriodEnd}`,
        changes: JSON.stringify(updates),
        previousValues: JSON.stringify(previousValues),
      });
    }

    return { success: true };
  },
});

// ============================================================================
// Internal helpers (not exported as Convex functions)
// ============================================================================

/**
 * Generate the next sequential invoice number for an organization.
 * Operates within the mutation context for atomicity.
 */
async function generateInvoiceNumber(
  ctx: { db: any; runMutation: any },
  organizationId: any
): Promise<string> {
  const now = new Date();
  const yearMonth = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getFullYear()).slice(-2)}`;

  const existing = await ctx.db
    .query("invoiceCounters")
    .withIndex("by_org_yearMonth", (q: any) =>
      q.eq("organizationId", organizationId).eq("yearMonth", yearMonth)
    )
    .first();

  let nextNumber: number;

  if (existing) {
    nextNumber = existing.lastNumber + 1;
    await ctx.db.patch(existing._id, {
      lastNumber: nextNumber,
      updatedAt: Date.now(),
    });
  } else {
    nextNumber = 1;
    await ctx.db.insert("invoiceCounters", {
      organizationId,
      yearMonth,
      lastNumber: nextNumber,
      updatedAt: Date.now(),
    });
  }

  return `INV-${yearMonth}-${String(nextNumber).padStart(4, "0")}`;
}

/**
 * Generate claim period windows for an MTA agreement based on frequency.
 *
 * - weekly: 7-day windows
 * - fortnightly: 14-day windows
 * - monthly: calendar month boundaries
 *
 * The last window is truncated to the agreement end date.
 */
function generateClaimWindows(
  agreementStart: string,
  agreementEnd: string,
  frequency: "weekly" | "fortnightly" | "monthly"
): Array<{ start: string; end: string }> {
  const windows: Array<{ start: string; end: string }> = [];

  if (frequency === "monthly") {
    // Monthly: rolling periods from agreement start date
    // e.g. Feb 19 -> Mar 19 -> Apr 19 -> May 19
    let currentStart = agreementStart;

    while (currentStart < agreementEnd) {
      const startDate = new Date(currentStart + "T00:00:00Z");
      // Add 1 month to the start date (same day of month)
      const nextPeriod = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth() + 1,
        startDate.getUTCDate()
      ));
      let windowEnd = nextPeriod.toISOString().split("T")[0];

      // Truncate to agreement end if this window extends past it
      if (windowEnd > agreementEnd) {
        windowEnd = agreementEnd;
      }

      if (currentStart < windowEnd) {
        windows.push({ start: currentStart, end: windowEnd });
      }

      currentStart = windowEnd;
    }
  } else {
    // Weekly (7 days) or fortnightly (14 days)
    const intervalDays = frequency === "weekly" ? 7 : 14;
    let currentStart = agreementStart;

    while (currentStart < agreementEnd) {
      let windowEnd = addDays(currentStart, intervalDays);

      // Truncate to agreement end if this window extends past it
      if (windowEnd > agreementEnd) {
        windowEnd = agreementEnd;
      }

      if (currentStart < windowEnd) {
        windows.push({ start: currentStart, end: windowEnd });
      }

      currentStart = windowEnd;
    }
  }

  return windows;
}
