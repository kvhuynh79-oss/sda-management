import { mutation } from "./_generated/server";

// One-time seed function to add Marcel Laaban and his property
// Data sourced from: Accommodation Agreement, Letter of Offer - SDA 13-01-2026, NDIS Plan funding schedule
// Run this once via the Convex dashboard or by calling the mutation
export const seedMarcelLaaban = mutation({
  args: {},
  handler: async (ctx) => {
    // First, find or create the owner (Better Living Solutions - self-owned)
    let owner = await ctx.db
      .query("owners")
      .filter((q) => q.eq(q.field("ownerType"), "self"))
      .first();

    if (!owner) {
      const ownerId = await ctx.db.insert("owners", {
        ownerType: "self",
        companyName: "Better Living Solutions",
        email: "admin@betterlivingsolutions.com.au",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      owner = await ctx.db.get(ownerId);
    }

    if (!owner) {
      throw new Error("Failed to create or find owner");
    }

    // Check if property already exists at 4 Porter St North Wollongong
    const existingProperty = await ctx.db
      .query("properties")
      .filter((q) =>
        q.and(
          q.eq(q.field("addressLine1"), "4 Porter Street"),
          q.eq(q.field("suburb"), "North Wollongong"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    let propertyId;
    if (existingProperty) {
      propertyId = existingProperty._id;
    } else {
      // Create the property at 4 Porter St North Wollongong NSW 2500
      propertyId = await ctx.db.insert("properties", {
        propertyName: "4 Porter St North Wollongong",
        addressLine1: "4 Porter Street",
        suburb: "North Wollongong",
        state: "NSW",
        postcode: "2500",
        ownerId: owner._id,
        ownershipType: "self_owned",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Check if Unit 4B dwelling already exists
    const existingDwelling = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .filter((q) =>
        q.and(
          q.eq(q.field("dwellingName"), "Unit 4B"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    let dwellingId;
    if (existingDwelling) {
      dwellingId = existingDwelling._id;
    } else {
      // Create the Unit 4B dwelling
      // High Physical Support dwelling
      // SDA Funding: $58,602/year (from Letter of Offer)
      dwellingId = await ctx.db.insert("dwellings", {
        propertyId,
        dwellingName: "Unit 4B",
        dwellingType: "unit",
        bedrooms: 1,
        sdaDesignCategory: "high_physical_support",
        sdaBuildingType: "new_build",
        sdaRegisteredAmount: 58602, // $58,602/year from Letter of Offer
        maxParticipants: 1,
        currentOccupancy: 0,
        occupancyStatus: "vacant",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Check if participant already exists
    const existingParticipant = await ctx.db
      .query("participants")
      .withIndex("by_ndisNumber", (q) => q.eq("ndisNumber", "431955102"))
      .first();

    if (existingParticipant) {
      return {
        success: false,
        message: "Participant Marcel Laaban already exists",
        participantId: existingParticipant._id,
      };
    }

    // Create participant Marcel Laaban
    // From Accommodation Agreement:
    // - NDIS # 431 955 102
    // - DOB: 29/12/1964
    // - Move-in date: 13/01/2026
    // - House 3 resident with OOA
    // - SIL Provider: Supporting Disabilities Australia
    const participantId = await ctx.db.insert("participants", {
      ndisNumber: "431955102",
      firstName: "Marcel",
      lastName: "Laaban",
      dateOfBirth: "1964-12-29", // 29/12/1964 in ISO format
      dwellingId,
      moveInDate: "2026-01-13", // 13/01/2026 from Letter of Offer
      silProviderName: "Supporting Disabilities Australia",
      notes: "House 3 resident with OOA. Agreement commenced 13 January 2026. Duration: 24 months with option to renew if submitted in writing. Payment via EFT to BSB 032-373, Account 23 6901. Payment reference: Marcel Laaban.",
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update dwelling occupancy
    await ctx.db.patch(dwellingId, {
      currentOccupancy: 1,
      occupancyStatus: "fully_occupied",
      updatedAt: Date.now(),
    });

    // Create the NDIS plan
    // From NDIS Plan funding schedule:
    // - Plan period: 13 January 2026 to 12 January 2031 (5 years)
    // - Annual SDA budget: $58,602.00
    // - Monthly SDA: $4,883.50
    // - Agency-managed (ndia_managed)
    // From Accommodation Agreement:
    // - 25% DSP: $279.08 fortnightly (not eligible for CRA)
    const planId = await ctx.db.insert("participantPlans", {
      participantId,
      planStartDate: "2026-01-13", // 13/01/2026
      planEndDate: "2031-01-12", // 12/01/2031
      sdaEligibilityType: "standard",
      sdaDesignCategory: "high_physical_support",
      sdaBuildingType: "new_build",
      fundingManagementType: "ndia_managed",
      annualSdaBudget: 58602, // $58,602.00/year from NDIS plan
      monthlySdaAmount: 4883.50, // $4,883.50/month
      claimDay: 13, // Claim on the 13th to match move-in date
      reasonableRentContribution: 279.08, // $279.08 fortnightly (25% DSP only, not eligible for CRA)
      rentContributionFrequency: "fortnightly",
      notes: "RRC: 25% DSP ($279.08) fortnightly only. Not eligible for Commonwealth Rent Assistance. 5-year plan period. High Physical Support design category. House 3 resident with OOA. SIL Provider: Supporting Disabilities Australia.",
      planStatus: "current",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Successfully created Marcel Laaban with property, dwelling, and NDIS plan",
      data: {
        propertyId,
        dwellingId,
        participantId,
        planId,
        details: {
          participant: "Marcel Laaban",
          ndisNumber: "431955102",
          dateOfBirth: "29 December 1964",
          address: "4B Porter Street, North Wollongong NSW 2500",
          moveInDate: "13 January 2026",
          sdaFunding: "$58,602/year",
          monthlySda: "$4,883.50/month",
          rrc: "$279.08 fortnightly (25% DSP only, no CRA)",
          planDates: "13 January 2026 - 12 January 2031",
          claimDay: "13th of each month",
          fundingType: "Agency-managed (NDIA)",
        },
      },
    };
  },
});
