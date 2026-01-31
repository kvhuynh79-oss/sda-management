import { mutation } from "./_generated/server";

// Add historical payment/claim records for Paul Mortensen
// Data sourced from NDIS CSV claim files
export const seedPaulMortensenPayments = mutation({
  args: {},
  handler: async (ctx) => {
    // Find Paul Mortensen by NDIS number
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_ndisNumber", (q) => q.eq("ndisNumber", "430011957"))
      .first();

    if (!participant) {
      throw new Error("Paul Mortensen not found. Please run seedPaulMortensen first.");
    }

    // Get his plan (either current or most recent)
    const plans = await ctx.db
      .query("participantPlans")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .collect();

    const plan = plans.find((p) => p.planStatus === "current") || plans[0];

    if (!plan) {
      throw new Error("No plan found for Paul Mortensen.");
    }

    // Historical claims from CSV files
    // Amount: $5,534 per month (from most recent files)
    // Registration Number: 4050052336
    // Support Number: 06_431_0131_2_2
    // ABN: 87630237277
    const historicalClaims = [
      {
        claimPeriod: "2025-06", // Service period 2025-05-29 to 2025-06-28
        claimReference: "280620255",
        supportsDeliveredFrom: "2025-05-29",
        supportsDeliveredTo: "2025-06-28",
        amount: 5534,
        claimDate: "2025-06-28",
        paidDate: "2025-07-10",
      },
      {
        claimPeriod: "2025-07", // Service period 2025-06-29 to 2025-07-28
        claimReference: "280720255",
        supportsDeliveredFrom: "2025-06-29",
        supportsDeliveredTo: "2025-07-28",
        amount: 5534,
        claimDate: "2025-07-28",
        paidDate: "2025-08-10",
      },
      {
        claimPeriod: "2025-08", // Service period 2025-07-29 to 2025-08-28
        claimReference: "280820255",
        supportsDeliveredFrom: "2025-07-29",
        supportsDeliveredTo: "2025-08-28",
        amount: 5534,
        claimDate: "2025-08-28",
        paidDate: "2025-09-10",
      },
      {
        claimPeriod: "2025-09", // Service period 2025-08-29 to 2025-09-28
        claimReference: "15102025",
        supportsDeliveredFrom: "2025-08-29",
        supportsDeliveredTo: "2025-09-28",
        amount: 5534,
        claimDate: "2025-10-15",
        paidDate: "2025-10-28",
      },
      {
        claimPeriod: "2025-10", // Service period 2025-09-29 to 2025-10-28
        claimReference: "30102025",
        supportsDeliveredFrom: "2025-09-29",
        supportsDeliveredTo: "2025-10-28",
        amount: 5534,
        claimDate: "2025-10-30",
        paidDate: "2025-11-12",
      },
      {
        claimPeriod: "2025-11", // Service period 2025-10-29 to 2025-11-28
        claimReference: "28112025",
        supportsDeliveredFrom: "2025-10-29",
        supportsDeliveredTo: "2025-11-28",
        amount: 5534,
        claimDate: "2025-11-28",
        paidDate: "2025-12-10",
      },
      {
        claimPeriod: "2025-12", // Service period 2025-11-29 to 2025-12-28
        claimReference: "28122025",
        supportsDeliveredFrom: "2025-11-29",
        supportsDeliveredTo: "2025-12-28",
        amount: 5534,
        claimDate: "2025-12-28",
        paidDate: "2026-01-10",
      },
      {
        claimPeriod: "2026-01", // Service period 2025-12-29 to 2026-01-28
        claimReference: "28012026",
        supportsDeliveredFrom: "2025-12-29",
        supportsDeliveredTo: "2026-01-28",
        amount: 5534,
        claimDate: "2026-01-28",
        paidDate: "2026-01-30",
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
      message: `Added ${createdClaims.length} historical claims for Paul Mortensen`,
      participant: `${participant.firstName} ${participant.lastName}`,
      ndisNumber: participant.ndisNumber,
      created: createdClaims,
      skipped: skippedClaims,
      totalAmount: createdClaims.reduce((sum, c) => sum + c.amount, 0),
    };
  },
});
