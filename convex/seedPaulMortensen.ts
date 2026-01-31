import { mutation } from "./_generated/server";

// Seed function to add Paul Mortensen
// Data sourced from: Accommodation Agreement (13/10/2021), Letter of Offer/SDA Quotation (8/9/2025 updated)
export const seedPaulMortensen = mutation({
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

    // Check if property already exists at 43A Munro St Sefton
    const existingProperty = await ctx.db
      .query("properties")
      .filter((q) =>
        q.and(
          q.eq(q.field("addressLine1"), "43A Munro Street"),
          q.eq(q.field("suburb"), "Sefton"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    let propertyId;
    if (existingProperty) {
      propertyId = existingProperty._id;
    } else {
      // Create the property at 43A Munro St Sefton NSW 2162
      propertyId = await ctx.db.insert("properties", {
        propertyName: "43A Munro St Sefton",
        addressLine1: "43A Munro Street",
        suburb: "Sefton",
        state: "NSW",
        postcode: "2162",
        ownerId: owner._id,
        ownershipType: "self_owned",
        sdaRegistrationNumber: "NSW2609-A",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Check if Villa dwelling already exists
    const existingDwelling = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .filter((q) =>
        q.and(
          q.eq(q.field("dwellingName"), "Villa"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    let dwellingId;
    if (existingDwelling) {
      dwellingId = existingDwelling._id;
    } else {
      // Create the Villa dwelling
      // From Accommodation Agreement: 2 bedroom Villa for 1 participant with OOA
      // From Letter of Offer: Improved Liveability – Villa 1 Participant + OOA
      // SDA Funding: $66,408/year
      // Dwelling Enrolment Date: 29/01/2024
      dwellingId = await ctx.db.insert("dwellings", {
        propertyId,
        dwellingName: "Villa",
        dwellingType: "villa",
        bedrooms: 2,
        sdaDesignCategory: "improved_liveability",
        sdaBuildingType: "existing",
        registrationDate: "2024-01-29", // Dwelling Enrolment Date: 29/01/2024
        sdaRegisteredAmount: 66408, // $66,408/year from Letter of Offer
        maxParticipants: 1, // 1 Participant + OOA
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
      .withIndex("by_ndisNumber", (q) => q.eq("ndisNumber", "430011957"))
      .first();

    if (existingParticipant) {
      return {
        success: false,
        message: "Participant Paul Mortensen already exists",
        participantId: existingParticipant._id,
      };
    }

    // Create participant Paul Mortensen
    // From Accommodation Agreement:
    // - Representative: The Public Guardian
    // - Agreement start date: 20/10/2021
    // - Payment via EFT to BSB 012-226, Account 427 851 314, Account name: Khen Huynh
    const participantId = await ctx.db.insert("participants", {
      ndisNumber: "430011957",
      firstName: "Paul",
      lastName: "Mortensen",
      dateOfBirth: "1970-04-29", // 29/04/1970 in ISO format
      dwellingId,
      moveInDate: "2021-10-20", // Agreement start: 20/10/2021
      emergencyContactName: "The Public Guardian",
      emergencyContactRelation: "Guardian",
      notes: "Representative: The Public Guardian. Agreement commenced 20 October 2021. Duration: 24 months with option to renew. Payment via EFT to BSB 012-226, Account 427 851 314, Account name: Khen Huynh, Reference: 43A Munro. Dwelling Registration #NSW2609-A.",
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
    // From Letter of Offer (8/9/2025 updated):
    // - SDA Funding: $66,408/year = $5,534/month
    // - RRC: 25% DSP ($262.48) + 100% CRA ($157.20) = $419.68 fortnightly
    // - Dwelling Enrolment Date: 29/01/2024
    const planId = await ctx.db.insert("participantPlans", {
      participantId,
      planStartDate: "2024-01-29", // Dwelling Enrolment Date
      planEndDate: "2026-01-29", // 2 years
      sdaEligibilityType: "standard",
      sdaDesignCategory: "improved_liveability",
      sdaBuildingType: "existing",
      fundingManagementType: "ndia_managed",
      annualSdaBudget: 66408, // $66,408/year from Letter of Offer
      monthlySdaAmount: 5534, // $66,408 / 12
      claimDay: 29, // Claim on the 29th to match enrolment date
      reasonableRentContribution: 419.68, // $419.68 fortnightly (25% DSP $262.48 + 100% CRA $157.20)
      rentContributionFrequency: "fortnightly",
      notes: "RRC: 25% DSP ($262.48) + 100% CRA ($157.20) = $419.68 fortnightly. Improved Liveability category. Villa 1 Participant + OOA. Representative: The Public Guardian.",
      planStatus: "current",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Successfully created Paul Mortensen with property, dwelling, and NDIS plan",
      data: {
        propertyId,
        dwellingId,
        participantId,
        planId,
        details: {
          participant: "Paul Mortensen",
          ndisNumber: "430011957",
          dateOfBirth: "29 April 1970",
          address: "43A Munro Street, Sefton NSW 2162",
          moveInDate: "20 October 2021",
          dwellingCategory: "Improved Liveability - Villa 1 Participant + OOA",
          sdaFunding: "$66,408/year",
          monthlySda: "$5,534/month",
          rrc: "$419.68 fortnightly (25% DSP + 100% CRA)",
          claimDay: "29th of each month",
          fundingType: "Agency-managed (NDIA)",
          representative: "The Public Guardian",
        },
      },
    };
  },
});
