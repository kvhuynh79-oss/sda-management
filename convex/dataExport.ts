import { action, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { decryptField } from "./lib/encryption";

/**
 * Data Export Module
 *
 * Allows admin users to export all organization data for compliance,
 * migration, or backup purposes. NDIS compliance requires data portability
 * and the ability to provide audit packs upon request.
 *
 * Security:
 * - Admin-only access via role check
 * - Tenant-scoped - only exports own org data
 * - Audit logged for compliance trail
 * - Encrypted fields decrypted in export for data portability
 * - User password hashes and MFA secrets excluded
 */

// ============================================
// QUERIES - Used by the action via ctx.runQuery
// ============================================

/**
 * Validate the requesting user has admin + export permissions and
 * return their organizationId.
 */
export const validateExportPermission = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    organizationId: Id<"organizations">;
    userEmail: string;
    userName: string;
  }> => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Authentication required. User not found.");
    }
    if (!user.isActive) {
      throw new Error("Account is disabled. Please contact your administrator.");
    }
    if (user.role !== "admin") {
      throw new Error("Access denied. Data export requires admin role.");
    }
    if (!user.organizationId) {
      throw new Error("User has no organization assigned. Cannot export data.");
    }
    return {
      organizationId: user.organizationId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
    };
  },
});

/**
 * Fetch all tenant-scoped data for a given organization.
 * Called by the export action via ctx.runQuery.
 * Permission check: only admin users can call this (enforced by action wrapper).
 */
export const fetchOrganizationData = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify the requesting user is admin and belongs to this org
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "admin" || !user.isActive) {
      throw new Error("Access denied.");
    }
    if (user.organizationId !== args.organizationId) {
      throw new Error("Access denied. Organization mismatch.");
    }

    const { organizationId } = args;

    // Helper to query a table by organizationId index
    async function queryTable<T>(tableName: string): Promise<T[]> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (ctx.db as any)
        .query(tableName)
        .withIndex("by_organizationId", (q: { eq: (field: string, value: Id<"organizations">) => unknown }) =>
          q.eq("organizationId", organizationId)
        )
        .collect();
    }

    // Fetch all tenant-scoped tables in parallel for performance
    const [
      properties,
      dwellings,
      participants,
      participantPlans,
      payments,
      claims,
      maintenanceRequests,
      maintenancePhotos,
      maintenanceQuotes,
      preventativeSchedule,
      contractors,
      quoteRequests,
      documents,
      alerts,
      incidents,
      incidentPhotos,
      incidentActions,
      inspectionTemplates,
      inspections,
      inspectionItems,
      inspectionPhotos,
      communications,
      threadSummaries,
      tasks,
      complaints,
      owners,
      supportCoordinators,
      supportCoordinatorParticipants,
      silProviders,
      silProviderParticipants,
      silProviderProperties,
      silProviderDwellings,
      occupationalTherapists,
      otParticipants,
      vacancyListings,
      ownerPayments,
      bankAccounts,
      bankTransactions,
      expectedPayments,
      paymentSchedules,
      complianceCertifications,
      insurancePolicies,
      providerSettings,
      propertyMedia,
      aiConversations,
      aiProcessingQueue,
      staffMembers,
      leads,
      calendarEvents,
      calendarConnections,
      policies,
      emergencyManagementPlans,
      businessContinuityPlans,
      xeroConnections,
    ] = await Promise.all([
      queryTable("properties"),
      queryTable("dwellings"),
      queryTable("participants"),
      queryTable("participantPlans"),
      queryTable("payments"),
      queryTable("claims"),
      queryTable("maintenanceRequests"),
      queryTable("maintenancePhotos"),
      queryTable("maintenanceQuotes"),
      queryTable("preventativeSchedule"),
      queryTable("contractors"),
      queryTable("quoteRequests"),
      queryTable("documents"),
      queryTable("alerts"),
      queryTable("incidents"),
      queryTable("incidentPhotos"),
      queryTable("incidentActions"),
      queryTable("inspectionTemplates"),
      queryTable("inspections"),
      queryTable("inspectionItems"),
      queryTable("inspectionPhotos"),
      queryTable("communications"),
      queryTable("threadSummaries"),
      queryTable("tasks"),
      queryTable("complaints"),
      queryTable("owners"),
      queryTable("supportCoordinators"),
      queryTable("supportCoordinatorParticipants"),
      queryTable("silProviders"),
      queryTable("silProviderParticipants"),
      queryTable("silProviderProperties"),
      queryTable("silProviderDwellings"),
      queryTable("occupationalTherapists"),
      queryTable("otParticipants"),
      queryTable("vacancyListings"),
      queryTable("ownerPayments"),
      queryTable("bankAccounts"),
      queryTable("bankTransactions"),
      queryTable("expectedPayments"),
      queryTable("paymentSchedules"),
      queryTable("complianceCertifications"),
      queryTable("insurancePolicies"),
      queryTable("providerSettings"),
      queryTable("propertyMedia"),
      queryTable("aiConversations"),
      queryTable("aiProcessingQueue"),
      queryTable("staffMembers"),
      queryTable("leads"),
      queryTable("calendarEvents"),
      queryTable("calendarConnections"),
      queryTable("policies"),
      queryTable("emergencyManagementPlans"),
      queryTable("businessContinuityPlans"),
      queryTable("xeroConnections"),
    ]);

    // Fetch organization record itself
    const organization = await ctx.db.get(organizationId);

    // Fetch users belonging to this org
    const users = await ctx.db
      .query("users")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Sanitize users - remove password hashes and MFA secrets
    const sanitizedUsers = users.map((u) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, mfaSecret, mfaBackupCodes, ...safeUser } = u;
      return safeUser;
    });

    // Fetch audit logs for this org (limit to recent 10,000 for performance)
    const auditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(10000);

    return {
      organization,
      users: sanitizedUsers,
      properties,
      dwellings,
      participants,
      participantPlans,
      payments,
      claims,
      maintenanceRequests,
      maintenancePhotos,
      maintenanceQuotes,
      preventativeSchedule,
      contractors,
      quoteRequests,
      documents,
      alerts,
      incidents,
      incidentPhotos,
      incidentActions,
      inspectionTemplates,
      inspections,
      inspectionItems,
      inspectionPhotos,
      communications,
      threadSummaries,
      tasks,
      complaints,
      owners,
      supportCoordinators,
      supportCoordinatorParticipants,
      silProviders,
      silProviderParticipants,
      silProviderProperties,
      silProviderDwellings,
      occupationalTherapists,
      otParticipants,
      vacancyListings,
      ownerPayments,
      bankAccounts,
      bankTransactions,
      expectedPayments,
      paymentSchedules,
      complianceCertifications,
      insurancePolicies,
      providerSettings,
      propertyMedia,
      aiConversations,
      aiProcessingQueue,
      staffMembers,
      leads,
      calendarEvents,
      calendarConnections,
      policies,
      emergencyManagementPlans,
      businessContinuityPlans,
      xeroConnections,
      auditLogs,
    };
  },
});

// ============================================
// INTERNAL MUTATION - Audit log helper
// ============================================

/**
 * Log the data export to the audit trail.
 * Uses internalMutation to leverage the existing auditLog.log pattern.
 */
export const logExportToAudit = internalMutation({
  args: {
    userId: v.id("users"),
    userEmail: v.string(),
    userName: v.string(),
    organizationId: v.id("organizations"),
    totalRecords: v.number(),
    tableCounts: v.string(), // JSON string
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.userId,
      userEmail: args.userEmail,
      userName: args.userName,
      action: "export",
      entityType: "data_export",
      entityName: `Full data export - ${args.totalRecords} records`,
      metadata: JSON.stringify({
        totalRecords: args.totalRecords,
        tableCounts: JSON.parse(args.tableCounts),
        format: "json",
      }),
      timestamp: Date.now(),
    });
  },
});

// ============================================
// EXPORTED ACTION - Main export entry point
// ============================================

/**
 * Export all organization data as structured JSON.
 *
 * This is an action (not a query) because:
 * 1. It may be heavy/long-running for large orgs
 * 2. It needs to decrypt encrypted fields (requires env var access)
 * 3. It writes an audit log entry on completion
 *
 * Returns a structured JSON object with all org data organized by table name,
 * plus metadata about the export (timestamp, record counts, etc).
 */
export const exportOrganizationData = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    metadata?: {
      exportedAt: string;
      exportedBy: string;
      organizationId: string;
      organizationName: string;
      format: string;
      totalRecords: number;
      tableCounts: Record<string, number>;
    };
    error?: string;
  }> => {
    // Step 1: Validate permissions
    const { organizationId, userEmail, userName } = await ctx.runQuery(
      api.dataExport.validateExportPermission,
      { userId: args.userId }
    );

    // Step 2: Fetch all organization data
    const rawData = await ctx.runQuery(
      api.dataExport.fetchOrganizationData,
      { userId: args.userId, organizationId }
    );

    // Step 3: Decrypt sensitive fields
    // Participants: ndisNumber, dateOfBirth, emergencyContactName, emergencyContactPhone
    const decryptedParticipants = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rawData.participants as any[]).map(async (p: Record<string, unknown>) => ({
        ...p,
        ndisNumber: await decryptField(p.ndisNumber as string | null | undefined),
        dateOfBirth: await decryptField(p.dateOfBirth as string | null | undefined),
        emergencyContactName: await decryptField(p.emergencyContactName as string | null | undefined),
        emergencyContactPhone: await decryptField(p.emergencyContactPhone as string | null | undefined),
      }))
    );

    // Incidents: description, witnessNames
    const decryptedIncidents = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rawData.incidents as any[]).map(async (inc: Record<string, unknown>) => ({
        ...inc,
        description: await decryptField(inc.description as string | null | undefined),
        witnessNames: await decryptField(inc.witnessNames as string | null | undefined),
      }))
    );

    // Owners: bankAccountNumber
    const decryptedOwners = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rawData.owners as any[]).map(async (o: Record<string, unknown>) => ({
        ...o,
        bankAccountNumber: await decryptField(o.bankAccountNumber as string | null | undefined),
      }))
    );

    // Step 4: Build the export payload
    const exportData: Record<string, unknown> = {
      organization: rawData.organization,
      users: rawData.users,
      properties: rawData.properties,
      dwellings: rawData.dwellings,
      participants: decryptedParticipants,
      participantPlans: rawData.participantPlans,
      payments: rawData.payments,
      claims: rawData.claims,
      maintenanceRequests: rawData.maintenanceRequests,
      maintenancePhotos: rawData.maintenancePhotos,
      maintenanceQuotes: rawData.maintenanceQuotes,
      preventativeSchedule: rawData.preventativeSchedule,
      contractors: rawData.contractors,
      quoteRequests: rawData.quoteRequests,
      documents: rawData.documents,
      alerts: rawData.alerts,
      incidents: decryptedIncidents,
      incidentPhotos: rawData.incidentPhotos,
      incidentActions: rawData.incidentActions,
      inspectionTemplates: rawData.inspectionTemplates,
      inspections: rawData.inspections,
      inspectionItems: rawData.inspectionItems,
      inspectionPhotos: rawData.inspectionPhotos,
      communications: rawData.communications,
      threadSummaries: rawData.threadSummaries,
      tasks: rawData.tasks,
      complaints: rawData.complaints,
      owners: decryptedOwners,
      supportCoordinators: rawData.supportCoordinators,
      supportCoordinatorParticipants: rawData.supportCoordinatorParticipants,
      silProviders: rawData.silProviders,
      silProviderParticipants: rawData.silProviderParticipants,
      silProviderProperties: rawData.silProviderProperties,
      silProviderDwellings: rawData.silProviderDwellings,
      occupationalTherapists: rawData.occupationalTherapists,
      otParticipants: rawData.otParticipants,
      vacancyListings: rawData.vacancyListings,
      ownerPayments: rawData.ownerPayments,
      bankAccounts: rawData.bankAccounts,
      bankTransactions: rawData.bankTransactions,
      expectedPayments: rawData.expectedPayments,
      paymentSchedules: rawData.paymentSchedules,
      complianceCertifications: rawData.complianceCertifications,
      insurancePolicies: rawData.insurancePolicies,
      providerSettings: rawData.providerSettings,
      propertyMedia: rawData.propertyMedia,
      aiConversations: rawData.aiConversations,
      aiProcessingQueue: rawData.aiProcessingQueue,
      staffMembers: rawData.staffMembers,
      leads: rawData.leads,
      calendarEvents: rawData.calendarEvents,
      calendarConnections: rawData.calendarConnections,
      policies: rawData.policies,
      emergencyManagementPlans: rawData.emergencyManagementPlans,
      businessContinuityPlans: rawData.businessContinuityPlans,
      xeroConnections: rawData.xeroConnections,
      auditLogs: rawData.auditLogs,
    };

    // Step 5: Calculate record counts for metadata
    const tableCounts: Record<string, number> = {};
    let totalRecords = 0;
    for (const [key, value] of Object.entries(exportData)) {
      if (Array.isArray(value)) {
        tableCounts[key] = value.length;
        totalRecords += value.length;
      } else if (value !== null && value !== undefined) {
        tableCounts[key] = 1;
        totalRecords += 1;
      } else {
        tableCounts[key] = 0;
      }
    }

    const orgName =
      rawData.organization && typeof rawData.organization === "object" && "name" in rawData.organization
        ? (rawData.organization as { name: string }).name
        : "Unknown";

    const metadata = {
      exportedAt: new Date().toISOString(),
      exportedBy: userName,
      organizationId: organizationId as string,
      organizationName: orgName,
      format: "json",
      totalRecords,
      tableCounts,
    };

    // Step 6: Log to audit trail
    await ctx.runMutation(internal.dataExport.logExportToAudit, {
      userId: args.userId,
      userEmail,
      userName,
      organizationId,
      totalRecords,
      tableCounts: JSON.stringify(tableCounts),
    });

    return {
      success: true,
      data: exportData,
      metadata,
    };
  },
});
