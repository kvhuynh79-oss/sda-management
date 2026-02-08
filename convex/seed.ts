import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed Script - Sprint 1 Organization Migration
 *
 * This script establishes Better Living Solutions (BLS) as the first organization
 * and backfills all existing users with the BLS organizationId.
 *
 * IDEMPOTENT: Can be run multiple times safely. Will skip if org already exists.
 *
 * Usage: Call this mutation once after deploying the new schema to production.
 */

export const seedBlsOrganization = mutation({
  args: {
    userId: v.id("users"), // Admin user running the seed
  },
  handler: async (ctx, args) => {
    console.log("Starting BLS organization seed script...");

    // Check if BLS organization already exists
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "better-living-solutions"))
      .first();

    let organizationId;

    if (existingOrg) {
      console.log("✓ BLS organization already exists:", existingOrg._id);
      organizationId = existingOrg._id;
    } else {
      // Create Better Living Solutions organization
      console.log("Creating BLS organization...");

      organizationId = await ctx.db.insert("organizations", {
        name: "Better Living Solutions",
        slug: "better-living-solutions",
        plan: "enterprise", // BLS gets enterprise plan as founding customer
        subscriptionStatus: "active",
        maxUsers: 999999, // Unlimited for enterprise
        maxProperties: 999999, // Unlimited for enterprise
        primaryColor: "#0d9488", // Teal-600 brand color
        isActive: true,
        createdAt: Date.now(),
        settings: {
          timezone: "Australia/Sydney",
          currency: "AUD",
          fiscalYearStart: "07-01", // July 1 (Australian financial year)
          complianceRegion: "AU-NSW",
        },
      });

      console.log("✓ Created BLS organization:", organizationId);
    }

    // Backfill all users without an organizationId
    const usersWithoutOrg = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("organizationId"), undefined))
      .collect();

    console.log(`Found ${usersWithoutOrg.length} users without organizationId`);

    let updatedCount = 0;
    for (const user of usersWithoutOrg) {
      await ctx.db.patch(user._id, {
        organizationId,
      });
      updatedCount++;
    }

    console.log(`✓ Updated ${updatedCount} users with BLS organizationId`);

    // Verify all users now have an organizationId
    const usersStillMissing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("organizationId"), undefined))
      .collect();

    if (usersStillMissing.length > 0) {
      throw new Error(
        `Migration incomplete: ${usersStillMissing.length} users still missing organizationId`
      );
    }

    console.log("✓ All users verified with organizationId");

    return {
      success: true,
      organizationId,
      message: `BLS organization ${existingOrg ? "already existed" : "created"}. ${updatedCount} user(s) updated.`,
      stats: {
        organizationCreated: !existingOrg,
        usersUpdated: updatedCount,
        totalUsers: usersWithoutOrg.length + updatedCount,
      },
    };
  },
});

/**
 * Emergency rollback: Remove organizationId from all users
 * USE WITH CAUTION - Only for reverting Sprint 1 migration
 */
export const rollbackOrganizations = mutation({
  args: {
    userId: v.id("users"), // Admin user performing rollback
    confirmPassword: v.string(), // Safety confirmation
  },
  handler: async (ctx, args) => {
    // This is a destructive operation, require explicit confirmation
    if (args.confirmPassword !== "ROLLBACK_ORGANIZATIONS") {
      throw new Error(
        'Safety check failed. To rollback, pass confirmPassword: "ROLLBACK_ORGANIZATIONS"'
      );
    }

    console.log("WARNING: Rolling back organization migration...");

    // Remove organizationId from all users
    const allUsers = await ctx.db.query("users").collect();

    let rollbackCount = 0;
    for (const user of allUsers) {
      if (user.organizationId) {
        await ctx.db.patch(user._id, {
          organizationId: undefined,
        });
        rollbackCount++;
      }
    }

    // Deactivate all organizations
    const allOrgs = await ctx.db.query("organizations").collect();
    for (const org of allOrgs) {
      await ctx.db.patch(org._id, {
        isActive: false,
      });
    }

    console.log(`Rolled back ${rollbackCount} users, deactivated ${allOrgs.length} organizations`);

    return {
      success: true,
      message: `Rollback complete. Removed organizationId from ${rollbackCount} users. Deactivated ${allOrgs.length} organizations.`,
    };
  },
});

/**
 * Verify migration status
 * Check if all users have organizationId and org exists
 */
export const verifyMigration = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const blsOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "better-living-solutions"))
      .first();

    const allUsers = await ctx.db.query("users").collect();
    const usersWithOrg = allUsers.filter((u) => u.organizationId !== undefined);
    const usersWithoutOrg = allUsers.filter((u) => u.organizationId === undefined);

    return {
      blsOrganization: {
        exists: !!blsOrg,
        id: blsOrg?._id,
        name: blsOrg?.name,
        plan: blsOrg?.plan,
      },
      users: {
        total: allUsers.length,
        withOrganization: usersWithOrg.length,
        missingOrganization: usersWithoutOrg.length,
        migrationComplete: usersWithoutOrg.length === 0,
      },
      ready: !!blsOrg && usersWithoutOrg.length === 0,
    };
  },
});
