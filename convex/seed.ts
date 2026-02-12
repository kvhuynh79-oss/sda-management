import { mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import bcrypt from "bcryptjs";

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
 * Seed a new organization with an admin user.
 * Uses bcrypt for password hashing (requires action context).
 *
 * Usage: npx convex run seed:seedNewOrganization '{"name":"Org Name","slug":"org-slug","email":"admin@org.com","password":"pass","firstName":"First","lastName":"Last"}'
 */
export const seedNewOrganization = action({
  args: {
    name: v.string(),
    slug: v.string(),
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    plan: v.optional(v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise"))),
  },
  handler: async (ctx, args): Promise<{ success: boolean; organizationId: string; userId: string; message: string }> => {
    const passwordHash = await bcrypt.hash(args.password, 12);

    const result = await ctx.runMutation(internal.seed.createOrgWithAdmin, {
      name: args.name,
      slug: args.slug,
      email: args.email.toLowerCase(),
      passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      plan: args.plan || "professional",
    });

    return result;
  },
});

/** Internal mutation for seedNewOrganization (inserts org + user) */
export const createOrgWithAdmin = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    plan: v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise")),
  },
  handler: async (ctx, args) => {
    // Check if org slug already exists
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existingOrg) {
      throw new Error(`Organization with slug "${args.slug}" already exists`);
    }

    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error(`User with email "${args.email}" already exists`);
    }

    const planLimits = {
      starter: { maxUsers: 5, maxProperties: 50 },
      professional: { maxUsers: 20, maxProperties: 200 },
      enterprise: { maxUsers: 999999, maxProperties: 999999 },
    };

    const limits = planLimits[args.plan];
    const now = Date.now();

    // Create organization
    const organizationId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      plan: args.plan,
      subscriptionStatus: "active",
      maxUsers: limits.maxUsers,
      maxProperties: limits.maxProperties,
      primaryColor: "#0d9488",
      isActive: true,
      createdAt: now,
      settings: {
        timezone: "Australia/Sydney",
        currency: "AUD",
        fiscalYearStart: "07-01",
        complianceRegion: "AU-NSW",
      },
    });

    // Create admin user linked to the org
    const userId = await ctx.db.insert("users", {
      email: args.email,
      passwordHash: args.passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      role: "admin",
      organizationId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      organizationId: organizationId as string,
      userId: userId as string,
      message: `Created org "${args.name}" with admin user ${args.email}`,
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
 * One-off: Set Postmark hash address for BLS org.
 * No args needed - finds BLS by slug and patches directly.
 */
export const setBlsPostmarkHash = mutation({
  args: {},
  handler: async (ctx) => {
    const blsOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "better-living-solutions"))
      .first();
    if (!blsOrg) throw new Error("BLS org not found");
    await ctx.db.patch(blsOrg._id, {
      postmarkHashAddress: "d303a05b1210f59df8afd11b3059b067@inbound.postmarkapp.com",
    });
    return { success: true, orgId: blsOrg._id };
  },
});

/**
 * Diagnostic: List all organizations and users with their org assignments.
 * Helps debug tenant isolation issues.
 */
export const diagnoseOrgs = mutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    const users = await ctx.db.query("users").collect();

    return {
      organizations: orgs.map((o) => ({
        id: o._id,
        name: o.name,
        slug: o.slug,
        plan: o.plan,
        isActive: o.isActive,
        inboundEmailEnabled: o.inboundEmailEnabled,
        inboundEmailAddress: o.inboundEmailAddress,
      })),
      users: users.map((u) => ({
        id: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        organizationId: u.organizationId,
        isActive: u.isActive,
      })),
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
