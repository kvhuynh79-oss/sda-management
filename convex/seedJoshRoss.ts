import { mutation } from "./_generated/server";

// One-time seed function to add Josh Ross to 26 Barina Parkway, Kelso
// Data sourced from: Accommodation Agreement dated 19/04/2022
// Run this once via the Convex dashboard or by calling the mutation
export const seedJoshRoss = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if participant already exists by name (no NDIS number in document)
    const existingParticipants = await ctx.db
      .query("participants")
      .collect();

    const existingJosh = existingParticipants.find(
      p => p.firstName === "Josh" && p.lastName === "Ross"
    );

    if (existingJosh) {
      return {
        success: false,
        message: "Participant Josh Ross already exists",
        participantId: existingJosh._id,
      };
    }

    // Find or create the owner (Better Living Solutions - self-owned)
    let owner = await ctx.db
      .query("owners")
      .filter((q) => q.eq(q.field("companyName"), "Better Living Solutions"))
      .first();

    if (!owner) {
      // Create the owner
      const ownerId = await ctx.db.insert("owners", {
        ownerType: "self",
        companyName: "Better Living Solutions",
        email: "khen@betterlivingsolutions.com.au",
        phone: "0410646223",
        address: "26 Henty St Yagoona 2199",
        abn: "87630237277",
        bankBsb: "032373",
        bankAccountNumber: "236901",
        bankAccountName: "Better Living Solutions",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      owner = await ctx.db.get(ownerId);
    }

    if (!owner) {
      throw new Error("Failed to create or find owner");
    }

    // Find or create the property at 26 Barina Parkway, Kelso
    let property = await ctx.db
      .query("properties")
      .filter((q) =>
        q.and(
          q.eq(q.field("addressLine1"), "26 Barina Parkway"),
          q.eq(q.field("suburb"), "Kelso"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!property) {
      // Create the property
      const propertyId = await ctx.db.insert("properties", {
        propertyName: "Kelso SDA",
        addressLine1: "26 Barina Parkway",
        suburb: "Kelso",
        state: "NSW",
        postcode: "2795",
        ownerId: owner._id,
        ownershipType: "self_owned",
        sdaRegistrationNumber: "4-AXTSZUC",
        notes: "Better Living Solutions SDA property. Payment reference: Kelso. Bank: BSB 032 373, Account 23 6901.",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      property = await ctx.db.get(propertyId);
    }

    if (!property) {
      throw new Error("Failed to create or find property");
    }

    // Find or create the dwelling (House 2)
    let dwelling = await ctx.db
      .query("dwellings")
      .withIndex("by_property", (q) => q.eq("propertyId", property!._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("dwellingName"), "House 2"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!dwelling) {
      // Create the dwelling
      const dwellingId = await ctx.db.insert("dwellings", {
        propertyId: property._id,
        dwellingName: "House 2",
        dwellingType: "house",
        bedrooms: 4, // Typical SDA house
        sdaDesignCategory: "robust",
        sdaBuildingType: "existing",
        maxParticipants: 4, // Typical for Robust category
        currentOccupancy: 0,
        occupancyStatus: "vacant",
        notes: "Robust category dwelling with OOA (Onsite Overnight Assistance). Shared areas: Kitchen, Bathroom, Lounge Room, Laundry, Garage, Outdoor Area, Corridors and walkways.",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      dwelling = await ctx.db.get(dwellingId);
    }

    if (!dwelling) {
      throw new Error("Failed to create or find dwelling");
    }

    // Create participant Josh Ross
    // From Accommodation Agreement:
    // - Representative: The Public Guardian
    // - Agreement start date: 28/04/2022
    // - Duration: 24 months with option to renew
    // - Room: House 2 resident with OOA
    // - Payment frequency: Fortnightly
    // - CRA: $381.15 (100%)
    const participantId = await ctx.db.insert("participants", {
      ndisNumber: "PENDING-JROSS", // NDIS number not provided in accommodation agreement - needs to be updated
      firstName: "Josh",
      lastName: "Ross",
      dwellingId: dwelling._id,
      moveInDate: "2022-04-28", // Agreement start date
      emergencyContactName: "Office of the Public Guardian",
      emergencyContactRelation: "Legal Guardian",
      notes: "Representative: The Public Guardian. House 2 resident with OOA (Onsite Overnight Assistance). Agreement start date: 28/04/2022. Duration: 24 months with option to renew if submitted in writing. Payment via EFT/Direct Debit to BSB 032-373, Account 23 6901. Payment reference: Kelso. Furniture owned by Service Provider. Shared areas include: Kitchen, Bathroom, Lounge Room, Laundry, Garage, Outdoor Area, Corridors and walkways.",
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
    // From Accommodation Agreement:
    // - RRC: 25% DSP + 100% CRA ($381.15)
    // - Payment frequency: Fortnightly
    // - SDA Category: Robust
    // - Agreement dates: 28/04/2022 for 24 months = ends 27/04/2024
    // Note: This is historical data - plan would have been renewed
    // Creating a current plan with estimated values (to be updated with actual NDIS plan data)
    const planId = await ctx.db.insert("participantPlans", {
      participantId,
      planStartDate: "2024-04-28", // Assuming renewal from original end date
      planEndDate: "2026-04-27", // 24 months from renewal
      sdaEligibilityType: "standard",
      sdaDesignCategory: "robust", // From accommodation agreement
      sdaBuildingType: "existing",
      fundingManagementType: "ndia_managed", // Assuming NDIA managed
      annualSdaBudget: 66431.04, // $5,535.92 x 12 months
      monthlySdaAmount: 5535.92, // Confirmed monthly SDA payment
      reasonableRentContribution: 381.15, // CRA amount from document - 25% DSP portion needs to be added
      rentContributionFrequency: "fortnightly",
      notes: "RRC breakdown from Accommodation Agreement: 25% Disability Support Pension + 100% Commonwealth Rent Assistance ($381.15). Total RRC amount needs to include DSP portion. Original agreement: 28/04/2022 for 24 months. SDA Category: Robust. Monthly SDA: $5,535.92.",
      planStatus: "current",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Successfully created Josh Ross with property, dwelling, and NDIS plan",
      data: {
        ownerId: owner._id,
        propertyId: property._id,
        dwellingId: dwelling._id,
        participantId,
        planId,
        details: {
          participant: "Josh Ross",
          representative: "The Public Guardian",
          address: "26 Barina Parkway, Kelso NSW 2795",
          dwelling: "House 2",
          sdaCategory: "Robust",
          moveInDate: "28 April 2022",
          rrc: "$381.15 CRA + 25% DSP (fortnightly)",
          monthlySda: "$5,535.92",
          annualSda: "$66,431.04",
          fundingType: "NDIA Managed (assumed)",
          notes: "NDIS number pending - needs to be updated.",
        },
      },
    };
  },
});