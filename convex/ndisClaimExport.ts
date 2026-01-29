import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get provider settings
export const getProviderSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("providerSettings").first();
    return settings;
  },
});

// Save provider settings (create or update)
export const saveProviderSettings = mutation({
  args: {
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
    const existing = await ctx.db.query("providerSettings").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("providerSettings", {
        ...args,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Generate NDIS claim data for export
export const generateClaimData = query({
  args: {
    periodStart: v.string(),
    periodEnd: v.string(),
    participantIds: v.optional(v.array(v.id("participants"))),
  },
  handler: async (ctx, args) => {
    // Get provider settings
    const providerSettings = await ctx.db.query("providerSettings").first();

    if (!providerSettings) {
      return { error: "Provider settings not configured", claims: [] };
    }

    // Get all active participants or filter by IDs
    let participants;
    if (args.participantIds && args.participantIds.length > 0) {
      participants = await Promise.all(
        args.participantIds.map((id) => ctx.db.get(id))
      );
      participants = participants.filter((p) => p !== null);
    } else {
      participants = await ctx.db
        .query("participants")
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
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

      // Calculate the number of days in the period
      const startDate = new Date(args.periodStart);
      const endDate = new Date(args.periodEnd);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Calculate unit price (daily rate * number of days)
      const unitPrice = plan.dailySdaRate * daysDiff;

      // Generate claim reference (format: MMYYYY + counter, e.g., 012026001)
      const monthYear = args.periodStart.substring(5, 7) + args.periodStart.substring(0, 4);
      const claimRef = monthYear + String(claimRefCounter).padStart(3, "0");
      claimRefCounter++;

      claims.push({
        RegistrationNumber: providerSettings.ndisRegistrationNumber,
        NDISNumber: participant.ndisNumber,
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
        _dailyRate: plan.dailySdaRate,
        _days: daysDiff,
      });
    }

    return { claims, providerSettings };
  },
});

// Get active participants for selection
export const getActiveParticipantsForClaim = query({
  args: {},
  handler: async (ctx) => {
    const participants = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

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
          dailyRate: plan?.dailySdaRate || 0,
          supportItemNumber: plan?.supportItemNumber || null,
        };
      })
    );

    return participantsWithPlans;
  },
});
