import { mutation } from "./_generated/server";

// Add historical payment/claim records for Anne-Marie Zammit
// Data sourced from NDIS CSV claim files
export const seedAnneMariePayments = mutation({
  args: {},
  handler: async (ctx) => {
    // Find Anne-Marie by NDIS number
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_ndisNumber", (q) => q.eq("ndisNumber", "430121488"))
      .first();

    if (!participant) {
      throw new Error("Anne-Marie Zammit not found. Please run seedAnneMarie first.");
    }

    // Get her plan (either current or most recent)
    const plans = await ctx.db
      .query("participantPlans")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .collect();

    // Try to find current plan, or use the most recent one
    let plan = plans.find((p) => p.planStatus === "current") || plans[0];

    // If no plan exists, create one
    if (!plan) {
      const planId = await ctx.db.insert("participantPlans", {
        participantId: participant._id,
        planStartDate: "2025-05-01",
        planEndDate: "2026-04-08",
        sdaEligibilityType: "standard",
        sdaDesignCategory: "high_physical_support",
        sdaBuildingType: "existing",
        fundingManagementType: "ndia_managed",
        annualSdaBudget: 58818,
        monthlySdaAmount: 4611.58,
        claimDay: 1,
        claimMethod: "pace",
        reasonableRentContribution: 419.68,
        rentContributionFrequency: "fortnightly",
        notes: "RRC: 25% DSP ($262.48) + 100% CRA ($157.20) = $419.68 fortnightly.",
        planStatus: "current",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const newPlan = await ctx.db.get(planId);
      if (!newPlan) {
        throw new Error("Failed to create plan for Anne-Marie Zammit.");
      }
      plan = newPlan;
    }

    // Historical claims from CSV files
    // All claims are for $4,611.58 per month
    // Registration Number: 4050052336
    // Support Number: 06_431_0131_2_2
    // ABN: 87630237277
    const historicalClaims = [
      {
        claimPeriod: "2025-06", // Service period 2025-05-01 to 2025-06-01
        claimReference: "Anne02062025",
        supportsDeliveredFrom: "2025-05-01",
        supportsDeliveredTo: "2025-06-01",
        amount: 4611.58,
        claimDate: "2025-06-02",
        paidDate: "2025-06-15",
      },
      {
        claimPeriod: "2025-07", // Service period 2025-06-01 to 2025-07-01
        claimReference: "Anne01072025",
        supportsDeliveredFrom: "2025-06-01",
        supportsDeliveredTo: "2025-07-01",
        amount: 4611.58,
        claimDate: "2025-07-01",
        paidDate: "2025-07-15",
      },
      {
        claimPeriod: "2025-08", // Service period 2025-07-01 to 2025-08-01
        claimReference: "Anne01082025",
        supportsDeliveredFrom: "2025-07-01",
        supportsDeliveredTo: "2025-08-01",
        amount: 4611.58,
        claimDate: "2025-08-01",
        paidDate: "2025-08-15",
      },
      {
        claimPeriod: "2025-09", // Service period 2025-08-01 to 2025-09-01
        claimReference: "Anne01092025",
        supportsDeliveredFrom: "2025-08-01",
        supportsDeliveredTo: "2025-09-01",
        amount: 4611.58,
        claimDate: "2025-09-01",
        paidDate: "2025-09-15",
      },
      {
        claimPeriod: "2025-10", // Service period 2025-09-01 to 2025-10-01
        claimReference: "Anne01102025",
        supportsDeliveredFrom: "2025-09-01",
        supportsDeliveredTo: "2025-10-01",
        amount: 4611.58,
        claimDate: "2025-10-01",
        paidDate: "2025-10-15",
      },
      {
        claimPeriod: "2025-11", // Service period 2025-10-01 to 2025-11-01
        claimReference: "Anne03112025",
        supportsDeliveredFrom: "2025-10-01",
        supportsDeliveredTo: "2025-11-01",
        amount: 4611.58,
        claimDate: "2025-11-03",
        paidDate: "2025-11-17",
      },
      {
        claimPeriod: "2025-12", // Service period 2025-11-01 to 2025-12-01
        claimReference: "Anne01122025",
        supportsDeliveredFrom: "2025-11-01",
        supportsDeliveredTo: "2025-12-01",
        amount: 4611.58,
        claimDate: "2025-12-01",
        paidDate: "2025-12-15",
      },
      {
        claimPeriod: "2026-01", // Service period 2025-12-01 to 2026-01-01
        claimReference: "Anne01012026",
        supportsDeliveredFrom: "2025-12-01",
        supportsDeliveredTo: "2026-01-01",
        amount: 4611.58,
        claimDate: "2026-01-01",
        paidDate: "2026-01-15",
      },
    ];

    const createdClaims = [];
    const skippedClaims = [];

    for (const claim of historicalClaims) {
      // Check if claim already exists for this period
      const existingClaim = await ctx.db
        .query("claims")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) => q.eq(q.field("claimPeriod"), claim.claimPeriod))
        .first();

      if (existingClaim) {
        skippedClaims.push(claim.claimPeriod);
        continue;
      }

      // Create the claim record
      const claimId = await ctx.db.insert("claims", {
        participantId: participant._id,
        planId: plan._id,
        claimPeriod: claim.claimPeriod,
        claimMethod: "pace", // PACE bulk upload CSV
        expectedAmount: claim.amount,
        claimedAmount: claim.amount,
        status: "paid",
        claimDate: claim.claimDate,
        paidDate: claim.paidDate,
        paidAmount: claim.amount,
        paymentReference: claim.claimReference,
        notes: `NDIS Claim via PACE. Support Number: 06_431_0131_2_2. Service period: ${claim.supportsDeliveredFrom} to ${claim.supportsDeliveredTo}. Registration: 4050052336.`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      createdClaims.push({
        id: claimId,
        period: claim.claimPeriod,
        reference: claim.claimReference,
        amount: claim.amount,
      });
    }

    return {
      success: true,
      message: `Added ${createdClaims.length} historical claims for Anne-Marie Zammit`,
      participant: `${participant.firstName} ${participant.lastName}`,
      ndisNumber: participant.ndisNumber,
      created: createdClaims,
      skipped: skippedClaims,
      totalAmount: createdClaims.reduce((sum, c) => sum + c.amount, 0),
    };
  },
});
