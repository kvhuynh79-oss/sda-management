import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, getUserFullName, requireTenant } from "./authHelpers";
import { decryptField } from "./lib/encryption";

// Get all claims for a specific period (month)
export const getByPeriod = query({
  args: {
    userId: v.id("users"),
    claimPeriod: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allClaims = await ctx.db
      .query("claims")
      .withIndex("by_period", (q) => q.eq("claimPeriod", args.claimPeriod))
      .collect();

    // Filter by organization
    const claims = allClaims.filter((c) => c.organizationId === organizationId);

    const claimsWithDetails = await Promise.all(
      claims.map(async (claim) => {
        const participant = await ctx.db.get(claim.participantId);
        const plan = await ctx.db.get(claim.planId);
        let dwelling = null;
        let property = null;

        if (participant?.dwellingId) {
          dwelling = await ctx.db.get(participant.dwellingId);
          if (dwelling?.propertyId) {
            property = await ctx.db.get(dwelling.propertyId);
          }
        }

        // Decrypt NDIS number for display and CSV export
        const decryptedParticipant = participant
          ? {
              ...participant,
              ndisNumber: (await decryptField(participant.ndisNumber)) ?? participant.ndisNumber,
            }
          : participant;

        return {
          ...claim,
          participant: decryptedParticipant,
          plan,
          dwelling,
          property,
        };
      })
    );

    return claimsWithDetails.sort((a, b) => {
      const dayA = a.plan?.claimDay || 31;
      const dayB = b.plan?.claimDay || 31;
      return dayA - dayB;
    });
  },
});

// Get claims dashboard data - upcoming claims for current month
export const getDashboard = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentDay = now.getDate();

    // Get all active participants for this organization
    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const participants = allParticipants.filter((p) => p.status === "active");

    const dashboardData = await Promise.all(
      participants.map(async (participant) => {
        // Get current plan
        const plans = await ctx.db
          .query("participantPlans")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .collect();

        const currentPlan = plans.find((p) => p.planStatus === "current");
        if (!currentPlan) return null;

        // Get dwelling and property (guard for incomplete participants)
        const dwelling = participant.dwellingId ? await ctx.db.get(participant.dwellingId) : null;
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        // Check if claim exists for this period
        const existingClaim = await ctx.db
          .query("claims")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .filter((q) => q.eq(q.field("claimPeriod"), currentPeriod))
          .first();

        const claimDay = currentPlan.claimDay || 1;
        const isOverdue = !existingClaim && currentDay > claimDay;
        const isDueToday = !existingClaim && currentDay === claimDay;
        const isUpcoming = !existingClaim && currentDay < claimDay;

        // Decrypt NDIS number for display and CSV export
        const decryptedParticipant = {
          ...participant,
          ndisNumber: (await decryptField(participant.ndisNumber)) ?? participant.ndisNumber,
        };

        return {
          participant: decryptedParticipant,
          plan: currentPlan,
          dwelling,
          property,
          existingClaim,
          claimDay,
          claimMethod: currentPlan.claimMethod || "agency_managed",
          expectedAmount: currentPlan.monthlySdaAmount || currentPlan.annualSdaBudget / 12,
          isOverdue,
          isDueToday,
          isUpcoming,
          status: existingClaim?.status || "pending",
        };
      })
    );

    // Filter out nulls and sort by claim day
    const validData = dashboardData.filter((d) => d !== null);

    return {
      currentPeriod,
      currentDay,
      claims: validData.sort((a, b) => a.claimDay - b.claimDay),
      summary: {
        total: validData.length,
        pending: validData.filter((d) => d.status === "pending").length,
        submitted: validData.filter((d) => d.status === "submitted").length,
        paid: validData.filter((d) => d.status === "paid").length,
        overdue: validData.filter((d) => d.isOverdue).length,
        dueToday: validData.filter((d) => d.isDueToday).length,
        totalExpected: validData.reduce((sum, d) => sum + (d.expectedAmount || 0), 0),
      },
    };
  },
});

// Get claim history for a participant
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
      .query("claims")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .collect();

    return claims.sort((a, b) => b.claimPeriod.localeCompare(a.claimPeriod));
  },
});

// Create a new claim
export const create = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    planId: v.id("participantPlans"),
    claimPeriod: v.string(),
    claimMethod: v.union(
      v.literal("agency_managed"),
      v.literal("pace"),
      v.literal("plan_managed")
    ),
    expectedAmount: v.number(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("submitted"),
        v.literal("paid")
      )
    ),
    claimDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check - payments permission required
    const user = await requirePermission(ctx, args.userId, "payments", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    // Verify participant belongs to this organization
    const participantRecord = await ctx.db.get(args.participantId);
    if (!participantRecord || participantRecord.organizationId !== organizationId) {
      throw new Error("Participant not found or does not belong to this organization");
    }

    // Check if claim already exists for this participant and period
    const existing = await ctx.db
      .query("claims")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .filter((q) => q.eq(q.field("claimPeriod"), args.claimPeriod))
      .first();

    if (existing) {
      throw new Error("Claim already exists for this period");
    }

    const claimId = await ctx.db.insert("claims", {
      organizationId,
      participantId: args.participantId,
      planId: args.planId,
      claimPeriod: args.claimPeriod,
      claimMethod: args.claimMethod,
      expectedAmount: args.expectedAmount,
      status: args.status || "pending",
      claimDate: args.claimDate,
      notes: args.notes,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    const participant = await ctx.db.get(args.participantId);
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "claim",
      entityId: claimId,
      entityName: `${participant?.firstName} ${participant?.lastName} - ${args.claimPeriod}`,
    });

    return claimId;
  },
});

// Update claim status (mark as submitted, paid, etc.)
export const updateStatus = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("claims"),
    status: v.union(
      v.literal("pending"),
      v.literal("submitted"),
      v.literal("paid"),
      v.literal("rejected"),
      v.literal("partial")
    ),
    claimDate: v.optional(v.string()),
    claimedAmount: v.optional(v.number()),
    paidDate: v.optional(v.string()),
    paidAmount: v.optional(v.number()),
    paymentReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    const user = await requirePermission(ctx, args.userId, "payments", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { claimId, userId, ...updates } = args;

    // Get current claim for audit logging (BEFORE update)
    const claim = await ctx.db.get(claimId);
    if (!claim) {
      throw new Error("Claim not found");
    }
    // Verify org ownership
    if (claim.organizationId !== organizationId) {
      throw new Error("Claim not found");
    }

    // Capture previous values for audit trail
    const previousValues: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if ((updates as Record<string, unknown>)[key] !== undefined) {
        previousValues[key] = (claim as Record<string, unknown>)[key];
      }
    }

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(claimId, filteredUpdates);

    // Audit log: Claim status updated (only if there are actual changes)
    if (Object.keys(filteredUpdates).length > 1) { // More than just updatedAt
      const participant = await ctx.db.get(claim.participantId);
      await ctx.runMutation(internal.auditLog.log, {
        userId: user._id,
        userEmail: user.email,
        userName: getUserFullName(user),
        action: "update",
        entityType: "claim",
        entityId: claimId,
        entityName: `${participant?.firstName} ${participant?.lastName} - ${claim.claimPeriod}`,
        changes: JSON.stringify(filteredUpdates),
        previousValues: JSON.stringify(previousValues),
      });
    }

    return { success: true };
  },
});

// Bulk create claims for a period (for all eligible participants)
export const bulkCreateForPeriod = mutation({
  args: {
    userId: v.id("users"),
    claimPeriod: v.string(),
  },
  handler: async (ctx, args) => {
    // Permission check
    const user = await requirePermission(ctx, args.userId, "payments", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    // Get all active participants for this organization
    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const participants = allParticipants.filter((p) => p.status === "active");

    let created = 0;
    let skipped = 0;
    const createdClaimIds: string[] = [];

    for (const participant of participants) {
      // Get current plan
      const plans = await ctx.db
        .query("participantPlans")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .collect();

      const currentPlan = plans.find((p) => p.planStatus === "current");
      if (!currentPlan) {
        skipped++;
        continue;
      }

      // Check if claim already exists
      const existing = await ctx.db
        .query("claims")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) => q.eq(q.field("claimPeriod"), args.claimPeriod))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Create claim
      const claimId = await ctx.db.insert("claims", {
        organizationId,
        participantId: participant._id,
        planId: currentPlan._id,
        claimPeriod: args.claimPeriod,
        claimMethod: currentPlan.claimMethod || "agency_managed",
        expectedAmount: currentPlan.monthlySdaAmount || currentPlan.annualSdaBudget / 12,
        status: "pending",
        createdBy: args.userId,
        createdAt: now,
        updatedAt: now,
      });

      createdClaimIds.push(claimId);
      created++;
    }

    // Audit log: Bulk claim creation
    if (created > 0) {
      await ctx.runMutation(internal.auditLog.log, {
        userId: user._id,
        userEmail: user.email,
        userName: getUserFullName(user),
        action: "create",
        entityType: "claim",
        entityId: createdClaimIds[0], // Log first claim ID
        entityName: `Bulk Claims - ${args.claimPeriod}`,
        metadata: JSON.stringify({
          claimPeriod: args.claimPeriod,
          created,
          skipped,
          claimIds: createdClaimIds,
        }),
      });
    }

    return { created, skipped };
  },
});

// Mark claim as submitted
export const markSubmitted = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("claims"),
    claimDate: v.string(),
    claimedAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requirePermission(ctx, args.userId, "payments", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) throw new Error("Claim not found");

    await ctx.db.patch(args.claimId, {
      status: "submitted",
      claimDate: args.claimDate,
      claimedAmount: args.claimedAmount || claim.expectedAmount,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mark claim as paid
export const markPaid = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("claims"),
    paidDate: v.string(),
    paidAmount: v.number(),
    paymentReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requirePermission(ctx, args.userId, "payments", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) throw new Error("Claim not found");

    await ctx.db.patch(args.claimId, {
      status: "paid",
      paidDate: args.paidDate,
      paidAmount: args.paidAmount,
      paymentReference: args.paymentReference,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mark claim as rejected
export const markRejected = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("claims"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requirePermission(ctx, args.userId, "payments", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) throw new Error("Claim not found");

    await ctx.db.patch(args.claimId, {
      status: "rejected",
      notes: args.reason || "Claim rejected",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Revert claim to pending
export const revertToPending = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("claims"),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requirePermission(ctx, args.userId, "payments", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) throw new Error("Claim not found");

    await ctx.db.patch(args.claimId, {
      status: "pending",
      claimDate: undefined,
      claimedAmount: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get PACE export data (for CSV bulk upload)
export const getPaceExport = query({
  args: {
    userId: v.id("users"),
    claimPeriod: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allClaims = await ctx.db
      .query("claims")
      .withIndex("by_period", (q) => q.eq("claimPeriod", args.claimPeriod))
      .collect();

    const claims = allClaims.filter(
      (c) => c.organizationId === organizationId && c.claimMethod === "pace" && c.status === "pending"
    );

    const exportData = await Promise.all(
      claims.map(async (claim) => {
        const participant = await ctx.db.get(claim.participantId);
        const plan = await ctx.db.get(claim.planId);

        return {
          ndisNumber: (participant ? (await decryptField(participant.ndisNumber)) ?? participant.ndisNumber : ""),
          firstName: participant?.firstName || "",
          lastName: participant?.lastName || "",
          supportItemNumber: plan?.supportItemNumber || "01_021_0115_1_1",
          amount: claim.expectedAmount,
          claimPeriod: claim.claimPeriod,
        };
      })
    );

    return exportData;
  },
});

// Get monthly summary statistics
export const getMonthlySummary = query({
  args: {
    userId: v.id("users"),
    claimPeriod: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allClaims = await ctx.db
      .query("claims")
      .withIndex("by_period", (q) => q.eq("claimPeriod", args.claimPeriod))
      .collect();

    const claims = allClaims.filter((c) => c.organizationId === organizationId);

    const byMethod = {
      agency_managed: claims.filter((c) => c.claimMethod === "agency_managed"),
      pace: claims.filter((c) => c.claimMethod === "pace"),
      plan_managed: claims.filter((c) => c.claimMethod === "plan_managed"),
    };

    const byStatus = {
      pending: claims.filter((c) => c.status === "pending"),
      submitted: claims.filter((c) => c.status === "submitted"),
      paid: claims.filter((c) => c.status === "paid"),
      rejected: claims.filter((c) => c.status === "rejected"),
    };

    return {
      total: claims.length,
      totalExpected: claims.reduce((sum, c) => sum + c.expectedAmount, 0),
      totalPaid: claims
        .filter((c) => c.status === "paid")
        .reduce((sum, c) => sum + (c.paidAmount || 0), 0),
      byMethod: {
        agency_managed: {
          count: byMethod.agency_managed.length,
          total: byMethod.agency_managed.reduce((sum, c) => sum + c.expectedAmount, 0),
        },
        pace: {
          count: byMethod.pace.length,
          total: byMethod.pace.reduce((sum, c) => sum + c.expectedAmount, 0),
        },
        plan_managed: {
          count: byMethod.plan_managed.length,
          total: byMethod.plan_managed.reduce((sum, c) => sum + c.expectedAmount, 0),
        },
      },
      byStatus: {
        pending: byStatus.pending.length,
        submitted: byStatus.submitted.length,
        paid: byStatus.paid.length,
        rejected: byStatus.rejected.length,
      },
    };
  },
});

// Delete a claim
export const remove = mutation({
  args: {
    userId: v.id("users"),
    claimId: v.id("claims"),
  },
  handler: async (ctx, args) => {
    // Permission check - only admin can delete
    await requirePermission(ctx, args.userId, "payments", "delete");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.organizationId !== organizationId) {
      throw new Error("Claim not found");
    }
    await ctx.db.delete(args.claimId);
    return { success: true };
  },
});

// Get decrypted NDIS number for a participant (used by CSV export)
export const getDecryptedNdisNumber = query({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const participant = await ctx.db.get(args.participantId);
    if (!participant || participant.organizationId !== organizationId) {
      return { ndisNumber: "" };
    }

    const decrypted = await decryptField(participant.ndisNumber);
    return { ndisNumber: decrypted ?? "" };
  },
});
