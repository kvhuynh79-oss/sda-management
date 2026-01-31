import { mutation } from "./_generated/server";

// One-time seed function to add Daniel Chetty to 44 Waldron Rd Sefton
// Data sourced from: Accommodation Agreement, Letter of Offer - SDA Quotation, NDIS Plan screenshots
// Run this once via the Convex dashboard or by calling the mutation
export const seedDanielChetty = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if participant already exists
    const existingParticipant = await ctx.db
      .query("participants")
      .withIndex("by_ndisNumber", (q) => q.eq("ndisNumber", "430117831"))
      .first();

    if (existingParticipant) {
      return {
        success: false,
        message: "Participant Daniel Chetty already exists",
        participantId: existingParticipant._id,
      };
    }

    // Find the property at 44 Waldron Rd Sefton
    const property = await ctx.db
      .query("properties")
      .filter((q) =>
        q.and(
          q.eq(q.field("addressLine1"), "44 Waldron Road"),
          q.eq(q.field("suburb"), "Sefton"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!property) {
      throw new Error("Property at 44 Waldron Road, Sefton not found. Please create the property first.");
    }

    // Find the Main House dwelling
    const dwelling = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("dwellingName"), "Main House"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!dwelling) {
      throw new Error("Main House dwelling at 44 Waldron Road not found. Please create the dwelling first.");
    }

    // Create participant Daniel Chetty
    // From Accommodation Agreement:
    // - NDIS # 430 117 831
    // - Agreement start date: 30/09/2024
    // - Duration: 24 months with option to renew
    // - Room: House 4 resident with OOA
    // From Letter of Offer:
    // - Move-in date: 15th Dec 2025
    // - Dwelling Enrolment Date: 9 July 2024
    const participantId = await ctx.db.insert("participants", {
      ndisNumber: "430117831",
      firstName: "Daniel",
      lastName: "Chetty",
      dwellingId: dwelling._id,
      moveInDate: "2025-12-15", // 15th Dec 2025 from Letter of Offer
      silProviderName: "Supporting Disabilities Australia", // From Accommodation Agreement page 6
      notes: "House 4 resident with OOA. Agreement start date: 30/09/2024. Duration: 24 months with option to renew if submitted in writing. Payment via EFT to BSB 032-373, Account 23 6901. Payment reference: 44 Waldron Rd Sefton 2162 NSW.",
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update dwelling occupancy
    const currentOccupancy = dwelling.currentOccupancy + 1;
    let occupancyStatus: "vacant" | "partially_occupied" | "fully_occupied";
    if (currentOccupancy === 0) {
      occupancyStatus = "vacant";
    } else if (currentOccupancy >= dwelling.maxParticipants) {
      occupancyStatus = "fully_occupied";
    } else {
      occupancyStatus = "partially_occupied";
    }

    await ctx.db.patch(dwelling._id, {
      currentOccupancy,
      occupancyStatus,
      updatedAt: Date.now(),
    });

    // Create the NDIS plan
    // From NDIS Plan screenshots:
    // - Plan period: 22/12/2025 - 21/12/2026
    // - Annual SDA budget: $60,228.00
    // - Monthly SDA: $5,019.00
    // - Agency-managed (ndia_managed)
    // - Design category: Fully Accessible (from NDIS plan) but dwelling is High Physical Support
    // From Letter of Offer RRC breakdown:
    // - 25% DSP: $262.48
    // - 100% CRA: $157.20
    // - Total RRC: $419.68 fortnightly
    const planId = await ctx.db.insert("participantPlans", {
      participantId,
      planStartDate: "2025-12-22", // 22/12/2025
      planEndDate: "2026-12-21", // 21/12/2026
      sdaEligibilityType: "standard",
      sdaDesignCategory: "fully_accessible", // From NDIS plan screenshot
      sdaBuildingType: "existing",
      fundingManagementType: "ndia_managed", // Agency-managed from NDIS plan
      annualSdaBudget: 60228, // $60,228.00/year from NDIS plan
      monthlySdaAmount: 5019, // $5,019.00/month from NDIS plan
      reasonableRentContribution: 419.68, // $419.68 fortnightly RRC
      rentContributionFrequency: "fortnightly",
      notes: "RRC breakdown: 25% DSP ($262.48) + 100% CRA ($157.20) = $419.68 fortnightly. NDIS plan shows Fully Accessible design category. Property is located at 44 Waldron Rd, Sefton NSW 2162. Price per resident: $60,228.00 as per SDA maximum annual budget.",
      planStatus: "current",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Successfully created Daniel Chetty with NDIS plan",
      data: {
        propertyId: property._id,
        dwellingId: dwelling._id,
        participantId,
        planId,
        details: {
          participant: "Daniel Chetty",
          ndisNumber: "430117831",
          address: "44 Waldron Road, Sefton NSW 2162",
          moveInDate: "15 December 2025",
          sdaFunding: "$60,228/year",
          monthlySda: "$5,019/month",
          rrc: "$419.68 fortnightly",
          planDates: "22 December 2025 - 21 December 2026",
          fundingType: "Agency-managed (NDIA)",
        },
      },
    };
  },
});