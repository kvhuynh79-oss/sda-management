import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireTenant } from "./authHelpers";
import { decryptField } from "./lib/encryption";

// Get provider settings
export const getProviderSettings = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allSettings = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    return allSettings[0] ?? null;
  },
});

// Save provider settings (create or update)
export const saveProviderSettings = mutation({
  args: {
    userId: v.id("users"),
    providerName: v.string(),
    ndisRegistrationNumber: v.string(),
    abn: v.string(),
    defaultGstCode: v.string(),
    defaultSupportItemNumber: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { userId, ...settingsData } = args;

    const allSettings = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const existing = allSettings[0];

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...settingsData,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("providerSettings", {
        organizationId,
        ...settingsData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Generate NDIS claim data for export
export const generateClaimData = query({
  args: {
    userId: v.id("users"),
    periodStart: v.string(),
    periodEnd: v.string(),
    participantIds: v.optional(v.array(v.id("participants"))),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Get provider settings for this organization
    const allSettings = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const providerSettings = allSettings[0] ?? null;

    if (!providerSettings) {
      return { error: "Provider settings not configured", claims: [] };
    }

    // Get all active participants for this organization, or filter by IDs
    let participants;
    if (args.participantIds && args.participantIds.length > 0) {
      const fetched = await Promise.all(
        args.participantIds.map((id) => ctx.db.get(id))
      );
      // Filter to only participants belonging to this organization
      participants = fetched.filter((p) => p !== null && p.organizationId === organizationId);
    } else {
      const allParticipants = await ctx.db
        .query("participants")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect();
      participants = allParticipants.filter((p) => p.status === "active");
    }

    const claims = [];
    let claimRefCounter = 1;

    for (const participant of participants) {
      if (!participant) continue;

      // Get the current plan for this participant
      const plan = await ctx.db
        .query("participantPlans")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) => q.eq(q.field("planStatus"), "current"))
        .first();

      if (!plan) continue;

      // Use the monthly SDA amount directly (not calculated from daily rate)
      const unitPrice = plan.monthlySdaAmount || (plan.dailySdaRate ? plan.dailySdaRate * 30 : 0);

      // Generate claim reference (format: MMYYYY + counter, e.g., 012026001)
      const monthYear = args.periodStart.substring(5, 7) + args.periodStart.substring(0, 4);
      const claimRef = monthYear + String(claimRefCounter).padStart(3, "0");
      claimRefCounter++;

      claims.push({
        RegistrationNumber: providerSettings.ndisRegistrationNumber,
        NDISNumber: (await decryptField(participant.ndisNumber)) || participant.ndisNumber,
        SupportsDeliveredFrom: args.periodStart,
        SupportsDeliveredTo: args.periodEnd,
        SupportNumber: plan.supportItemNumber || providerSettings.defaultSupportItemNumber,
        ClaimReference: claimRef,
        Quantity: 1,
        Hours: "",
        UnitPrice: unitPrice.toFixed(2),
        GSTCode: providerSettings.defaultGstCode,
        AuthorisedBy: "",
        ParticipantApproved: "",
        InKindFundingProgram: "",
        ClaimType: "",
        CancellationReason: "",
        "ABN of Support Provider": providerSettings.abn,
        // Additional metadata for display (not in CSV)
        _participantName: `${participant.firstName} ${participant.lastName}`,
        _monthlyAmount: plan.monthlySdaAmount || 0,
        _annualBudget: plan.annualSdaBudget,
        _claimDay: plan.claimDay || null,
      });
    }

    return { claims, providerSettings };
  },
});

// Get active participants for selection
export const getActiveParticipantsForClaim = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const participants = allParticipants.filter((p) => p.status === "active");

    // Get their current plans
    const participantsWithPlans = await Promise.all(
      participants.map(async (p) => {
        const plan = await ctx.db
          .query("participantPlans")
          .withIndex("by_participant", (q) => q.eq("participantId", p._id))
          .filter((q) => q.eq(q.field("planStatus"), "current"))
          .first();

        return {
          ...p,
          hasPlan: !!plan,
          monthlyAmount: plan?.monthlySdaAmount || 0,
          annualBudget: plan?.annualSdaBudget || 0,
          claimDay: plan?.claimDay || null,
          supportItemNumber: plan?.supportItemNumber || null,
          planStartDate: plan?.planStartDate || null,
        };
      })
    );

    return participantsWithPlans;
  },
});
