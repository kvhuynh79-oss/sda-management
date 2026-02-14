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
