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

/**
 * Seed all 40 AAH policies into the database.
 * Creates policy records (metadata only - documents uploaded via UI).
 *
 * Usage: npx convex run seed:seedAahPolicies '{}'
 * IDEMPOTENT: Skips if AAH already has policies.
 */
export const seedAahPolicies = mutation({
  args: {},
  handler: async (ctx) => {
    // Find AAH organization by name or slug
    const allOrgs = await ctx.db.query("organizations").collect();
    const aahOrg = allOrgs.find((o) =>
      o.name?.toLowerCase().includes("achieve") ||
      o.slug?.toLowerCase().includes("aah") ||
      o.slug?.toLowerCase().includes("achieve")
    );

    if (!aahOrg) {
      throw new Error(
        "AAH organization not found. Create it first with seedNewOrganization."
      );
    }

    const organizationId = aahOrg._id;

    // Check if AAH already has policies
    const existing = await ctx.db
      .query("policies")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    if (existing.length > 0) {
      return {
        success: true,
        message: `AAH already has ${existing.length} policies. Skipping seed.`,
        created: 0,
      };
    }

    // Find an admin user for this org to use as createdBy
    const orgUsers = await ctx.db
      .query("users")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const adminUser = orgUsers.find((u) => u.role === "admin") || orgUsers[0];
    if (!adminUser) {
      throw new Error("No users found for AAH organization. Create an admin user first.");
    }

    const now = Date.now();
    const effectiveDate = "2026-02-14";

    // All 40 AAH policies
    const policies = [
    // SDA Tenancy Management (14)
    { title: "AAH-SDA-01 Glossary of Terms", description: "Standard glossary of SDA and NDIS terminology used across all Achieve Ability Housing policies and procedures.", category: "SDA Tenancy Management", fileName: "AAH-SDA-01_Glossary_of_Terms.docx" },
    { title: "AAH-SDA-02 Introduction to AAH Tenant Services", description: "Overview of Achieve Ability Housing tenant and housing services, including SDA categories and support frameworks.", category: "SDA Tenancy Management", fileName: "AAH-SDA-02_Introduction_to_AAH_Tenant_Services.docx" },
    { title: "AAH-SDA-03 Vacancy Management", description: "Procedures for managing SDA dwelling vacancies, waitlist management, and tenant matching.", category: "SDA Tenancy Management", fileName: "AAH-SDA-03_Vacancy_Management.docx" },
    { title: "AAH-SDA-04 Rent", description: "Policy governing SDA rent calculations, Reasonable Rent Contribution (RRC), and payment procedures.", category: "SDA Tenancy Management", fileName: "AAH-SDA-04_Rent.docx" },
    { title: "AAH-SDA-05 Appeals", description: "Formal appeals process for tenant decisions, including review timelines and escalation pathways.", category: "SDA Tenancy Management", fileName: "AAH-SDA-05_Appeals.docx" },
    { title: "AAH-SDA-06 Rental Bonds", description: "Procedures for managing rental bonds in SDA properties, including collection, lodgement, and return.", category: "SDA Tenancy Management", fileName: "AAH-SDA-06_Rental_Bonds.docx" },
    { title: "AAH-SDA-07 Establishing Tenancies", description: "Step-by-step process for establishing new SDA tenancies, from initial assessment to move-in.", category: "SDA Tenancy Management", fileName: "AAH-SDA-07_Establishing_Tenancies.docx" },
    { title: "AAH-SDA-08 Visitors and Occupants", description: "Policy on visitors and additional occupants in SDA dwellings, including overnight stays and extended visits.", category: "SDA Tenancy Management", fileName: "AAH-SDA-08_Visitors_and_Occupants.docx" },
    { title: "AAH-SDA-09 Deceased Tenant", description: "Sensitive procedures for managing tenancy when a tenant passes away, including family liaison and property handover.", category: "SDA Tenancy Management", fileName: "AAH-SDA-09_Deceased_Tenant.docx" },
    { title: "AAH-SDA-10 Tenant Absences", description: "Policy for managing extended tenant absences from SDA dwellings, including notification requirements.", category: "SDA Tenancy Management", fileName: "AAH-SDA-10_Tenant_Absences.docx" },
    { title: "AAH-SDA-11 Tenant Transfers", description: "Procedures for tenant transfers between SDA properties, including assessment criteria and transition planning.", category: "SDA Tenancy Management", fileName: "AAH-SDA-11_Tenant_Transfers.docx" },
    { title: "AAH-SDA-12 Entry to Property", description: "Policy governing entry to SDA properties, including notice periods and emergency access protocols.", category: "SDA Tenancy Management", fileName: "AAH-SDA-12_Entry_to_Property.docx" },
    { title: "AAH-SDA-13 Keys and Access", description: "Management of keys, access codes, and security systems for SDA dwellings.", category: "SDA Tenancy Management", fileName: "AAH-SDA-13_Keys_and_Access.docx" },
    { title: "AAH-SDA-14 Debt Recovery", description: "Procedures for managing rent arrears and debt recovery in SDA tenancies, compliant with NSW tenancy law.", category: "SDA Tenancy Management", fileName: "AAH-SDA-14_Debt_Recovery.docx" },

    // Tenant Rights & Engagement (5)
    { title: "AAH-SDA-15 Complaints, Disputes and Nuisance", description: "Comprehensive complaints and disputes resolution procedures aligned with NDIS Practice Standards.", category: "Tenant Rights & Engagement", fileName: "AAH-SDA-15_Complaints_Disputes_Nuisance.docx" },
    { title: "AAH-SDA-19 Tenancy Succession", description: "Policy for tenancy succession in SDA dwellings when a tenant can no longer maintain their tenancy.", category: "Tenant Rights & Engagement", fileName: "AAH-SDA-19_Tenancy_Succession.docx" },
    { title: "AAH-SDA-24 Tenant Engagement", description: "Framework for meaningful tenant engagement, consultation, and participation in decision-making.", category: "Tenant Rights & Engagement", fileName: "AAH-SDA-24_Tenant_Engagement.docx" },
    { title: "AAH-SDA-27 Tenant Rights and Responsibilities", description: "Statement of tenant rights and responsibilities in SDA dwellings under the Residential Tenancies Act.", category: "Tenant Rights & Engagement", fileName: "AAH-SDA-27_Tenant_Rights_and_Responsibilities.docx" },
    { title: "AAH-SDA-28 Your Guide to SDA", description: "Accessible guide explaining Specialist Disability Accommodation to prospective and current tenants.", category: "Tenant Rights & Engagement", fileName: "AAH-SDA-28_Your_Guide_to_SDA.docx" },

    // SDA Property Management (7)
    { title: "AAH-SDA-16 Property Modifications", description: "Policy for managing property modifications in SDA dwellings, including approval processes and compliance.", category: "SDA Property Management", fileName: "AAH-SDA-16_Property_Modifications.docx" },
    { title: "AAH-SDA-17 Repair Charges", description: "Framework for assessing and charging tenants for property damage beyond fair wear and tear.", category: "SDA Property Management", fileName: "AAH-SDA-17_Repair_Charges.docx" },
    { title: "AAH-SDA-18 Water Charges", description: "Policy for water usage charges in SDA properties, including calculation methods and billing.", category: "SDA Property Management", fileName: "AAH-SDA-18_Water_Charges.docx" },
    { title: "AAH-SDA-20 Outdoor Living Environments", description: "Standards for maintaining outdoor living areas in SDA properties, including gardens and communal spaces.", category: "SDA Property Management", fileName: "AAH-SDA-20_Outdoor_Living.docx" },
    { title: "AAH-SDA-21 Dwelling Safety", description: "Safety standards and procedures for SDA dwellings, including fire safety and hazard management.", category: "SDA Property Management", fileName: "AAH-SDA-21_Dwelling_Safety.docx" },
    { title: "AAH-SDA-22 Preventative Maintenance", description: "Scheduled maintenance program for SDA properties to ensure ongoing safety and quality.", category: "SDA Property Management", fileName: "AAH-SDA-22_Preventative_Maintenance.docx" },
    { title: "AAH-SDA-23 Reactive Maintenance", description: "Procedures for responding to maintenance requests in SDA properties, including emergency repairs.", category: "SDA Property Management", fileName: "AAH-SDA-23_Reactive_Maintenance.docx" },

    // SDA Operations (3)
    { title: "AAH-SDA-25 Working with Providers", description: "Framework for collaboration between Achieve Ability Housing and SIL/support providers.", category: "SDA Operations", fileName: "AAH-SDA-25_Working_with_Providers.docx" },
    { title: "AAH-SDA-26 Community Engagement", description: "Strategies for community engagement and social inclusion for SDA tenants.", category: "SDA Operations", fileName: "AAH-SDA-26_Community_Engagement.docx" },
    { title: "AAH-SDA-30 Conflict of Interest", description: "Policy for identifying, declaring, and managing conflicts of interest in SDA operations.", category: "SDA Operations", fileName: "AAH-SDA-30_Conflict_of_Interest.docx" },

    // NDIS Practice Standards (6)
    { title: "AAH-NDIS-01 Privacy and Dignity", description: "Framework for protecting and upholding the privacy, confidentiality, and dignity of NDIS participants in SDA.", category: "NDIS Practice Standards", fileName: "AAH-NDIS-01_Privacy_and_Dignity.docx" },
    { title: "AAH-NDIS-02 Freedom from Abuse and Neglect", description: "Policy ensuring all participants are free from abuse, neglect, violence, and exploitation.", category: "NDIS Practice Standards", fileName: "AAH-NDIS-02_Freedom_from_Abuse_and_Neglect.docx" },
    { title: "AAH-NDIS-03 Independence and Informed Choice", description: "Supporting participant independence, informed choice, and decision-making in all aspects of SDA.", category: "NDIS Practice Standards", fileName: "AAH-NDIS-03_Independence_and_Informed_Choice.docx" },
    { title: "AAH-NDIS-04 Individual Values and Beliefs", description: "Respecting and supporting individual values, beliefs, cultural identity, and personal preferences.", category: "NDIS Practice Standards", fileName: "AAH-NDIS-04_Individual_Values_and_Beliefs.docx" },
    { title: "AAH-NDIS-05 VANE Policy", description: "Violence, Abuse, Neglect, and Exploitation prevention policy with mandatory reporting requirements.", category: "NDIS Practice Standards", fileName: "AAH-NDIS-05_VANE_Policy.docx" },
    { title: "AAH-NDIS-06 Positive Behaviour Support", description: "Positive behaviour support framework aligned with NDIS Practice Standards and Quality Indicators.", category: "NDIS Practice Standards", fileName: "AAH-NDIS-06_Positive_Behaviour_Support.docx" },

    // Agreements & Templates (2)
    { title: "AAH-AGR-01 SDA Tenancy Agreement", description: "Standard tenancy agreement template for Specialist Disability Accommodation, compliant with the Residential Tenancies Act 2010 and NDIS requirements.", category: "Agreements & Templates", fileName: "AAH-AGR-01_SDA_Tenancy_Agreement.docx" },
    { title: "AAH-AGR-02 SIL Provider Memorandum of Understanding", description: "Memorandum of Understanding template for formalising the relationship between AAH as SDA provider and Supported Independent Living (SIL) providers.", category: "Agreements & Templates", fileName: "AAH-AGR-02_SIL_Provider_MOU.docx" },

    // Reference (3)
    { title: "AAH-AGR-03 SDA Provider Responsibilities", description: "Reference document outlining the registered SDA provider responsibilities including property standards, tenant rights, NDIS compliance, and reporting obligations.", category: "Reference", fileName: "AAH-AGR-03_SDA_Provider_Responsibilities.docx" },
    { title: "AAH-REF-01 Tenant Handbook", description: "Comprehensive tenant handbook covering all aspects of living in an Achieve Ability Housing SDA dwelling.", category: "Reference", fileName: "AAH-REF-01_Tenant_Handbook.docx" },
    { title: "AAH Master Policy Manual Review Notes", description: "Internal review notes for the Achieve Ability Housing policy manual, tracking updates and revisions.", category: "Reference", fileName: "AAH_Master_Policy_Manual_Review_Notes.docx" },
    ];

    let created = 0;
    for (const policy of policies) {
      await ctx.db.insert("policies", {
        organizationId,
        title: policy.title,
        description: policy.description,
        category: policy.category,
        documentFileName: policy.fileName,
        version: "2.0",
        effectiveDate,
        status: "active" as const,
        isActive: true,
        createdBy: adminUser._id,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    console.log(`Created ${created} policies for AAH`);
    return {
      success: true,
      message: `Created ${created} policies for AAH organization`,
      created,
      organizationId,
    };
  },
});

/**
 * Attach a document file to an existing policy record.
 * Used by the upload script after uploading .docx files to storage.
 *
 * Internal mutation - no auth check.
 */
export const attachDocumentToPolicy = internalMutation({
  args: {
    policyId: v.id("policies"),
    documentStorageId: v.id("_storage"),
    documentFileName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.policyId, {
      documentStorageId: args.documentStorageId,
      documentFileName: args.documentFileName,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Seed a complete demo organization with realistic data for marketing screenshots.
 *
 * Creates "Horizon SDA Group" with properties, dwellings, participants, owners,
 * maintenance requests, incidents, contractors, communications, tasks, complaints,
 * compliance certifications, calendar events, and alerts.
 *
 * IDEMPOTENT: Checks if "horizon-sda-group" slug already exists and skips if so.
 * INTERNAL: No auth check needed - call from Convex dashboard.
 *
 * Usage: npx convex run seed:seedDemoOrg '{}'
 */
export const seedDemoOrg = internalMutation({
  args: {},
  handler: async (ctx) => {
    // --- Idempotency check ---
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "horizon-sda-group"))
      .first();
    if (existing) {
      return { success: true, skipped: true, message: "Horizon SDA Group already exists", organizationId: existing._id };
    }

    const now = Date.now();
    const passwordHash = bcrypt.hashSync("Demo2026!", 12);

    // ========== 1. Organization ==========
    const orgId = await ctx.db.insert("organizations", {
      name: "Horizon SDA Group",
      slug: "horizon-sda-group",
      plan: "professional",
      subscriptionStatus: "active",
      maxUsers: 20,
      maxProperties: 200,
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

    // ========== 2. Admin User ==========
    const adminId = await ctx.db.insert("users", {
      email: "demo@horizonsda.com.au",
      passwordHash,
      firstName: "Alex",
      lastName: "Morgan",
      role: "admin",
      organizationId: orgId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // ========== 3. Owners ==========
    const owner1 = await ctx.db.insert("owners", {
      organizationId: orgId, ownerType: "trust", companyName: "Banksia Property Trust",
      email: "admin@banksiatrust.com.au", phone: "0400111222",
      address: "Level 4, 200 George St, Sydney NSW 2000", state: "NSW", abn: "51623847190",
      bankBsb: "062-000", bankAccountNumber: "1234 5678", bankAccountName: "Banksia Property Trust",
      isActive: true, createdAt: now, updatedAt: now,
    });
    const owner2 = await ctx.db.insert("owners", {
      organizationId: orgId, ownerType: "company", companyName: "Torres Investment Group",
      email: "invest@torresgroup.com.au", phone: "0400333444",
      address: "Suite 12, 88 Collins St, Melbourne VIC 3000", state: "VIC", abn: "34879201536",
      bankBsb: "033-010", bankAccountNumber: "9876 5432", bankAccountName: "Torres Investment Group Pty Ltd",
      isActive: true, createdAt: now, updatedAt: now,
    });
    const owner3 = await ctx.db.insert("owners", {
      organizationId: orgId, ownerType: "trust", companyName: "Chen Family Holdings",
      email: "holdings@chenfamily.com.au", phone: "0400555666",
      address: "PO Box 340, Parramatta NSW 2150", state: "NSW", abn: "90412765803",
      bankBsb: "082-140", bankAccountNumber: "5566 7788", bankAccountName: "Chen Family Holdings Trust",
      isActive: true, createdAt: now, updatedAt: now,
    });

    // ========== 4. Properties ==========
    const prop1 = await ctx.db.insert("properties", {
      organizationId: orgId, addressLine1: "42 Banksia Drive", suburb: "Parramatta", state: "NSW", postcode: "2150",
      propertyStatus: "active", ownerId: owner1, ownershipType: "investor",
      managementFeePercent: 10, isActive: true, createdAt: now, updatedAt: now,
    });
    const prop2 = await ctx.db.insert("properties", {
      organizationId: orgId, addressLine1: "15 Waratah Circuit", suburb: "Epping", state: "VIC", postcode: "3076",
      propertyStatus: "active", ownerId: owner2, ownershipType: "investor",
      managementFeePercent: 12, isActive: true, createdAt: now, updatedAt: now,
    });
    const prop3 = await ctx.db.insert("properties", {
      organizationId: orgId, addressLine1: "88 Eucalyptus Lane", suburb: "Toowoomba", state: "QLD", postcode: "4350",
      propertyStatus: "active", ownerId: owner3, ownershipType: "investor",
      managementFeePercent: 10, isActive: true, createdAt: now, updatedAt: now,
    });
    const prop4 = await ctx.db.insert("properties", {
      organizationId: orgId, addressLine1: "7 Grevillea Close", suburb: "Penrith", state: "NSW", postcode: "2750",
      propertyStatus: "under_construction", expectedCompletionDate: "2026-06-30",
      ownerId: owner1, ownershipType: "investor", isActive: true, createdAt: now, updatedAt: now,
    });
    const prop5 = await ctx.db.insert("properties", {
      organizationId: orgId, addressLine1: "120 Wattle Street", suburb: "Geelong", state: "VIC", postcode: "3220",
      propertyStatus: "active", ownerId: owner2, ownershipType: "investor",
      managementFeePercent: 11, isActive: true, createdAt: now, updatedAt: now,
    });

    // ========== 5. Dwellings (2-3 per property) ==========
    // Property 1 - Parramatta (HPS)
    const dw1a = await ctx.db.insert("dwellings", {
      organizationId: orgId, propertyId: prop1, dwellingName: "Unit 1", dwellingType: "unit",
      bedrooms: 2, bathrooms: 1, sdaDesignCategory: "high_physical_support", sdaBuildingType: "new_build",
      maxParticipants: 2, currentOccupancy: 2, occupancyStatus: "fully_occupied",
      sdaRegisteredAmount: 79620, isActive: true, createdAt: now, updatedAt: now,
    });
    const dw1b = await ctx.db.insert("dwellings", {
      organizationId: orgId, propertyId: prop1, dwellingName: "Unit 2", dwellingType: "unit",
      bedrooms: 2, bathrooms: 1, sdaDesignCategory: "high_physical_support", sdaBuildingType: "new_build",
      maxParticipants: 2, currentOccupancy: 1, occupancyStatus: "partially_occupied",
      sdaRegisteredAmount: 79620, isActive: true, createdAt: now, updatedAt: now,
    });
    // Property 2 - Epping (Fully Accessible)
    const dw2a = await ctx.db.insert("dwellings", {
      organizationId: orgId, propertyId: prop2, dwellingName: "Villa A", dwellingType: "villa",
      bedrooms: 3, bathrooms: 2, sdaDesignCategory: "fully_accessible", sdaBuildingType: "new_build",
      maxParticipants: 2, currentOccupancy: 2, occupancyStatus: "fully_occupied",
      sdaRegisteredAmount: 52530, isActive: true, createdAt: now, updatedAt: now,
    });
    const dw2b = await ctx.db.insert("dwellings", {
      organizationId: orgId, propertyId: prop2, dwellingName: "Villa B", dwellingType: "villa",
      bedrooms: 3, bathrooms: 2, sdaDesignCategory: "fully_accessible", sdaBuildingType: "new_build",
      maxParticipants: 2, currentOccupancy: 0, occupancyStatus: "vacant",
      sdaRegisteredAmount: 52530, isActive: true, createdAt: now, updatedAt: now,
    });
    // Property 3 - Toowoomba (Robust)
    const dw3a = await ctx.db.insert("dwellings", {
      organizationId: orgId, propertyId: prop3, dwellingName: "House 1", dwellingType: "house",
      bedrooms: 4, bathrooms: 2, sdaDesignCategory: "robust", sdaBuildingType: "existing",
      maxParticipants: 2, currentOccupancy: 1, occupancyStatus: "partially_occupied",
      sdaRegisteredAmount: 41460, isActive: true, createdAt: now, updatedAt: now,
    });
    const dw3b = await ctx.db.insert("dwellings", {
      organizationId: orgId, propertyId: prop3, dwellingName: "House 2", dwellingType: "house",
      bedrooms: 3, bathrooms: 1, sdaDesignCategory: "robust", sdaBuildingType: "existing",
      maxParticipants: 2, currentOccupancy: 2, occupancyStatus: "fully_occupied",
      sdaRegisteredAmount: 41460, isActive: true, createdAt: now, updatedAt: now,
    });
    const dw3c = await ctx.db.insert("dwellings", {
      organizationId: orgId, propertyId: prop3, dwellingName: "House 3", dwellingType: "house",
      bedrooms: 3, bathrooms: 1, sdaDesignCategory: "robust", sdaBuildingType: "existing",
      maxParticipants: 2, currentOccupancy: 0, occupancyStatus: "vacant",
      sdaRegisteredAmount: 41460, isActive: true, createdAt: now, updatedAt: now,
    });
    // Property 4 - Penrith (under construction, no dwellings yet)
    const dw4a = await ctx.db.insert("dwellings", {
      organizationId: orgId, propertyId: prop4, dwellingName: "Apartment 1", dwellingType: "apartment",
      bedrooms: 2, bathrooms: 1, sdaDesignCategory: "high_physical_support", sdaBuildingType: "new_build",
      maxParticipants: 2, currentOccupancy: 0, occupancyStatus: "vacant",
      isActive: true, createdAt: now, updatedAt: now,
    });
    const dw4b = await ctx.db.insert("dwellings", {
      organizationId: orgId, propertyId: prop4, dwellingName: "Apartment 2", dwellingType: "apartment",
      bedrooms: 2, bathrooms: 1, sdaDesignCategory: "high_physical_support", sdaBuildingType: "new_build",
      maxParticipants: 2, currentOccupancy: 0, occupancyStatus: "vacant",
      isActive: true, createdAt: now, updatedAt: now,
    });
    // Property 5 - Geelong (Improved Liveability)
    const dw5a = await ctx.db.insert("dwellings", {
      organizationId: orgId, propertyId: prop5, dwellingName: "Unit A", dwellingType: "unit",
      bedrooms: 2, bathrooms: 1, sdaDesignCategory: "improved_liveability", sdaBuildingType: "new_build",
      maxParticipants: 1, currentOccupancy: 1, occupancyStatus: "fully_occupied",
      sdaRegisteredAmount: 28940, isActive: true, createdAt: now, updatedAt: now,
    });
    const dw5b = await ctx.db.insert("dwellings", {
      organizationId: orgId, propertyId: prop5, dwellingName: "Unit B", dwellingType: "unit",
      bedrooms: 1, bathrooms: 1, sdaDesignCategory: "improved_liveability", sdaBuildingType: "new_build",
      maxParticipants: 1, currentOccupancy: 1, occupancyStatus: "fully_occupied",
      sdaRegisteredAmount: 28940, isActive: true, createdAt: now, updatedAt: now,
    });

    // ========== 6. Participants ==========
    const pSarah = await ctx.db.insert("participants", {
      organizationId: orgId, ndisNumber: "430-182-735", firstName: "Sarah", lastName: "Chen",
      dateOfBirth: "1988-03-15", email: "sarah.chen@email.com", phone: "0412345678",
      dwellingId: dw1a, moveInDate: "2025-03-01", status: "active",
      emergencyContactName: "Wei Chen", emergencyContactPhone: "0498765432", emergencyContactRelation: "Father",
      consentStatus: "active", consentDate: "2025-02-20", consentExpiryDate: "2026-02-20",
      createdAt: now, updatedAt: now,
    });
    const pMichael = await ctx.db.insert("participants", {
      organizationId: orgId, ndisNumber: "430-294-618", firstName: "Michael", lastName: "Torres",
      dateOfBirth: "1975-11-22", email: "m.torres@email.com", phone: "0423456789",
      dwellingId: dw1a, moveInDate: "2025-04-15", status: "active",
      emergencyContactName: "Rosa Torres", emergencyContactPhone: "0487654321", emergencyContactRelation: "Sister",
      consentStatus: "active", consentDate: "2025-04-10", consentExpiryDate: "2026-04-10",
      createdAt: now, updatedAt: now,
    });
    const pPriya = await ctx.db.insert("participants", {
      organizationId: orgId, ndisNumber: "430-371-502", firstName: "Priya", lastName: "Sharma",
      dateOfBirth: "1992-07-08", email: "priya.sharma@email.com", phone: "0434567890",
      dwellingId: dw2a, moveInDate: "2025-06-01", status: "active",
      emergencyContactName: "Raj Sharma", emergencyContactPhone: "0476543210", emergencyContactRelation: "Brother",
      consentStatus: "active", consentDate: "2025-05-25", consentExpiryDate: "2026-05-25",
      createdAt: now, updatedAt: now,
    });
    const pJames = await ctx.db.insert("participants", {
      organizationId: orgId, ndisNumber: "430-483-926", firstName: "James", lastName: "O'Brien",
      dateOfBirth: "1980-01-30", phone: "0445678901",
      dwellingId: dw2a, moveInDate: "2025-07-10", status: "active",
      emergencyContactName: "Mary O'Brien", emergencyContactPhone: "0465432109", emergencyContactRelation: "Mother",
      createdAt: now, updatedAt: now,
    });
    const pAisha = await ctx.db.insert("participants", {
      organizationId: orgId, ndisNumber: "430-519-847", firstName: "Aisha", lastName: "Hassan",
      dateOfBirth: "1995-09-12", email: "aisha.hassan@email.com", phone: "0456789012",
      dwellingId: dw3a, moveInDate: "2025-08-20", status: "active",
      consentStatus: "active", consentDate: "2025-08-15", consentExpiryDate: "2026-08-15",
      createdAt: now, updatedAt: now,
    });
    const pDaniel = await ctx.db.insert("participants", {
      organizationId: orgId, ndisNumber: "430-607-391", firstName: "Daniel", lastName: "Kim",
      dateOfBirth: "1987-05-04", email: "daniel.kim@email.com", phone: "0467890123",
      dwellingId: dw3b, moveInDate: "2025-02-01", status: "active",
      consentStatus: "expired", consentDate: "2024-12-01", consentExpiryDate: "2025-12-01",
      createdAt: now, updatedAt: now,
    });
    const pEmma = await ctx.db.insert("participants", {
      organizationId: orgId, ndisNumber: "", firstName: "Emma", lastName: "Wilson",
      status: "incomplete", createdAt: now, updatedAt: now,
    });
    const pLiam = await ctx.db.insert("participants", {
      organizationId: orgId, ndisNumber: "430-742-158", firstName: "Liam", lastName: "Nguyen",
      dateOfBirth: "1990-12-18", dwellingId: dw5a, moveInDate: "2025-01-15",
      status: "archived", moveOutDate: "2025-11-30",
      createdAt: now, updatedAt: now,
    });

    // ========== 7. Contractors ==========
    const cont1 = await ctx.db.insert("contractors", {
      organizationId: orgId, companyName: "Reliable Plumbing Solutions", contactName: "Steve Parker",
      email: "jobs@reliableplumbing.com.au", phone: "0290001111", specialty: "plumbing",
      licenseNumber: "PL-NSW-284619", insuranceExpiry: "2027-03-15",
      suburb: "Parramatta", state: "NSW", postcode: "2150",
      rating: 5, totalJobsCompleted: 42, isActive: true, createdAt: now, updatedAt: now,
    });
    const cont2 = await ctx.db.insert("contractors", {
      organizationId: orgId, companyName: "Spark Electrical Services", contactName: "Lisa Tran",
      email: "service@sparkelectrical.com.au", phone: "0290002222", specialty: "electrical",
      licenseNumber: "EL-NSW-517382", insuranceExpiry: "2026-11-30",
      suburb: "Epping", state: "NSW", postcode: "2121",
      rating: 4, totalJobsCompleted: 28, isActive: true, createdAt: now, updatedAt: now,
    });
    const cont3 = await ctx.db.insert("contractors", {
      organizationId: orgId, companyName: "GreenScape Property Maintenance", contactName: "Tom Bradley",
      email: "info@greenscapemaint.com.au", phone: "0290003333", specialty: "general",
      secondarySpecialties: ["grounds", "building"],
      insuranceExpiry: "2026-08-20", suburb: "Penrith", state: "NSW", postcode: "2750",
      rating: 4, totalJobsCompleted: 15, isActive: true, createdAt: now, updatedAt: now,
    });

    // ========== 8. Maintenance Requests ==========
    const mrData = [
      { dwId: dw1a, type: "reactive" as const, cat: "plumbing" as const, pri: "urgent" as const, title: "Burst pipe in bathroom", desc: "Water leaking from pipe joint under bathroom sink. Causing floor damage.", status: "in_progress" as const, reported: "2026-02-10", contId: cont1, quoted: 850 },
      { dwId: dw1b, type: "reactive" as const, cat: "electrical" as const, pri: "urgent" as const, title: "Power outage in bedroom", desc: "Circuit breaker tripping repeatedly. No power to master bedroom outlets.", status: "reported" as const, reported: "2026-02-13" },
      { dwId: dw2a, type: "reactive" as const, cat: "appliances" as const, pri: "high" as const, title: "Oven not heating", desc: "Electric oven display works but heating element non-functional.", status: "awaiting_quotes" as const, reported: "2026-02-08" },
      { dwId: dw2a, type: "reactive" as const, cat: "building" as const, pri: "high" as const, title: "Window seal deterioration", desc: "Rubber seals around living room window degraded. Rain leaking in during storms.", status: "quoted" as const, reported: "2026-02-05", quoted: 1200 },
      { dwId: dw3a, type: "reactive" as const, cat: "safety" as const, pri: "high" as const, title: "Smoke detector battery low", desc: "Smoke detector in hallway chirping. Battery replacement needed.", status: "completed" as const, reported: "2026-01-28", completed: "2026-02-01" },
      { dwId: dw3b, type: "reactive" as const, cat: "plumbing" as const, pri: "medium" as const, title: "Slow draining kitchen sink", desc: "Kitchen sink draining very slowly. Possible blocked drain.", status: "in_progress" as const, reported: "2026-02-06", contId: cont1, quoted: 350 },
      { dwId: dw3b, type: "reactive" as const, cat: "grounds" as const, pri: "medium" as const, title: "Garden path uneven pavers", desc: "Several pavers along main garden path have become uneven creating trip hazard.", status: "awaiting_quotes" as const, reported: "2026-02-09" },
      { dwId: dw5a, type: "reactive" as const, cat: "building" as const, pri: "medium" as const, title: "Cracked tile in bathroom", desc: "One floor tile cracked near shower entry. Sharp edge exposed.", status: "reported" as const, reported: "2026-02-12" },
      { dwId: dw5b, type: "preventative" as const, cat: "safety" as const, pri: "low" as const, title: "Annual fire extinguisher service", desc: "Scheduled annual inspection and service of all fire extinguishers.", status: "scheduled" as const, reported: "2026-01-15", scheduled: "2026-03-01" },
      { dwId: dw1a, type: "preventative" as const, cat: "general" as const, pri: "low" as const, title: "HVAC filter replacement", desc: "Quarterly air conditioning filter replacement.", status: "completed" as const, reported: "2026-01-20", completed: "2026-01-25" },
    ];
    for (const mr of mrData) {
      await ctx.db.insert("maintenanceRequests", {
        organizationId: orgId, dwellingId: mr.dwId, requestType: mr.type, category: mr.cat,
        priority: mr.pri, title: mr.title, description: mr.desc, reportedDate: mr.reported,
        status: mr.status, scheduledDate: mr.scheduled, completedDate: mr.completed,
        assignedContractorId: mr.contId, quotedAmount: mr.quoted,
        createdBy: adminId, createdAt: now, updatedAt: now,
      });
    }

    // ========== 9. Incidents ==========
    const inc1 = await ctx.db.insert("incidents", {
      organizationId: orgId, propertyId: prop1, dwellingId: dw1a, participantId: pSarah,
      incidentType: "serious_injury", severity: "critical", title: "Fall requiring emergency treatment",
      description: "Participant fell in bathroom on wet floor. Ambulance called. Treated at Westmead Hospital for fractured wrist.",
      incidentDate: "2026-02-12", incidentTime: "08:30", location: "Bathroom",
      witnessNames: "Michael Torres (co-resident)", immediateActionTaken: "Called 000. Applied ice. Accompanied to hospital.",
      isNdisReportable: true, ndisNotificationTimeframe: "24_hours",
      ndisNotificationDueDate: "2026-02-13", followUpRequired: true,
      followUpNotes: "Follow up with hospital on discharge plan. Review bathroom safety.",
      status: "under_investigation", reportedBy: adminId, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("incidents", {
      organizationId: orgId, propertyId: prop2, dwellingId: dw2a, participantId: pPriya,
      incidentType: "property_damage", severity: "major", title: "Flooring water damage from dishwasher leak",
      description: "Dishwasher supply hose burst overnight causing significant water damage to kitchen and living room flooring.",
      incidentDate: "2026-02-08", incidentTime: "06:00", location: "Kitchen",
      immediateActionTaken: "Water supply shut off. Emergency plumber called. Fans set up for drying.",
      followUpRequired: true, followUpNotes: "Insurance claim lodged. Flooring replacement quote needed.",
      status: "under_investigation", reportedBy: adminId, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("incidents", {
      organizationId: orgId, propertyId: prop3, dwellingId: dw3a, participantId: pAisha,
      incidentType: "behavioral", severity: "moderate", title: "Verbal altercation between residents",
      description: "Verbal disagreement between participant and visiting guest escalated. No physical contact. SIL staff de-escalated.",
      incidentDate: "2026-02-06", incidentTime: "19:15", location: "Common area",
      immediateActionTaken: "SIL staff intervened and separated parties. Guest asked to leave.",
      followUpRequired: true, status: "reported", reportedBy: adminId, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("incidents", {
      organizationId: orgId, propertyId: prop3, dwellingId: dw3b, participantId: pDaniel,
      incidentType: "near_miss", severity: "moderate", title: "Loose handrail on ramp",
      description: "Participant grabbed handrail on front ramp and it moved. Participant did not fall but could have.",
      incidentDate: "2026-02-03", incidentTime: "10:00", location: "Front ramp",
      immediateActionTaken: "Area cordoned off. Temporary support installed.",
      followUpRequired: true, status: "reported", reportedBy: adminId, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("incidents", {
      organizationId: orgId, propertyId: prop5, dwellingId: dw5a,
      incidentType: "injury", severity: "minor", title: "Minor cut from broken glass",
      description: "Participant accidentally knocked glass off kitchen bench. Small cut on finger from picking up pieces.",
      incidentDate: "2026-01-20", incidentTime: "12:30", location: "Kitchen",
      immediateActionTaken: "First aid applied. Area cleaned.",
      followUpRequired: false, status: "resolved", reportedBy: adminId,
      resolvedBy: adminId, resolvedAt: now, resolutionNotes: "Minor incident. First aid sufficient. No further action needed.",
      createdAt: now, updatedAt: now,
    });

    // ========== 10. Communications ==========
    const threadA = "thread-sc-plan-review";
    const threadB = "thread-sil-handover";
    const threadC = "thread-ndia-funding";
    const comms = [
      { type: "email" as const, dir: "sent" as const, date: "2026-02-01", contact: "support_coordinator" as const, name: "Jennifer Walsh", email: "j.walsh@scnetwork.com.au", subject: "Plan Review - Sarah Chen", summary: "Sent plan review documentation ahead of scheduled NDIS plan review meeting for Sarah Chen on 15 Feb.", threadId: threadA, isStarter: true, compliance: "plan_review" as const },
      { type: "email" as const, dir: "received" as const, date: "2026-02-03", contact: "support_coordinator" as const, name: "Jennifer Walsh", email: "j.walsh@scnetwork.com.au", subject: "RE: Plan Review - Sarah Chen", summary: "SC confirmed receipt and will bring updated goals. Requested current incident report summary.", threadId: threadA, compliance: "plan_review" as const },
      { type: "phone_call" as const, dir: "sent" as const, date: "2026-02-05", contact: "sil_provider" as const, name: "Care Connect Australia", phone: "0280001234", summary: "Discussed upcoming participant handover. Care Connect confirmed they can provide 24/7 support from March 1.", threadId: threadB, isStarter: true },
      { type: "email" as const, dir: "sent" as const, date: "2026-02-06", contact: "sil_provider" as const, name: "Care Connect Australia", email: "ops@careconnect.com.au", subject: "Handover Documentation", summary: "Sent participant profiles, emergency contacts, and house rules documentation for new SIL arrangement.", threadId: threadB },
      { type: "phone_call" as const, dir: "received" as const, date: "2026-02-07", contact: "ndia" as const, name: "NDIA Planner", phone: "1800800110", summary: "NDIA called regarding funding query for participant 430-294-618. Confirmed current plan end date and requested updated SDA quote.", threadId: threadC, isStarter: true, compliance: "routine" as const },
      { type: "email" as const, dir: "sent" as const, date: "2026-02-08", contact: "ndia" as const, name: "NDIA Planner", email: "plans@ndia.gov.au", subject: "Updated SDA Quote - Michael Torres", summary: "Sent updated SDA quote with current pricing schedule as requested by NDIA planner.", threadId: threadC, compliance: "routine" as const },
      { type: "sms" as const, dir: "sent" as const, date: "2026-02-10", contact: "family" as const, name: "Wei Chen", phone: "0498765432", summary: "Sent SMS to Sarah's father regarding upcoming plan review meeting. Confirmed he will attend via video call." },
      { type: "meeting" as const, dir: "sent" as const, date: "2026-02-11", contact: "contractor" as const, name: "Steve Parker", phone: "0290001111", summary: "On-site meeting with plumber to assess burst pipe damage at 42 Banksia Drive Unit 1. Quote to follow." },
      { type: "email" as const, dir: "received" as const, date: "2026-02-12", contact: "plan_manager" as const, name: "Plan Partners Australia", email: "claims@planpartners.com.au", subject: "Payment Confirmation Feb 2026", summary: "Confirmed payment of $6,635 SDA funding for February period processed.", compliance: "routine" as const },
      { type: "phone_call" as const, dir: "received" as const, date: "2026-02-12", contact: "ot" as const, name: "Dr Rebecca Liu", phone: "0290005555", summary: "OT called to discuss SDA assessment for potential new participant. Requires High Physical Support category. Will send referral." },
      { type: "email" as const, dir: "sent" as const, date: "2026-02-13", contact: "participant" as const, name: "Aisha Hassan", email: "aisha.hassan@email.com", subject: "Maintenance Update", summary: "Updated Aisha on smoke detector replacement completed and upcoming garden path repair timeline.", participantId: pAisha },
      { type: "sms" as const, dir: "sent" as const, date: "2026-02-13", contact: "contractor" as const, name: "Tom Bradley", phone: "0290003333", summary: "Requested availability for garden path paver repair at 88 Eucalyptus Lane." },
      { type: "email" as const, dir: "received" as const, date: "2026-02-13", contact: "support_coordinator" as const, name: "Mark Dubois", email: "mark.d@coordplus.com.au", subject: "New referral - Emma Wilson", summary: "SC sent initial referral for Emma Wilson. Limited info available. Needs SDA assessment. Will forward NDIS plan when available.", compliance: "access_request" as const, flags: ["requires_documentation" as const] },
      { type: "phone_call" as const, dir: "sent" as const, date: "2026-02-14", contact: "family" as const, name: "Rosa Torres", phone: "0487654321", summary: "Called Michael's sister to discuss his upcoming plan review. She raised concerns about transport to appointments." },
      { type: "email" as const, dir: "sent" as const, date: "2026-02-14", contact: "other" as const, name: "NSW Fair Trading", email: "enquiries@fairtrading.nsw.gov.au", subject: "Bond lodgement confirmation query", summary: "Requested confirmation of bond lodgement for 120 Wattle Street Unit A.", compliance: "routine" as const },
    ];
    for (const c of comms) {
      await ctx.db.insert("communications", {
        organizationId: orgId, communicationType: c.type, direction: c.dir,
        communicationDate: c.date, contactType: c.contact, contactName: c.name,
        contactEmail: c.email, contactPhone: c.phone,
        subject: c.subject, summary: c.summary,
        threadId: c.threadId, isThreadStarter: c.isStarter,
        participantId: c.participantId,
        complianceCategory: c.compliance, complianceFlags: c.flags,
        createdBy: adminId, createdAt: now, updatedAt: now,
      });
    }

    // ========== 11. Tasks ==========
    const taskData = [
      { title: "Submit Sarah Chen plan review documents", due: "2026-02-15", pri: "high" as const, status: "in_progress" as const, cat: "plan_approval" as const, pId: pSarah },
      { title: "Follow up NDIA on Michael Torres funding query", due: "2026-02-18", pri: "high" as const, status: "in_progress" as const, cat: "funding" as const, pId: pMichael },
      { title: "Arrange OT assessment for Emma Wilson", due: "2026-02-28", pri: "medium" as const, status: "pending" as const, cat: "documentation" as const, pId: pEmma },
      { title: "Complete SIL handover documentation", due: "2026-02-25", pri: "high" as const, status: "in_progress" as const, cat: "documentation" as const },
      { title: "Renew Daniel Kim consent form (expired)", due: "2026-02-10", pri: "urgent" as const, status: "pending" as const, cat: "documentation" as const, pId: pDaniel },
      { title: "Review bathroom safety after Sarah's fall", due: "2026-02-16", pri: "urgent" as const, status: "pending" as const, cat: "follow_up" as const, pId: pSarah, propId: prop1 },
      { title: "Lodge insurance claim for water damage", due: "2026-02-05", pri: "high" as const, status: "completed" as const, cat: "general" as const, propId: prop2, compDate: "2026-02-05" },
      { title: "Quarterly fire safety check coordination", due: "2026-01-31", pri: "medium" as const, status: "completed" as const, cat: "follow_up" as const, compDate: "2026-01-30" },
    ];
    for (const t of taskData) {
      await ctx.db.insert("tasks", {
        organizationId: orgId, title: t.title, dueDate: t.due, priority: t.pri,
        status: t.status, category: t.cat,
        linkedParticipantId: t.pId, linkedPropertyId: t.propId,
        assignedToUserId: adminId,
        completedDate: t.compDate, completedBy: t.compDate ? adminId : undefined,
        createdBy: adminId, createdAt: now, updatedAt: now,
      });
    }

    // ========== 12. Compliance Certifications ==========
    const certs = [
      { type: "ndis_practice_standards" as const, name: "NDIS Practice Standards - Core Module", body: "SAI Global", num: "CERT-2024-0891", issue: "2024-06-15", expiry: "2027-06-14", status: "current" as const, isOrg: true },
      { type: "sda_registration" as const, name: "SDA Provider Registration", body: "NDIS Quality & Safeguards Commission", num: "SDA-REG-44218", issue: "2025-01-10", expiry: "2028-01-09", status: "current" as const, isOrg: true },
      { type: "fire_safety" as const, name: "Annual Fire Safety Statement - 42 Banksia Dr", body: "NSW Fire & Rescue", num: "FSS-2025-7721", issue: "2025-04-01", expiry: "2026-03-31", status: "expiring_soon" as const, propId: prop1 },
      { type: "building_compliance" as const, name: "Building Compliance Certificate - 88 Eucalyptus Ln", body: "Toowoomba Regional Council", num: "BCC-QLD-9934", issue: "2023-08-20", expiry: "2025-08-19", status: "expired" as const, propId: prop3 },
      { type: "sda_design_standard" as const, name: "SDA Design Standard - 15 Waratah Cct", body: "Liveable Housing Australia", num: "LHA-2025-3302", issue: "2025-11-01", expiry: "2026-10-31", status: "pending_renewal" as const, propId: prop2 },
    ];
    for (const c of certs) {
      await ctx.db.insert("complianceCertifications", {
        organizationId: orgId, certificationType: c.type, certificationName: c.name,
        certifyingBody: c.body, certificateNumber: c.num,
        issueDate: c.issue, expiryDate: c.expiry, status: c.status,
        propertyId: c.propId, isOrganizationWide: c.isOrg,
        createdBy: adminId, createdAt: now, updatedAt: now,
      });
    }

    // ========== 13. Complaints ==========
    const cmp1 = await ctx.db.insert("complaints", {
      organizationId: orgId, complainantType: "family_carer", complainantName: "Wei Chen",
      complainantContact: "0498765432", participantId: pSarah, propertyId: prop1,
      complaintDate: "2026-02-12", receivedDate: "2026-02-12", receivedBy: adminId,
      category: "safety", description: "Concerned about bathroom safety after daughter's fall. Requests immediate installation of additional grab rails and non-slip matting.",
      severity: "high", status: "received", source: "phone",
      referenceNumber: "CMP-20260212-W4K8",
      acknowledgmentDueDate: "2026-02-13", resolutionDueDate: "2026-03-15",
      createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("complaints", {
      organizationId: orgId, complainantType: "participant", complainantName: "Daniel Kim",
      participantId: pDaniel, propertyId: prop3,
      complaintDate: "2026-02-03", receivedDate: "2026-02-03", receivedBy: adminId,
      category: "property_condition", description: "Handrail on front ramp is loose and unsafe. Has been reported multiple times. Wants urgent repair.",
      severity: "medium", status: "under_investigation",
      acknowledgedDate: "2026-02-03", acknowledgmentMethod: "phone",
      assignedTo: adminId, investigationNotes: "Confirmed handrail loose. Contractor assessment scheduled.",
      source: "phone", referenceNumber: "CMP-20260203-R2J5",
      acknowledgmentDueDate: "2026-02-04", resolutionDueDate: "2026-03-06",
      createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("complaints", {
      organizationId: orgId, complainantType: "support_coordinator", complainantName: "Jennifer Walsh",
      complainantContact: "j.walsh@scnetwork.com.au",
      complaintDate: "2026-01-15", receivedDate: "2026-01-15", receivedBy: adminId,
      category: "communication", description: "Reports not being kept informed of maintenance schedule changes affecting her participants.",
      severity: "low", status: "resolved",
      acknowledgedDate: "2026-01-15", acknowledgmentMethod: "email", assignedTo: adminId,
      resolutionDate: "2026-01-22", resolutionDescription: "Implemented automated email notifications for maintenance schedule changes to linked support coordinators.",
      resolutionOutcome: "upheld", complainantSatisfied: true, advocacyOffered: true,
      source: "email", referenceNumber: "CMP-20260115-M3P1",
      createdAt: now, updatedAt: now,
    });

    // ========== 14. Calendar Events ==========
    const events = [
      { title: "Property Inspection - 42 Banksia Drive", start: "2026-02-20T09:00:00", end: "2026-02-20T11:00:00", type: "inspection" as const, color: "#0d9488", propId: prop1 },
      { title: "Plumbing Repair - Unit 1 Bathroom", start: "2026-02-17T08:00:00", end: "2026-02-17T12:00:00", type: "maintenance" as const, color: "#f59e0b", propId: prop1 },
      { title: "Sarah Chen Plan Review Meeting", start: "2026-02-15T14:00:00", end: "2026-02-15T15:30:00", type: "appointment" as const, color: "#3b82f6", partId: pSarah },
      { title: "Monthly Team Meeting", start: "2026-02-21T10:00:00", end: "2026-02-21T11:00:00", type: "appointment" as const, color: "#8b5cf6" },
      { title: "Fire Safety Cert Renewal Due - Banksia Dr", start: "2026-03-31T00:00:00", end: "2026-03-31T23:59:00", type: "compliance" as const, color: "#ef4444", propId: prop1 },
    ];
    for (const e of events) {
      await ctx.db.insert("calendarEvents", {
        organizationId: orgId, title: e.title, startTime: e.start, endTime: e.end,
        allDay: false, eventType: e.type, color: e.color,
        linkedPropertyId: e.propId, linkedParticipantId: e.partId,
        createdBy: adminId, createdAt: now,
      });
    }

    // ========== 15. Alerts ==========
    const alertData = [
      { type: "document_expiry" as const, sev: "warning" as const, title: "Consent Expiring - Sarah Chen", msg: "Participant consent for Sarah Chen expires on 2026-02-20. Renewal required.", partId: pSarah, date: "2026-02-14" },
      { type: "consent_expiry" as const, sev: "critical" as const, title: "Consent Expired - Daniel Kim", msg: "Participant consent for Daniel Kim expired on 2025-12-01. Immediate renewal required.", partId: pDaniel, date: "2026-02-14" },
      { type: "certification_expiry" as const, sev: "warning" as const, title: "Fire Safety Cert Expiring - 42 Banksia Dr", msg: "Fire safety statement for 42 Banksia Drive expires 2026-03-31. Schedule renewal.", propId: prop1, date: "2026-02-14" },
      { type: "certification_expiry" as const, sev: "critical" as const, title: "Building Compliance Expired - 88 Eucalyptus Ln", msg: "Building compliance certificate for 88 Eucalyptus Lane expired 2025-08-19. Urgent renewal needed.", propId: prop3, date: "2026-02-14" },
      { type: "maintenance_due" as const, sev: "warning" as const, title: "Urgent Maintenance - Burst Pipe", msg: "Urgent plumbing repair at 42 Banksia Drive Unit 1 has been in progress for 4 days.", propId: prop1, dwId: dw1a, date: "2026-02-14" },
      { type: "vacancy" as const, sev: "info" as const, title: "Vacant Dwelling - Villa B, Epping", msg: "Villa B at 15 Waratah Circuit is currently vacant. NDIA notification may be required.", propId: prop2, dwId: dw2b, date: "2026-02-14" },
      { type: "plan_expiry" as const, sev: "warning" as const, title: "Plan Expiring - Sarah Chen", msg: "NDIS plan for Sarah Chen expires soon. Coordinate with SC for plan review.", partId: pSarah, date: "2026-02-14" },
      { type: "profile_incomplete" as const, sev: "info" as const, title: "Incomplete Profile - Emma Wilson", msg: "Emma Wilson's participant profile is incomplete. Add NDIS number and other required details.", partId: pEmma, date: "2026-02-14" },
    ];
    for (const a of alertData) {
      await ctx.db.insert("alerts", {
        organizationId: orgId, alertType: a.type, severity: a.sev, title: a.title, message: a.msg,
        linkedParticipantId: a.partId, linkedPropertyId: a.propId, linkedDwellingId: a.dwId,
        triggerDate: a.date, status: "active", createdAt: now,
      });
    }

    // ========== Summary ==========
    const counts = {
      organization: 1, users: 1, owners: 3, properties: 5, dwellings: 13,
      participants: 8, contractors: 3, maintenanceRequests: 10, incidents: 5,
      communications: 15, tasks: 8, certifications: 5, complaints: 3,
      calendarEvents: 5, alerts: 8,
    };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    console.log(`Horizon SDA Group seeded successfully. ${total} records created.`);
    return { success: true, skipped: false, organizationId: orgId, adminUserId: adminId, counts, totalRecords: total };
  },
});
