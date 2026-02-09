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

/**
 * Backfill ALL data tables with BLS organizationId
 *
 * After Sprint 2 migration, all queries use withIndex("by_organizationId") which
 * means pre-existing records without organizationId are invisible to tenant-scoped queries.
 *
 * This mutation finds every record across all tenant-scoped tables that is missing
 * organizationId and patches it with the BLS organization ID.
 *
 * IDEMPOTENT: Skips records that already have organizationId set.
 * NO ARGS: Designed to be called directly from the Convex dashboard CLI.
 *
 * Usage: Run once from the Convex dashboard after deploying Sprint 2 schema.
 */
export const backfillAllTablesOrganizationId = mutation({
  args: {},
  handler: async (ctx) => {
    // Step 1: Look up BLS organization by slug
    const blsOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "better-living-solutions"))
      .first();

    if (!blsOrg) {
      throw new Error(
        "BLS organization not found. Run seedBlsOrganization first."
      );
    }

    const organizationId = blsOrg._id;
    console.log(`Using BLS organizationId: ${organizationId}`);

    // Step 2: Define all tables that need backfilling
    // These are all tables with organizationId field (excluding users, sessions, organizations themselves)
    const tablesToBackfill = [
      "properties",
      "dwellings",
      "participants",
      "participantPlans",
      "payments",
      "claims",
      "maintenanceRequests",
      "maintenancePhotos",
      "maintenanceQuotes",
      "contractors",
      "quoteRequests",
      "incidents",
      "incidentPhotos",
      "incidentActions",
      "documents",
      "alerts",
      "inspections",
      "inspectionItems",
      "inspectionPhotos",
      "inspectionTemplates",
      "preventativeSchedule",
      "communications",
      "threadSummaries",
      "tasks",
      "complaints",
      "complianceCertifications",
      "supportCoordinators",
      "supportCoordinatorParticipants",
      "silProviders",
      "silProviderParticipants",
      "silProviderProperties",
      "silProviderDwellings",
      "occupationalTherapists",
      "otParticipants",
      "owners",
      "bankAccounts",
      "bankTransactions",
      "auditLogs",
      "propertyMedia",
      "aiConversations",
      "aiProcessingQueue",
      "providerSettings",
      "expectedPayments",
      "paymentSchedules",
      "ownerPayments",
      "xeroConnections",
      "insurancePolicies",
      "vacancyListings",
      "leads",
    ] as const;

    // Step 3: Process each table
    const results: Record<string, number> = {};
    let grandTotal = 0;

    for (const tableName of tablesToBackfill) {
      // Collect all records from the table
      // We cannot filter by "organizationId === undefined" with an index,
      // so we fetch all and filter in memory
      const allRecords = await ctx.db
        .query(tableName)
        .collect();

      // Filter to only records missing organizationId (idempotent)
      const recordsToUpdate = allRecords.filter(
        (record: Record<string, unknown>) => record.organizationId === undefined
      );

      // Patch each record with the BLS organizationId
      for (const record of recordsToUpdate) {
        await ctx.db.patch(record._id, {
          organizationId,
        } as Record<string, unknown>);
      }

      results[tableName] = recordsToUpdate.length;
      grandTotal += recordsToUpdate.length;

      if (recordsToUpdate.length > 0) {
        console.log(
          `${tableName}: ${recordsToUpdate.length} records updated`
        );
      } else {
        console.log(`${tableName}: 0 records updated (all already have organizationId)`);
      }
    }

    console.log(`\nBackfill complete. Total records updated: ${grandTotal}`);

    return {
      success: true,
      organizationId,
      organizationName: blsOrg.name,
      grandTotal,
      perTable: results,
    };
  },
});
