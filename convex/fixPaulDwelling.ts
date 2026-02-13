import { mutation } from "./_generated/server";

// Fix script to:
// 1. Update Paul Mortensen to use the correct A43 dwelling at Munro Sefton
// 2. Delete the duplicate property and dwelling created by the seed script
export const fixPaulDwelling = mutation({
  args: {},
  handler: async (ctx) => {
    // Find Paul Mortensen
    const paul = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("ndisNumber"), "430011957"))
      .first();

    if (!paul) {
      throw new Error("Paul Mortensen not found");
    }

    // Find the correct A43 dwelling at Munro Sefton
    const a43Dwelling = await ctx.db
      .query("dwellings")
      .filter((q) => q.eq(q.field("dwellingName"), "A43"))
      .first();

    if (!a43Dwelling) {
      throw new Error("A43 dwelling not found");
    }

    // Get Paul's current (incorrect) dwelling
    const oldDwelling = paul.dwellingId ? await ctx.db.get(paul.dwellingId) : null;
    const oldPropertyId = oldDwelling?.propertyId;

    // Update Paul to point to the correct A43 dwelling
    await ctx.db.patch(paul._id, {
      dwellingId: a43Dwelling._id,
      updatedAt: Date.now(),
    });

    // Update A43 dwelling occupancy
    await ctx.db.patch(a43Dwelling._id, {
      currentOccupancy: 1,
      occupancyStatus: "fully_occupied",
      updatedAt: Date.now(),
    });

    // Delete the old (duplicate) dwelling if it exists and is different
    if (oldDwelling && oldDwelling._id !== a43Dwelling._id) {
      await ctx.db.delete(oldDwelling._id);
    }

    // Delete the duplicate property if it exists and is different from A43's property
    if (oldPropertyId && oldPropertyId !== a43Dwelling.propertyId) {
      // Check no other dwellings exist for this property
      const otherDwellings = await ctx.db
        .query("dwellings")
        .filter((q) => q.eq(q.field("propertyId"), oldPropertyId))
        .collect();

      if (otherDwellings.length === 0) {
        await ctx.db.delete(oldPropertyId);
      }
    }

    return {
      success: true,
      message: "Paul Mortensen updated to A43 dwelling at Munro Sefton",
      participantId: paul._id,
      newDwellingId: a43Dwelling._id,
      oldDwellingDeleted: oldDwelling?._id !== a43Dwelling._id,
    };
  },
});