import { mutation } from "./_generated/server";

// One-time seed function to add Anne-Marie Zammit and her property
// Data sourced from: Letter of Offer, Accommodation Agreement, Centrepay form, Centrelink payment
// Run this once via the Convex dashboard or by calling the mutation
export const seedAnneMarie = mutation({
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

    // Check if property already exists at 44 Waldron Rd
    const existingProperty = await ctx.db
      .query("properties")
      .filter((q) =>
        q.and(
          q.eq(q.field("addressLine1"), "44 Waldron Road"),
          q.eq(q.field("suburb"), "Sefton"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    let propertyId;
    if (existingProperty) {
      propertyId = existingProperty._id;
    } else {
      // Create the property at 44 Waldron Rd Sefton NSW 2162
      propertyId = await ctx.db.insert("properties", {
        propertyName: "44 Waldron Rd Sefton",
        addressLine1: "44 Waldron Road",
        suburb: "Sefton",
        state: "NSW",
        postcode: "2162",
        ownerId: owner._id,
        ownershipType: "self_owned",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Check if Main House dwelling already exists
    const existingDwelling = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .filter((q) =>
        q.and(
          q.eq(q.field("dwellingName"), "Main House"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    let dwellingId;
    if (existingDwelling) {
      dwellingId = existingDwelling._id;
    } else {
      // Create the Main House dwelling
      // From documents: House 4 resident with OOA, High Physical Support with sprinklers
      // Dwelling Enrolment Date: 9 July 2024
      // SDA Funding: $58,818/year (from Letter of Offer)
      dwellingId = await ctx.db.insert("dwellings", {
        propertyId,
        dwellingName: "Main House",
        dwellingType: "house",
        bedrooms: 4,
        sdaDesignCategory: "high_physical_support",
        sdaBuildingType: "existing",
        registrationDate: "2024-07-09", // Dwelling Enrolment Date: 9 July 2024
        sdaRegisteredAmount: 58818, // $58,818/year from Letter of Offer
        maxParticipants: 4, // House 4 resident with OOA
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
      .withIndex("by_ndisNumber", (q) => q.eq("ndisNumber", "430121488"))
      .first();

    if (existingParticipant) {
      return {
        success: false,
        message: "Participant Anne-Marie Zammit already exists",
        participantId: existingParticipant._id,
      };
    }

    // Create participant Anne-Marie Zammit
    // Representative: Rosemary Kable, Phone: 0404 239 884, Email: allank@bigpond.net.au
    // CRN: 220-572-1994
    const participantId = await ctx.db.insert("participants", {
      ndisNumber: "430121488",
      firstName: "Anne-Marie",
      lastName: "Zammit",
      dateOfBirth: "1969-03-04", // 4/3/1969 in ISO format
      dwellingId,
      moveInDate: "2025-04-22", // 22nd April 2025 from Letter of Offer
      emergencyContactName: "Rosemary Kable",
      emergencyContactPhone: "0404 239 884",
      emergencyContactRelation: "Representative",
      notes: "CRN: 220-572-1994. Representative email: allank@bigpond.net.au, Address: 16 Leichhardt Cres, Sylvania",
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update dwelling occupancy
    await ctx.db.patch(dwellingId, {
      currentOccupancy: 1,
      occupancyStatus: "partially_occupied",
      updatedAt: Date.now(),
    });

    // Create the NDIS plan
    // SDA Funding: $58,818/year = $4,901.50/month
    // RRC: $419.68 fortnightly ($262.48 DSP 25% + $157.20 CRA 100%)
    // Plan dates from user: 1/5/2025 - 8/4/2026, claim on 1st
    const planId = await ctx.db.insert("participantPlans", {
      participantId,
      planStartDate: "2025-05-01", // 1/5/2025
      planEndDate: "2026-04-08", // 8/4/2026
      sdaEligibilityType: "standard",
      sdaDesignCategory: "high_physical_support",
      sdaBuildingType: "existing",
      fundingManagementType: "ndia_managed",
      annualSdaBudget: 58818, // $58,818/year from Letter of Offer
      monthlySdaAmount: 4901.50, // 58818 / 12
      claimDay: 1, // Claim on the 1st of each month
      reasonableRentContribution: 419.68, // $419.68 fortnightly RRC
      rentContributionFrequency: "fortnightly",
      notes: "RRC breakdown: 25% DSP ($262.48) + 100% CRA ($157.20) = $419.68 fortnightly. Centrepay deduction commencing 30/4/2025.",
      planStatus: "current",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Successfully created Anne-Marie Zammit with property, dwelling, and NDIS plan",
      data: {
        propertyId,
        dwellingId,
        participantId,
        planId,
        details: {
          participant: "Anne-Marie Zammit",
          ndisNumber: "430121488",
          address: "44 Waldron Road, Sefton NSW 2162",
          moveInDate: "22 April 2025",
          sdaFunding: "$58,818/year",
          rrc: "$419.68 fortnightly",
          planDates: "1 May 2025 - 8 April 2026",
          claimDay: "1st of each month",
        },
      },
    };
  },
});
