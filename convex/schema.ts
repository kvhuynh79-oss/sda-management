import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - app users (not NDIS participants)
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("property_manager"),
      v.literal("staff"),
      v.literal("accountant"),
      v.literal("sil_provider") // External SIL provider with restricted access
    ),
    phone: v.optional(v.string()),
    // For SIL provider users - links to their provider record
    silProviderId: v.optional(v.id("silProviders")),
    isActive: v.boolean(),
    lastLogin: v.optional(v.number()),
    notificationPreferences: v.optional(
      v.object({
        emailEnabled: v.boolean(),
        smsEnabled: v.boolean(),
        criticalAlerts: v.boolean(),
        warningAlerts: v.boolean(),
        infoAlerts: v.boolean(),
        dailyDigest: v.boolean(),
        weeklyDigest: v.boolean(),
      })
    ),
    // MFA (Multi-Factor Authentication) fields
    mfaSecret: v.optional(v.string()), // TOTP secret key (encrypted)
    mfaEnabled: v.optional(v.boolean()), // Whether MFA is enabled for this user
    mfaBackupCodes: v.optional(v.array(v.string())), // Hashed backup codes
    mfaFailedAttempts: v.optional(v.number()), // Rate limiting: failed TOTP attempts
    mfaLockedUntil: v.optional(v.string()), // Rate limiting: lockout expiry ISO date
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Sessions table - server-side session management (replaces localStorage auth)
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(), // Access token (short-lived, 24 hours)
    refreshToken: v.string(), // Refresh token (long-lived, 30 days)
    expiresAt: v.number(), // Access token expiration timestamp
    refreshTokenExpiresAt: v.number(), // Refresh token expiration timestamp
    userAgent: v.optional(v.string()), // Browser/device info for security
    ipAddress: v.optional(v.string()), // IP address for security tracking
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"])
    .index("by_refreshToken", ["refreshToken"])
    .index("by_expiresAt", ["expiresAt"]),

  // Audit Logs table - track all user actions for security and compliance
  auditLogs: defineTable({
    userId: v.id("users"),
    userEmail: v.string(),
    userName: v.string(),
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("view"),
      v.literal("login"),
      v.literal("logout"),
      v.literal("export"),
      v.literal("import"),
      v.literal("thread_merge"),
      v.literal("thread_split"),
      v.literal("consultation_gate"),
      v.literal("bulk_mark_read"),
      v.literal("bulk_categorize"),
      v.literal("bulk_thread"),
      v.literal("bulk_flag"),
      v.literal("mfa_enabled"),
      v.literal("mfa_disabled"),
      v.literal("mfa_backup_used"),
      v.literal("mfa_backup_regenerated"),
      v.literal("mfa_lockout"),
      v.literal("data_encrypted")
    ),
    entityType: v.string(), // "property", "participant", "payment", etc.
    entityId: v.optional(v.string()),
    entityName: v.optional(v.string()),
    changes: v.optional(v.string()), // JSON string of changed fields
    previousValues: v.optional(v.string()), // JSON string of previous values
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.string()), // Additional context as JSON
    timestamp: v.number(),
    // Hash chain fields for immutability (NDIS 7-year retention compliance)
    previousHash: v.optional(v.string()), // SHA-256 hash of previous log entry
    currentHash: v.optional(v.string()), // SHA-256 hash of this log entry
    sequenceNumber: v.optional(v.number()), // Sequential number for ordering
    isIntegrityVerified: v.optional(v.boolean()), // Flag for verified entries
  })
    .index("by_userId", ["userId"])
    .index("by_action", ["action"])
    .index("by_entityType", ["entityType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_entityType_entityId", ["entityType", "entityId"])
    .index("by_sequenceNumber", ["sequenceNumber"]),

  // Owners table - property investors/landlords
  owners: defineTable({
    ownerType: v.union(
      v.literal("individual"),
      v.literal("company"),
      v.literal("trust"),
      v.literal("self")
    ),
    companyName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    state: v.optional(v.string()),
    abn: v.optional(v.string()),
    bankBsb: v.optional(v.string()), // Bank BSB number
    bankAccountNumber: v.optional(v.string()), // Bank account number
    bankAccountName: v.optional(v.string()), // Account holder name
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_ownerType", ["ownerType"]),

  // Properties table - physical sites/addresses
  properties: defineTable({
    propertyName: v.optional(v.string()),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    suburb: v.string(),
    state: v.union(
      v.literal("NSW"),
      v.literal("VIC"),
      v.literal("QLD"),
      v.literal("SA"),
      v.literal("WA"),
      v.literal("TAS"),
      v.literal("NT"),
      v.literal("ACT")
    ),
    postcode: v.string(),
    propertyStatus: v.optional(
      v.union(
        v.literal("active"), // Property is operational
        v.literal("under_construction"), // Property being built
        v.literal("planning"), // Property in planning stage
        v.literal("sil_property") // SIL property managed for other providers
      )
    ),
    expectedCompletionDate: v.optional(v.string()), // For under_construction properties
    // SIL Property fields - for properties managed on behalf of SIL providers
    silProviderName: v.optional(v.string()), // Legacy: free text provider name
    silProviderId: v.optional(v.id("silProviders")), // Link to SIL provider from database
    silServiceScope: v.optional(
      v.union(
        v.literal("full_management"), // Full property management
        v.literal("maintenance_only"), // Only maintenance/repairs
        v.literal("incidents_only"), // Only incident management
        v.literal("maintenance_and_incidents") // Both maintenance and incidents
      )
    ),
    silContractStartDate: v.optional(v.string()), // When we started managing for them
    silContractEndDate: v.optional(v.string()), // Contract end date if applicable
    silMonthlyFee: v.optional(v.number()), // Monthly management fee charged to SIL provider
    silContactName: v.optional(v.string()), // Primary contact at SIL provider for this property
    silContactPhone: v.optional(v.string()),
    silContactEmail: v.optional(v.string()),
    // Owner fields - optional for SIL properties where owner is unknown
    ownerId: v.optional(v.id("owners")), // Made optional for SIL properties
    ownershipType: v.optional(v.union(v.literal("investor"), v.literal("self_owned"), v.literal("sil_managed"))),
    revenueSharePercent: v.optional(v.number()),
    managementFeePercent: v.optional(v.number()), // % of revenue kept as management fee (0-100)
    sdaRegistrationNumber: v.optional(v.string()),
    sdaRegistrationDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_state", ["state"])
    .index("by_propertyStatus", ["propertyStatus"])
    .index("by_owner_status", ["ownerId", "propertyStatus"])
    .index("by_state_status", ["state", "propertyStatus"])
    .index("by_silProvider", ["silProviderId"])
    .index("by_isActive", ["isActive"]),

  // Dwellings table - individual living units within a property
  dwellings: defineTable({
    propertyId: v.id("properties"),
    dwellingName: v.string(),
    dwellingType: v.union(
      v.literal("house"),
      v.literal("villa"),
      v.literal("apartment"),
      v.literal("unit")
    ),
    bedrooms: v.number(),
    bathrooms: v.optional(v.number()),
    sdaDesignCategory: v.union(
      v.literal("improved_liveability"),
      v.literal("fully_accessible"),
      v.literal("robust"),
      v.literal("high_physical_support")
    ),
    sdaBuildingType: v.union(v.literal("new_build"), v.literal("existing")),
    registrationDate: v.optional(v.string()), // Date when dwelling was registered for SDA
    sdaRegisteredAmount: v.optional(v.number()), // Annual SDA funding amount (e.g., $79,620)
    maxParticipants: v.number(),
    currentOccupancy: v.number(),
    occupancyStatus: v.union(
      v.literal("fully_occupied"),
      v.literal("partially_occupied"),
      v.literal("vacant")
    ),
    weeklyRentAmount: v.optional(v.number()),
    // Vacancy notification tracking (NDIA requires notification within 5 business days)
    vacancyDate: v.optional(v.string()), // Date dwelling became vacant
    ndiaVacancyNotified: v.optional(v.boolean()), // Has NDIA been notified of vacancy
    ndiaVacancyNotificationDate: v.optional(v.string()), // Date NDIA was notified
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_isActive", ["isActive"])
    .index("by_occupancyStatus", ["occupancyStatus"])
    .index("by_property_occupancy", ["propertyId", "occupancyStatus"]),

  // Participants table - NDIS participants
  participants: defineTable({
    ndisNumber: v.string(),
    ndisNumberIndex: v.optional(v.string()), // HMAC blind index for encrypted NDIS number search
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),
    dwellingId: v.id("dwellings"),
    moveInDate: v.optional(v.string()),
    moveOutDate: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending_move_in"),
      v.literal("moved_out")
    ),
    silProviderName: v.optional(v.string()),
    supportCoordinatorName: v.optional(v.string()),
    supportCoordinatorEmail: v.optional(v.string()),
    supportCoordinatorPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ndisNumber", ["ndisNumber"])
    .index("by_ndisNumberIndex", ["ndisNumberIndex"])
    .index("by_dwelling", ["dwellingId"])
    .index("by_status", ["status"])
    .index("by_dwelling_status", ["dwellingId", "status"]),

  // Participant Plans table - NDIS plan details
  participantPlans: defineTable({
    participantId: v.id("participants"),
    planStartDate: v.string(),
    planEndDate: v.string(),
    planStatus: v.union(
      v.literal("current"),
      v.literal("expired"),
      v.literal("pending")
    ),
    sdaEligibilityType: v.union(
      v.literal("standard"),
      v.literal("higher_needs")
    ),
    sdaDesignCategory: v.union(
      v.literal("improved_liveability"),
      v.literal("fully_accessible"),
      v.literal("robust"),
      v.literal("high_physical_support")
    ),
    sdaBuildingType: v.union(v.literal("new_build"), v.literal("existing")),
    fundingManagementType: v.union(
      v.literal("ndia_managed"),
      v.literal("plan_managed"),
      v.literal("self_managed")
    ),
    planManagerName: v.optional(v.string()),
    planManagerEmail: v.optional(v.string()),
    planManagerPhone: v.optional(v.string()),
    annualSdaBudget: v.number(),
    monthlySdaAmount: v.optional(v.number()),
    claimDay: v.optional(v.number()), // Day of month when claims are due (1-31)
    claimMethod: v.optional(
      v.union(
        v.literal("agency_managed"), // NDIA direct
        v.literal("pace"), // PACE bulk upload (CSV)
        v.literal("plan_managed") // Plan manager portal
      )
    ),
    managementFeePercent: v.optional(v.number()), // % of revenue kept as management fee (0-100)
    dailySdaRate: v.optional(v.number()), // Deprecated - use monthlySdaAmount
    supportItemNumber: v.optional(v.string()),
    reasonableRentContribution: v.optional(v.number()),
    rentContributionFrequency: v.optional(
      v.union(
        v.literal("weekly"),
        v.literal("fortnightly"),
        v.literal("monthly")
      )
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_participant", ["participantId"])
    .index("by_status", ["planStatus"])
    .index("by_participant_status", ["participantId", "planStatus"]),

  // Payments table - SDA payments received
  payments: defineTable({
    participantId: v.id("participants"),
    planId: v.id("participantPlans"),
    paymentDate: v.string(),
    paymentPeriodStart: v.string(),
    paymentPeriodEnd: v.string(),
    expectedAmount: v.number(),
    actualAmount: v.number(),
    variance: v.number(),
    paymentSource: v.union(
      v.literal("ndia"),
      v.literal("plan_manager"),
      v.literal("self_managed")
    ),
    paymentMethod: v.optional(v.string()),
    paymentReference: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_participant", ["participantId"])
    .index("by_plan", ["planId"])
    .index("by_date", ["paymentDate"])
    .index("by_participant_date", ["participantId", "paymentDate"]),

  // Claims table - SDA funding claims tracking
  claims: defineTable({
    participantId: v.id("participants"),
    planId: v.id("participantPlans"),
    claimPeriod: v.string(), // Format: "YYYY-MM" (e.g., "2026-01")
    claimMethod: v.union(
      v.literal("agency_managed"),
      v.literal("pace"),
      v.literal("plan_managed")
    ),
    expectedAmount: v.number(), // Expected SDA amount for the period
    claimedAmount: v.optional(v.number()), // Actual amount claimed (may differ)
    status: v.union(
      v.literal("pending"), // Not yet submitted
      v.literal("submitted"), // Claim submitted
      v.literal("paid"), // Payment received
      v.literal("rejected"), // Claim rejected
      v.literal("partial") // Partially paid
    ),
    claimDate: v.optional(v.string()), // Date the claim was submitted
    paidDate: v.optional(v.string()), // Date payment received
    paidAmount: v.optional(v.number()), // Actual amount received
    paymentReference: v.optional(v.string()), // Reference number
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_participant", ["participantId"])
    .index("by_plan", ["planId"])
    .index("by_period", ["claimPeriod"])
    .index("by_status", ["status"])
    .index("by_participant_period", ["participantId", "claimPeriod"])
    .index("by_participant_status", ["participantId", "status"]),

  // Maintenance Requests table
  maintenanceRequests: defineTable({
    dwellingId: v.id("dwellings"),
    requestType: v.union(v.literal("reactive"), v.literal("preventative")),
    category: v.union(
      v.literal("plumbing"),
      v.literal("electrical"),
      v.literal("appliances"),
      v.literal("building"),
      v.literal("grounds"),
      v.literal("safety"),
      v.literal("general")
    ),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    title: v.string(),
    description: v.string(),
    reportedBy: v.optional(v.string()),
    reportedDate: v.string(),
    status: v.union(
      v.literal("reported"),
      v.literal("awaiting_quotes"), // Quotes being collected
      v.literal("quoted"), // Quotes received, awaiting approval
      v.literal("approved"), // Quote approved, awaiting scheduling
      v.literal("scheduled"), // Work scheduled with contractor
      v.literal("in_progress"), // Contractor working on it
      v.literal("completed"), // Work finished
      v.literal("cancelled")
    ),
    scheduledDate: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    contractorName: v.optional(v.string()),
    contractorContact: v.optional(v.string()),
    assignedContractorId: v.optional(v.id("contractors")), // Link to contractor record
    quotedAmount: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    invoiceNumber: v.optional(v.string()),
    completionNotes: v.optional(v.string()), // How completion was confirmed
    warrantyPeriodMonths: v.optional(v.number()), // Warranty period in months
    warrantyExpiryDate: v.optional(v.string()), // Auto-calculated warranty end date
    notes: v.optional(v.string()),
    incidentId: v.optional(v.id("incidents")), // Link to incident if created from one
    incidentActionId: v.optional(v.id("incidentActions")), // Link to action if created from one
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dwelling", ["dwellingId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_incident", ["incidentId"])
    .index("by_incident_action", ["incidentActionId"])
    .index("by_contractor", ["assignedContractorId"])
    .index("by_dwelling_status", ["dwellingId", "status"])
    .index("by_status_priority", ["status", "priority"]),

  // Maintenance Photos table - photos attached to maintenance requests
  maintenancePhotos: defineTable({
    maintenanceRequestId: v.id("maintenanceRequests"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    description: v.optional(v.string()), // Photo description/caption
    photoType: v.union(
      v.literal("before"), // Before work
      v.literal("during"), // During work
      v.literal("after"), // After completion
      v.literal("issue") // Showing the issue
    ),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_maintenance_request", ["maintenanceRequestId"]),

  // Maintenance Quotes table - track multiple quotes per request
  maintenanceQuotes: defineTable({
    maintenanceRequestId: v.id("maintenanceRequests"),
    contractorId: v.optional(v.id("contractors")), // Link to contractor (optional for backwards compat)
    contractorName: v.string(), // Kept for backwards compatibility
    contractorContact: v.optional(v.string()),
    contractorEmail: v.optional(v.string()),
    quoteAmount: v.number(),
    quoteDate: v.string(),
    validUntil: v.optional(v.string()), // Quote expiry date
    estimatedDays: v.optional(v.number()), // Estimated days to complete
    availableDate: v.optional(v.string()), // When contractor can start
    warrantyMonths: v.optional(v.number()), // Warranty offered
    description: v.optional(v.string()), // Quote details/scope
    laborCost: v.optional(v.number()), // Breakdown: labor
    materialsCost: v.optional(v.number()), // Breakdown: materials
    status: v.union(
      v.literal("pending"), // Quote received, awaiting decision
      v.literal("accepted"), // Quote accepted, contractor awarded
      v.literal("rejected"), // Quote rejected
      v.literal("expired") // Quote expired
    ),
    acceptedDate: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    quoteRequestId: v.optional(v.id("quoteRequests")), // Link to the quote request if submitted via email
    createdBy: v.optional(v.id("users")), // Optional - null if submitted by contractor via public link
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_maintenance_request", ["maintenanceRequestId"])
    .index("by_contractor", ["contractorId"])
    .index("by_status", ["status"])
    .index("by_maintenance_status", ["maintenanceRequestId", "status"]),

  // Preventative Maintenance Schedule table
  preventativeSchedule: defineTable({
    propertyId: v.id("properties"),
    dwellingId: v.optional(v.id("dwellings")),
    taskName: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("plumbing"),
      v.literal("electrical"),
      v.literal("appliances"),
      v.literal("building"),
      v.literal("grounds"),
      v.literal("safety"),
      v.literal("general")
    ),
    frequencyType: v.union(
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("biannually"),
      v.literal("annually")
    ),
    frequencyInterval: v.number(),
    lastCompletedDate: v.optional(v.string()),
    nextDueDate: v.string(),
    estimatedCost: v.optional(v.number()),
    contractorName: v.optional(v.string()),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_nextDueDate", ["nextDueDate"])
    .index("by_property_active", ["propertyId", "isActive"])
    .index("by_category", ["category"]),

  // Documents table - file uploads
  documents: defineTable({
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    storageId: v.id("_storage"),
    documentType: v.union(
      // Participant documents
      v.literal("ndis_plan"),
      v.literal("accommodation_agreement"),
      v.literal("sda_quotation"),
      v.literal("centrepay_consent"),
      // Property documents
      v.literal("lease"),
      v.literal("fire_safety_certificate"),
      v.literal("building_compliance_certificate"),
      v.literal("sda_design_certificate"),
      // Insurance documents
      v.literal("public_liability_insurance"),
      v.literal("professional_indemnity_insurance"),
      v.literal("building_insurance"),
      v.literal("workers_compensation_insurance"),
      // Compliance/Certification documents
      v.literal("ndis_practice_standards_cert"),
      v.literal("sda_registration_cert"),
      v.literal("ndis_worker_screening"),
      // General
      v.literal("report"),
      v.literal("other"),
      // Legacy - kept for backward compatibility
      v.literal("service_agreement"),
      v.literal("insurance"),
      v.literal("compliance")
    ),
    documentCategory: v.union(
      v.literal("participant"),
      v.literal("property"),
      v.literal("dwelling"),
      v.literal("owner"),
      v.literal("organisation")
    ),
    linkedParticipantId: v.optional(v.id("participants")),
    linkedPropertyId: v.optional(v.id("properties")),
    linkedDwellingId: v.optional(v.id("dwellings")),
    linkedOwnerId: v.optional(v.id("owners")),
    description: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_participant", ["linkedParticipantId"])
    .index("by_property", ["linkedPropertyId"])
    .index("by_dwelling", ["linkedDwellingId"])
    .index("by_documentType", ["documentType"])
    .index("by_category", ["documentCategory"])
    .index("by_expiryDate", ["expiryDate"])
    .index("by_participant_type", ["linkedParticipantId", "documentType"])
    .index("by_property_type", ["linkedPropertyId", "documentType"]),

  // Provider Settings table - NDIS provider configuration
  providerSettings: defineTable({
    providerName: v.string(),
    ndisRegistrationNumber: v.string(),
    abn: v.string(),
    defaultGstCode: v.string(),
    defaultSupportItemNumber: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    // RRC (Reasonable Rent Contribution) settings - rates change twice yearly (Mar 20 & Sep 20)
    dspFortnightlyRate: v.optional(v.number()), // Disability Support Pension fortnightly base rate
    dspPercentage: v.optional(v.number()), // % of DSP to contribute (typically 25%)
    craFortnightlyRate: v.optional(v.number()), // Commonwealth Rent Assistance max fortnightly rate
    craPercentage: v.optional(v.number()), // % of CRA to contribute (typically 100%)
    rrcLastUpdated: v.optional(v.string()), // Date RRC rates were last updated
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Alerts table - system-generated alerts
  alerts: defineTable({
    alertType: v.union(
      v.literal("plan_expiry"),
      v.literal("low_funding"),
      v.literal("payment_missing"),
      v.literal("maintenance_due"),
      v.literal("document_expiry"),
      v.literal("vacancy"),
      v.literal("preventative_schedule_due"),
      v.literal("claim_due"), // Reminder to submit SDA claim
      v.literal("owner_payment_due"), // Reminder to pay owners
      v.literal("payment_overdue"), // Expected payment not received
      v.literal("payment_variance"), // Significant payment variance (>$500)
      // Compliance alerts
      v.literal("ndis_notification_overdue"), // Reportable incident notification overdue
      v.literal("vacancy_notification_overdue"), // NDIA vacancy notification overdue (5 business days)
      v.literal("certification_expiry"), // Compliance certification expiring
      v.literal("insurance_expiry") // Insurance policy expiring
    ),
    severity: v.union(
      v.literal("critical"),
      v.literal("warning"),
      v.literal("info")
    ),
    title: v.string(),
    message: v.string(),
    linkedParticipantId: v.optional(v.id("participants")),
    linkedPropertyId: v.optional(v.id("properties")),
    linkedDwellingId: v.optional(v.id("dwellings")),
    linkedMaintenanceId: v.optional(v.id("maintenanceRequests")),
    linkedPreventativeScheduleId: v.optional(v.id("preventativeSchedule")),
    linkedPlanId: v.optional(v.id("participantPlans")), // For claim_due alerts
    linkedOwnerId: v.optional(v.id("owners")), // For owner_payment_due alerts
    triggerDate: v.string(),
    dueDate: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("acknowledged"),
      v.literal("resolved"),
      v.literal("dismissed")
    ),
    acknowledgedBy: v.optional(v.id("users")),
    acknowledgedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_alertType", ["alertType"])
    .index("by_severity", ["severity"])
    .index("by_status_severity", ["status", "severity"])
    .index("by_status_alertType", ["status", "alertType"])
    .index("by_participant", ["linkedParticipantId"])
    .index("by_property", ["linkedPropertyId"]),

  // Incidents table - incident reports for properties/participants
  incidents: defineTable({
    propertyId: v.id("properties"),
    dwellingId: v.optional(v.id("dwellings")),
    participantId: v.optional(v.id("participants")), // Optional - if incident involves specific participant
    incidentType: v.union(
      // Standard incident types
      v.literal("injury"),
      v.literal("near_miss"),
      v.literal("property_damage"),
      v.literal("behavioral"),
      v.literal("medication"),
      v.literal("abuse_neglect"),
      v.literal("complaint"),
      // NDIS Reportable incident types (require Commission notification)
      v.literal("death"), // 24hr notification
      v.literal("serious_injury"), // 24hr - requiring emergency treatment
      v.literal("unauthorized_restrictive_practice"), // 24hr
      v.literal("sexual_assault"), // 24hr
      v.literal("sexual_misconduct"), // 24hr
      v.literal("staff_assault"), // 24hr - physical/sexual assault by staff
      v.literal("unlawful_conduct"), // 5-day
      v.literal("unexplained_injury"), // 5-day
      v.literal("missing_participant"), // 5-day
      v.literal("other")
    ),
    severity: v.union(
      v.literal("minor"),
      v.literal("moderate"),
      v.literal("major"),
      v.literal("critical")
    ),
    // NDIS Commission notification tracking
    isNdisReportable: v.optional(v.boolean()), // Is this a reportable incident?
    ndisNotificationTimeframe: v.optional(v.union(
      v.literal("24_hours"), // Immediate notification required
      v.literal("5_business_days") // Standard notification timeframe
    )),
    ndisCommissionNotified: v.optional(v.boolean()), // Has Commission been notified?
    ndisCommissionNotificationDate: v.optional(v.string()), // Date notified
    ndisCommissionReferenceNumber: v.optional(v.string()), // Commission reference number
    ndisNotificationDueDate: v.optional(v.string()), // When notification is due
    ndisNotificationOverdue: v.optional(v.boolean()), // Is notification overdue?
    title: v.string(),
    description: v.string(),
    incidentDate: v.string(),
    incidentTime: v.optional(v.string()),
    location: v.optional(v.string()), // Where in the property
    witnessNames: v.optional(v.string()),
    immediateActionTaken: v.optional(v.string()),
    followUpRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
    reportedToNdis: v.optional(v.boolean()), // Legacy field - use ndisCommissionNotified
    ndisReportDate: v.optional(v.string()), // Legacy field - use ndisCommissionNotificationDate
    status: v.union(
      v.literal("reported"),
      v.literal("under_investigation"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    reportedBy: v.id("users"),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    resolutionNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_participant", ["participantId"])
    .index("by_status", ["status"])
    .index("by_severity", ["severity"])
    .index("by_isNdisReportable", ["isNdisReportable"])
    .index("by_property_status", ["propertyId", "status"])
    .index("by_property_severity", ["propertyId", "severity"]),

  // Incident Photos table
  incidentPhotos: defineTable({
    incidentId: v.id("incidents"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    description: v.optional(v.string()),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_incident", ["incidentId"]),

  // Incident Actions table - proposed solutions/remediation for incidents
  incidentActions: defineTable({
    incidentId: v.id("incidents"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("plumbing"),
      v.literal("electrical"),
      v.literal("appliances"),
      v.literal("building"),
      v.literal("grounds"),
      v.literal("safety"),
      v.literal("general")
    ),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    status: v.union(
      v.literal("pending"),     // Ready to assign (contractor or in-house)
      v.literal("in_progress"), // Work started
      v.literal("completed"),   // Done
      v.literal("cancelled")    // Removed/not needed
    ),
    assignmentType: v.union(
      v.literal("contractor"),
      v.literal("in_house"),
      v.literal("pending")
    ),
    assignedTo: v.optional(v.string()),           // Staff name for in-house
    inHouseNotes: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    maintenanceRequestId: v.optional(v.id("maintenanceRequests")),
    completedDate: v.optional(v.string()),
    completedBy: v.optional(v.id("users")),
    completionNotes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_incident", ["incidentId"])
    .index("by_status", ["status"])
    .index("by_maintenance_request", ["maintenanceRequestId"]),

  // Inspection Templates table - reusable inspection checklists
  inspectionTemplates: defineTable({
    name: v.string(), // e.g., "BLS Property Inspection"
    description: v.optional(v.string()),
    categories: v.array(
      v.object({
        name: v.string(), // e.g., "Heating & Cooling"
        items: v.array(
          v.object({
            name: v.string(), // e.g., "Check to see if AC is working"
            required: v.boolean(),
          })
        ),
      })
    ),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_isActive", ["isActive"]),

  // Inspections table - individual inspection records
  inspections: defineTable({
    templateId: v.id("inspectionTemplates"),
    propertyId: v.id("properties"),
    dwellingId: v.optional(v.id("dwellings")),
    inspectorId: v.id("users"), // User conducting the inspection
    scheduledDate: v.string(),
    completedDate: v.optional(v.string()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    location: v.optional(v.string()), // Additional location details
    preparedBy: v.optional(v.string()), // Name of person who prepared
    additionalComments: v.optional(v.string()),
    totalItems: v.number(),
    completedItems: v.number(),
    passedItems: v.number(),
    failedItems: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_dwelling", ["dwellingId"])
    .index("by_inspector", ["inspectorId"])
    .index("by_status", ["status"])
    .index("by_scheduledDate", ["scheduledDate"]),

  // Inspection Items table - each checked item in an inspection
  inspectionItems: defineTable({
    inspectionId: v.id("inspections"),
    category: v.string(), // Category name from template
    itemName: v.string(), // Item name from template
    itemOrder: v.number(), // Order within category for display
    status: v.union(
      v.literal("pending"),
      v.literal("pass"),
      v.literal("fail"),
      v.literal("na") // Not Applicable
    ),
    condition: v.optional(v.string()), // Condition/Details notes
    remarks: v.optional(v.string()), // Additional remarks
    hasIssue: v.boolean(),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  })
    .index("by_inspection", ["inspectionId"])
    .index("by_status", ["status"]),

  // Inspection Photos table - photos for inspection items or general photos
  inspectionPhotos: defineTable({
    inspectionId: v.id("inspections"),
    inspectionItemId: v.optional(v.id("inspectionItems")), // Optional - null for general photos
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    description: v.optional(v.string()), // Photo caption/description
    isGeneralPhoto: v.optional(v.boolean()), // True for photos not tied to items
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_inspection", ["inspectionId"])
    .index("by_item", ["inspectionItemId"]),

  // Property Media table - photos and videos for properties
  propertyMedia: defineTable({
    propertyId: v.id("properties"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(), // e.g., "image/jpeg", "video/mp4"
    mediaType: v.union(v.literal("photo"), v.literal("video")),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isFeatured: v.optional(v.boolean()), // Featured/hero image
    sortOrder: v.optional(v.number()), // For custom ordering
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_mediaType", ["mediaType"]),

  // AI Conversations table - stores chatbot conversation history
  aiConversations: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_isActive", ["isActive"]),

  // Contractors table - trade contractors for maintenance work
  contractors: defineTable({
    companyName: v.string(),
    contactName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    abn: v.optional(v.string()),
    specialty: v.union(
      v.literal("plumbing"),
      v.literal("electrical"),
      v.literal("appliances"),
      v.literal("building"),
      v.literal("grounds"),
      v.literal("safety"),
      v.literal("general"),
      v.literal("multi_trade")
    ),
    secondarySpecialties: v.optional(v.array(v.string())), // Additional specialties
    licenseNumber: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    preferredProperties: v.optional(v.array(v.id("properties"))), // Properties they regularly work on
    rating: v.optional(v.number()), // 1-5 star rating
    totalJobsCompleted: v.optional(v.number()),
    averageResponseTime: v.optional(v.number()), // In hours
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_specialty", ["specialty"])
    .index("by_isActive", ["isActive"]),

  // Quote Requests table - tracks emails sent to contractors requesting quotes
  quoteRequests: defineTable({
    maintenanceRequestId: v.id("maintenanceRequests"),
    contractorId: v.id("contractors"),
    requestToken: v.string(), // Unique token for contractor to submit quote via public link
    emailSentAt: v.number(),
    emailSubject: v.string(),
    emailBody: v.string(),
    includesPhotos: v.boolean(),
    status: v.union(
      v.literal("sent"), // Email sent, awaiting response
      v.literal("viewed"), // Contractor viewed the request
      v.literal("quoted"), // Contractor submitted a quote
      v.literal("declined"), // Contractor declined to quote
      v.literal("expired") // Request expired without response
    ),
    viewedAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
    expiryDate: v.string(), // When the quote request expires
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_maintenance_request", ["maintenanceRequestId"])
    .index("by_contractor", ["contractorId"])
    .index("by_token", ["requestToken"])
    .index("by_status", ["status"]),

  // Support Coordinators table - external support coordinators who refer participants
  supportCoordinators: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    organization: v.optional(v.string()), // Their company/organization
    email: v.string(),
    phone: v.optional(v.string()),
    // Areas they cover - predefined Sydney regions with custom option
    areas: v.array(v.string()), // e.g., ["Northern Sydney", "Inner West"]
    // How we know them / relationship notes
    relationship: v.optional(v.string()),
    // General notes about working with them
    notes: v.optional(v.string()),
    // Quality/responsiveness rating (1-5)
    rating: v.optional(v.number()),
    // Tracking
    lastContactedDate: v.optional(v.string()),
    totalReferrals: v.optional(v.number()), // Successful placements
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // SIL Providers table - Supported Independent Living providers
  silProviders: defineTable({
    companyName: v.string(),
    contactName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    abn: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    // Areas they cover
    areas: v.array(v.string()),
    // Services offered
    services: v.optional(v.array(v.string())), // e.g., ["24/7 Support", "Daily Living", "Community Access"]
    ndisRegistrationNumber: v.optional(v.string()),
    // Relationship
    relationship: v.optional(v.string()), // How we know them
    notes: v.optional(v.string()),
    rating: v.optional(v.number()), // 1-5 star rating
    // Tracking
    lastContactedDate: v.optional(v.string()),
    totalParticipants: v.optional(v.number()), // Participants they support in our properties
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // SIL Provider Participant History - links SIL providers to participants
  silProviderParticipants: defineTable({
    silProviderId: v.id("silProviders"),
    participantId: v.id("participants"),
    relationshipType: v.union(
      v.literal("current"), // Currently providing SIL
      v.literal("past"), // Previously provided SIL
      v.literal("inquiry") // Made inquiry about
    ),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_provider", ["silProviderId"])
    .index("by_participant", ["participantId"]),

  // SIL Provider Properties - links SIL providers to properties they manage/look after
  // NOTE: Deprecated - use silProviderDwellings for dwelling-level allocation
  silProviderProperties: defineTable({
    silProviderId: v.id("silProviders"),
    propertyId: v.id("properties"),
    accessLevel: v.union(
      v.literal("full"), // Full access to incidents and maintenance
      v.literal("incidents_only"), // Only incidents
      v.literal("maintenance_only"), // Only maintenance
      v.literal("view_only") // Read-only access
    ),
    startDate: v.optional(v.string()), // When they started managing this property
    endDate: v.optional(v.string()), // When they stopped (if no longer active)
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_provider", ["silProviderId"])
    .index("by_property", ["propertyId"])
    .index("by_isActive", ["isActive"]),

  // SIL Provider Dwellings - links SIL providers to individual dwellings they manage
  // This allows different SIL providers for different dwellings within the same property
  silProviderDwellings: defineTable({
    silProviderId: v.id("silProviders"),
    dwellingId: v.id("dwellings"),
    accessLevel: v.union(
      v.literal("full"), // Full access to incidents and maintenance
      v.literal("incidents_only"), // Only incidents
      v.literal("maintenance_only"), // Only maintenance
      v.literal("view_only") // Read-only access
    ),
    startDate: v.optional(v.string()), // When they started managing this dwelling
    endDate: v.optional(v.string()), // When they stopped (if no longer active)
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_provider", ["silProviderId"])
    .index("by_dwelling", ["dwellingId"])
    .index("by_isActive", ["isActive"]),

  // Occupational Therapists table - OTs who work with participants
  occupationalTherapists: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    organization: v.optional(v.string()), // Practice/company name
    email: v.string(),
    phone: v.optional(v.string()),
    abn: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    // Areas they cover
    areas: v.array(v.string()),
    // Specializations
    specializations: v.optional(v.array(v.string())), // e.g., ["SDA Assessments", "AT Prescription", "Home Modifications"]
    ahpraNumber: v.optional(v.string()), // AHPRA registration number
    // Relationship
    relationship: v.optional(v.string()), // How we know them
    notes: v.optional(v.string()),
    rating: v.optional(v.number()), // 1-5 star rating
    // Tracking
    lastContactedDate: v.optional(v.string()),
    totalAssessments: v.optional(v.number()), // SDA assessments completed
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // OT Participant History - links OTs to participants
  otParticipants: defineTable({
    occupationalTherapistId: v.id("occupationalTherapists"),
    participantId: v.id("participants"),
    relationshipType: v.union(
      v.literal("sda_assessment"), // Completed SDA assessment
      v.literal("ongoing"), // Ongoing therapy/support
      v.literal("at_prescription"), // AT prescription
      v.literal("home_mod"), // Home modifications assessment
      v.literal("inquiry") // Made inquiry about
    ),
    assessmentDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_ot", ["occupationalTherapistId"])
    .index("by_participant", ["participantId"]),

  // Support Coordinator Participant History - links coordinators to participants they've worked with
  supportCoordinatorParticipants: defineTable({
    supportCoordinatorId: v.id("supportCoordinators"),
    participantId: v.id("participants"),
    relationshipType: v.union(
      v.literal("referred"), // They referred this participant to us
      v.literal("current"), // Currently their coordinator
      v.literal("past"), // Was their coordinator previously
      v.literal("inquiry") // Made inquiry about but didn't proceed
    ),
    startDate: v.optional(v.string()), // When relationship started
    endDate: v.optional(v.string()), // When relationship ended (if past)
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_coordinator", ["supportCoordinatorId"])
    .index("by_participant", ["participantId"]),

  // Vacancy Listings - track where vacancies are advertised
  vacancyListings: defineTable({
    dwellingId: v.id("dwellings"),
    // Platform listings (manual checklist)
    goNestListed: v.optional(v.boolean()),
    goNestListedDate: v.optional(v.string()),
    goNestListingUrl: v.optional(v.string()),
    housingHubListed: v.optional(v.boolean()),
    housingHubListedDate: v.optional(v.string()),
    housingHubListingUrl: v.optional(v.string()),
    ndisNotified: v.optional(v.boolean()),
    ndisNotifiedDate: v.optional(v.string()),
    ndisReferenceNumber: v.optional(v.string()),
    // Support coordinator notifications
    coordinatorsNotified: v.optional(v.array(v.id("supportCoordinators"))),
    lastNotificationDate: v.optional(v.string()),
    // Status tracking
    vacancyStatus: v.union(
      v.literal("open"), // Actively looking
      v.literal("pending"), // In discussions with potential participant
      v.literal("filled"), // Vacancy filled
      v.literal("on_hold") // Temporarily not seeking
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dwelling", ["dwellingId"])
    .index("by_status", ["vacancyStatus"]),

  // Owner Payments table - outgoing payments to property owners/landlords
  ownerPayments: defineTable({
    propertyId: v.id("properties"),
    ownerId: v.id("owners"),
    participantId: v.optional(v.id("participants")), // Which participant the payment relates to
    paymentType: v.union(
      v.literal("interim"), // Fixed payments while waiting for SDA approval
      v.literal("sda_share"), // Owner's share of SDA revenue
      v.literal("rent_contribution"), // RRC payments forwarded to owner
      v.literal("other")
    ),
    amount: v.number(),
    paymentDate: v.string(), // Date payment was made
    periodStart: v.optional(v.string()), // Start of period covered
    periodEnd: v.optional(v.string()), // End of period covered (e.g., "week ending")
    bankReference: v.optional(v.string()), // Bank transaction reference
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("reconciled")
    ),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_owner", ["ownerId"])
    .index("by_participant", ["participantId"])
    .index("by_payment_date", ["paymentDate"])
    .index("by_type", ["paymentType"]),

  // AI Processing Queue table - for batch document processing
  aiProcessingQueue: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    processingType: v.union(
      v.literal("classification"),
      v.literal("ndis_plan"),
      v.literal("accommodation_agreement"),
      v.literal("csv_claims")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    result: v.optional(v.string()), // JSON string of extraction result
    error: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_createdBy", ["createdBy"]),

  // ============================================
  // FINANCIAL RECONCILIATION TABLES
  // ============================================

  // Bank Accounts table - company bank accounts for reconciliation
  bankAccounts: defineTable({
    accountName: v.string(), // e.g., "Operating Account", "Trust Account"
    bankName: v.string(), // e.g., "ANZ", "Westpac"
    bsb: v.string(),
    accountNumber: v.string(),
    accountType: v.union(
      v.literal("operating"), // Main operating account
      v.literal("trust") // Client trust account
    ),
    currency: v.optional(v.string()), // Default: "AUD"
    isActive: v.boolean(),
    openingBalance: v.optional(v.number()),
    openingBalanceDate: v.optional(v.string()),
    lastReconciledDate: v.optional(v.string()),
    lastReconciledBalance: v.optional(v.number()),
    notes: v.optional(v.string()),
    organizationId: v.optional(v.string()), // Future SaaS multi-tenancy
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_accountType", ["accountType"])
    .index("by_isActive", ["isActive"])
    .index("by_organizationId", ["organizationId"]),

  // Bank Transactions table - imported bank statement transactions
  bankTransactions: defineTable({
    bankAccountId: v.id("bankAccounts"),
    transactionDate: v.string(), // YYYY-MM-DD
    description: v.string(), // Bank description/narration
    reference: v.optional(v.string()), // Bank reference number
    amount: v.number(), // Positive = credit (money in), Negative = debit (money out)
    balance: v.optional(v.number()), // Running balance after transaction
    transactionType: v.union(
      v.literal("credit"), // Money in
      v.literal("debit") // Money out
    ),
    // Categorization
    category: v.optional(
      v.union(
        v.literal("sda_income"), // SDA funding received from NDIS/plan manager
        v.literal("rrc_income"), // RRC (rent contribution) received
        v.literal("owner_payment"), // Payment to property owner
        v.literal("maintenance"), // Maintenance expense
        v.literal("other_income"),
        v.literal("other_expense"),
        v.literal("transfer"), // Internal transfer between accounts
        v.literal("uncategorized")
      )
    ),
    // Matching to existing records
    matchStatus: v.union(
      v.literal("unmatched"), // Not yet matched
      v.literal("matched"), // Matched to a payment/claim
      v.literal("partially_matched"), // Part of a split payment
      v.literal("excluded") // Marked to ignore (e.g., bank fees)
    ),
    matchedPaymentId: v.optional(v.id("payments")), // Linked SDA payment record
    matchedOwnerPaymentId: v.optional(v.id("ownerPayments")), // Linked owner payment
    matchedClaimId: v.optional(v.id("claims")), // Linked claim
    matchedParticipantId: v.optional(v.id("participants")), // For RRC matching
    matchedExpectedPaymentId: v.optional(v.id("expectedPayments")),
    matchConfidence: v.optional(v.number()), // 0-100 auto-match confidence score
    // Import metadata
    importSource: v.union(
      v.literal("csv_anz"), // ANZ CSV import
      v.literal("csv_westpac"), // Westpac CSV import
      v.literal("csv_other"), // Other bank CSV
      v.literal("manual"), // Manual entry
      v.literal("xero_sync") // Synced from Xero
    ),
    importBatchId: v.optional(v.string()), // Group transactions from same import
    rawData: v.optional(v.string()), // Original CSV row as JSON (for debugging)
    // Xero integration
    xeroTransactionId: v.optional(v.string()),
    xeroSyncStatus: v.optional(
      v.union(v.literal("pending"), v.literal("synced"), v.literal("error"))
    ),
    notes: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_bankAccount", ["bankAccountId"])
    .index("by_date", ["transactionDate"])
    .index("by_matchStatus", ["matchStatus"])
    .index("by_category", ["category"])
    .index("by_importBatch", ["importBatchId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_bankAccount_date", ["bankAccountId", "transactionDate"])
    .index("by_bankAccount_matchStatus", ["bankAccountId", "matchStatus"]),

  // Expected Payments table - scheduled/expected payments for matching
  expectedPayments: defineTable({
    paymentType: v.union(
      v.literal("sda_income"), // Expected SDA payment from NDIS/plan manager
      v.literal("rrc_income"), // Expected RRC from participant
      v.literal("owner_disbursement") // Scheduled payment to owner
    ),
    // Links to related records
    participantId: v.optional(v.id("participants")),
    planId: v.optional(v.id("participantPlans")),
    propertyId: v.optional(v.id("properties")),
    ownerId: v.optional(v.id("owners")),
    // Amount and timing
    expectedAmount: v.number(),
    expectedDate: v.string(), // YYYY-MM-DD
    periodMonth: v.string(), // YYYY-MM format for the period
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    // Status tracking
    status: v.union(
      v.literal("pending"), // Awaiting payment
      v.literal("partial"), // Partially received
      v.literal("received"), // Fully received
      v.literal("overdue"), // Past expected date, not received
      v.literal("cancelled") // Cancelled/no longer expected
    ),
    receivedAmount: v.optional(v.number()),
    receivedDate: v.optional(v.string()),
    variance: v.optional(v.number()), // Difference from expected
    // Matched bank transaction
    matchedTransactionId: v.optional(v.id("bankTransactions")),
    matchedTransactionIds: v.optional(v.array(v.id("bankTransactions"))), // For split payments
    // Source tracking
    sourceType: v.optional(
      v.union(
        v.literal("auto_generated"), // System generated from schedules
        v.literal("manual") // Manually created
      )
    ),
    paymentScheduleId: v.optional(v.id("paymentSchedules")),
    notes: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["paymentType"])
    .index("by_status", ["status"])
    .index("by_expectedDate", ["expectedDate"])
    .index("by_periodMonth", ["periodMonth"])
    .index("by_participant", ["participantId"])
    .index("by_property", ["propertyId"])
    .index("by_owner", ["ownerId"])
    .index("by_organizationId", ["organizationId"]),

  // Payment Schedules table - recurring payment configurations
  paymentSchedules: defineTable({
    scheduleType: v.union(
      v.literal("owner_disbursement"), // Monthly owner payments
      v.literal("sda_claim") // Expected SDA claim receipts
    ),
    // Links
    propertyId: v.optional(v.id("properties")),
    ownerId: v.optional(v.id("owners")),
    participantId: v.optional(v.id("participants")),
    // Schedule configuration
    frequency: v.union(
      v.literal("weekly"),
      v.literal("fortnightly"),
      v.literal("monthly")
    ),
    dayOfMonth: v.optional(v.number()), // For monthly (1-31), default: 5 for owner payments
    dayOfWeek: v.optional(v.number()), // For weekly (0-6, 0=Sunday)
    // Amount calculation
    calculationMethod: v.union(
      v.literal("calculated"), // Auto-calculate from participants
      v.literal("fixed") // Fixed amount
    ),
    fixedAmount: v.optional(v.number()), // Used when calculationMethod is "fixed"
    // Tracking
    nextDueDate: v.string(), // Next scheduled date
    lastProcessedDate: v.optional(v.string()),
    lastCalculatedAmount: v.optional(v.number()),
    // Alert settings
    alertDaysBefore: v.optional(v.number()), // Days before to create alert (default: 3)
    autoCreateExpected: v.boolean(), // Auto-create expectedPayments records
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_owner", ["ownerId"])
    .index("by_participant", ["participantId"])
    .index("by_nextDueDate", ["nextDueDate"])
    .index("by_scheduleType", ["scheduleType"])
    .index("by_isActive", ["isActive"])
    .index("by_organizationId", ["organizationId"]),

  // Xero Connections table - OAuth credentials for Xero integration
  xeroConnections: defineTable({
    tenantId: v.string(), // Xero tenant/organization ID
    tenantName: v.string(), // Display name from Xero
    accessToken: v.string(), // Encrypted OAuth access token
    refreshToken: v.string(), // Encrypted OAuth refresh token
    tokenExpiresAt: v.number(), // Timestamp when access token expires
    scope: v.optional(v.string()), // OAuth scopes granted
    connectionStatus: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error"),
      v.literal("token_expired")
    ),
    lastSyncAt: v.optional(v.number()),
    lastSyncError: v.optional(v.string()),
    // Account mapping settings
    defaultIncomeAccountCode: v.optional(v.string()),
    defaultExpenseAccountCode: v.optional(v.string()),
    sdaRevenueAccountCode: v.optional(v.string()),
    rrcRevenueAccountCode: v.optional(v.string()),
    managementFeeAccountCode: v.optional(v.string()),
    // Sync preferences
    autoSyncEnabled: v.boolean(),
    syncFrequencyMinutes: v.optional(v.number()),
    organizationId: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_status", ["connectionStatus"])
    .index("by_organizationId", ["organizationId"]),

  // ============================================
  // COMPLIANCE & CERTIFICATION TABLES
  // ============================================

  // Compliance Certifications table - track NDIS and SDA certifications
  complianceCertifications: defineTable({
    certificationType: v.union(
      v.literal("ndis_practice_standards"), // NDIS Practice Standards certification (3-year)
      v.literal("ndis_verification_audit"), // Annual verification audit
      v.literal("sda_design_standard"), // SDA Design Standard certification
      v.literal("sda_registration"), // SDA Provider registration
      v.literal("ndis_worker_screening"), // Worker screening clearances
      v.literal("fire_safety"), // Fire safety certification
      v.literal("building_compliance"), // Building compliance certificate
      v.literal("other")
    ),
    certificationName: v.string(), // e.g., "Core Module Certification"
    // Linked entity (property-specific or organization-wide)
    propertyId: v.optional(v.id("properties")),
    dwellingId: v.optional(v.id("dwellings")),
    isOrganizationWide: v.optional(v.boolean()), // True if applies to whole organization
    // Certification details
    certifyingBody: v.optional(v.string()), // e.g., "SAI Global", "BSI"
    certificateNumber: v.optional(v.string()),
    issueDate: v.string(),
    expiryDate: v.string(),
    // Audit details
    lastAuditDate: v.optional(v.string()),
    nextAuditDate: v.optional(v.string()),
    auditorName: v.optional(v.string()),
    auditOutcome: v.optional(v.union(
      v.literal("pass"),
      v.literal("conditional_pass"),
      v.literal("fail"),
      v.literal("pending")
    )),
    // Documents
    certificateStorageId: v.optional(v.id("_storage")), // Uploaded certificate
    // Status
    status: v.union(
      v.literal("current"),
      v.literal("expiring_soon"), // Within 90 days of expiry
      v.literal("expired"),
      v.literal("pending_renewal")
    ),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["certificationType"])
    .index("by_property", ["propertyId"])
    .index("by_dwelling", ["dwellingId"])
    .index("by_status", ["status"])
    .index("by_expiryDate", ["expiryDate"]),

  // Insurance Policies table - track required insurance policies
  insurancePolicies: defineTable({
    insuranceType: v.union(
      v.literal("public_liability"), // Minimum $20M for NDIS
      v.literal("professional_indemnity"),
      v.literal("building"), // Building/property insurance
      v.literal("contents"),
      v.literal("workers_compensation"),
      v.literal("cyber"),
      v.literal("directors_officers"),
      v.literal("other")
    ),
    policyName: v.string(),
    insurer: v.string(), // Insurance company name
    policyNumber: v.string(),
    // Coverage
    coverageAmount: v.number(), // e.g., 20000000 for $20M
    excessAmount: v.optional(v.number()), // Policy excess
    // Linked entity
    propertyId: v.optional(v.id("properties")), // For building insurance
    isOrganizationWide: v.optional(v.boolean()),
    // Dates
    startDate: v.string(),
    endDate: v.string(),
    renewalDate: v.optional(v.string()),
    // Premium
    annualPremium: v.optional(v.number()),
    paymentFrequency: v.optional(v.union(
      v.literal("annual"),
      v.literal("monthly"),
      v.literal("quarterly")
    )),
    // Documents
    policyDocumentStorageId: v.optional(v.id("_storage")),
    certificateStorageId: v.optional(v.id("_storage")), // Certificate of currency
    // Status
    status: v.union(
      v.literal("current"),
      v.literal("expiring_soon"),
      v.literal("expired"),
      v.literal("pending_renewal")
    ),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["insuranceType"])
    .index("by_property", ["propertyId"])
    .index("by_status", ["status"])
    .index("by_endDate", ["endDate"]),

  // Complaints Register table - NDIS requires complaints management system
  complaints: defineTable({
    // Complainant details
    complainantType: v.union(
      v.literal("participant"),
      v.literal("family_carer"),
      v.literal("support_coordinator"),
      v.literal("sil_provider"),
      v.literal("staff"),
      v.literal("anonymous"),
      v.literal("other")
    ),
    complainantName: v.optional(v.string()),
    complainantContact: v.optional(v.string()),
    participantId: v.optional(v.id("participants")),
    propertyId: v.optional(v.id("properties")),
    // Complaint details
    complaintDate: v.string(),
    receivedDate: v.string(), // Date complaint was received
    receivedBy: v.id("users"),
    category: v.union(
      v.literal("service_delivery"),
      v.literal("staff_conduct"),
      v.literal("property_condition"),
      v.literal("communication"),
      v.literal("billing"),
      v.literal("privacy"),
      v.literal("safety"),
      v.literal("other")
    ),
    description: v.string(),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    // Acknowledgment (required within 5 business days)
    acknowledgedDate: v.optional(v.string()),
    acknowledgmentMethod: v.optional(v.union(
      v.literal("email"),
      v.literal("phone"),
      v.literal("letter"),
      v.literal("in_person")
    )),
    acknowledgmentOverdue: v.optional(v.boolean()),
    // Resolution
    assignedTo: v.optional(v.id("users")),
    investigationNotes: v.optional(v.string()),
    resolutionDate: v.optional(v.string()),
    resolutionDescription: v.optional(v.string()),
    resolutionOutcome: v.optional(v.union(
      v.literal("upheld"),
      v.literal("partially_upheld"),
      v.literal("not_upheld"),
      v.literal("withdrawn")
    )),
    complainantSatisfied: v.optional(v.boolean()),
    // Advocacy
    advocacyOffered: v.optional(v.boolean()),
    advocacyAccepted: v.optional(v.boolean()),
    advocacyProvider: v.optional(v.string()), // e.g., "Disability Advocacy NSW"
    // Escalation
    escalatedToNdisCommission: v.optional(v.boolean()),
    escalationDate: v.optional(v.string()),
    escalationReason: v.optional(v.string()),
    // Status
    status: v.union(
      v.literal("received"),
      v.literal("acknowledged"),
      v.literal("under_investigation"),
      v.literal("resolved"),
      v.literal("closed"),
      v.literal("escalated")
    ),
    // Learnings
    systemicIssueIdentified: v.optional(v.boolean()),
    correctiveActionsTaken: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_participant", ["participantId"])
    .index("by_property", ["propertyId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_severity", ["severity"]),

  // ============================================
  // COMMUNICATIONS & TASKS TABLES
  // ============================================

  // Communications table - log of all external communications for follow-up tracking
  communications: defineTable({
    // Communication details
    communicationType: v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("phone_call"),
      v.literal("meeting"),
      v.literal("other")
    ),
    direction: v.union(
      v.literal("sent"),
      v.literal("received")
    ),
    communicationDate: v.string(), // YYYY-MM-DD
    communicationTime: v.optional(v.string()), // HH:MM

    // Contact details
    contactType: v.union(
      v.literal("ndia"),
      v.literal("support_coordinator"),
      v.literal("sil_provider"),
      v.literal("participant"),
      v.literal("family"),
      v.literal("plan_manager"),
      v.literal("ot"),
      v.literal("contractor"),
      v.literal("other")
    ),
    contactName: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),

    // Content
    subject: v.optional(v.string()), // Subject line for emails
    summary: v.string(), // Main notes/summary

    // NDIS Compliance (optional until migration complete)
    complianceCategory: v.optional(v.union(
      v.literal("routine"),
      v.literal("incident_related"),
      v.literal("complaint"),
      v.literal("safeguarding"),
      v.literal("plan_review"),
      v.literal("access_request"),
      v.literal("quality_audit"),
      v.literal("advocacy"),
      v.literal("none")
    )),
    complianceFlags: v.optional(v.array(v.union(
      v.literal("requires_documentation"),
      v.literal("time_sensitive"),
      v.literal("escalation_required"),
      v.literal("ndia_reportable"),
      v.literal("legal_hold")
    ))),

    // Threading (optional until migration complete)
    threadId: v.optional(v.string()),
    parentCommunicationId: v.optional(v.id("communications")),
    isThreadStarter: v.optional(v.boolean()), // TODO: Make required after migration
    threadParticipants: v.optional(v.array(v.string())),

    // Stakeholder linking (DB relationships)
    stakeholderEntityType: v.optional(v.union(
      v.literal("support_coordinator"),
      v.literal("sil_provider"),
      v.literal("occupational_therapist"),
      v.literal("contractor"),
      v.literal("participant")
    )),
    stakeholderEntityId: v.optional(v.string()),

    // Consultation Gate (optional until migration complete)
    requiresFollowUp: v.optional(v.boolean()), // TODO: Make required after migration
    followUpDueDate: v.optional(v.string()), // YYYY-MM-DD
    followUpStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("overdue"),
      v.literal("cancelled")
    )),
    consultationOutcome: v.optional(v.union(
      v.literal("resolved"),
      v.literal("escalated"),
      v.literal("pending_participant_response"),
      v.literal("pending_ndia_response"),
      v.literal("requires_meeting"),
      v.literal("documentation_required")
    )),

    // Participant involvement (optional until migration complete)
    isParticipantInvolved: v.optional(v.boolean()), // TODO: Make required after migration
    participantConsentGiven: v.optional(v.boolean()),

    // Multiple attachments (replaces single attachmentStorageId)
    attachmentStorageIds: v.optional(v.array(v.string())),
    attachmentMetadata: v.optional(v.array(v.object({
      fileName: v.string(),
      fileSize: v.number(),
      fileType: v.string(),
      uploadedAt: v.number()
    }))),

    // Linking - updated naming
    participantId: v.optional(v.id("participants")), // TODO: Make required after migration - renamed from linkedParticipantId
    linkedParticipantIds: v.optional(v.array(v.id("participants"))), // Multi-participant communications
    linkedPropertyId: v.optional(v.id("properties")),

    // Legacy fields - kept during migration transition
    linkedParticipantId: v.optional(v.id("participants")), // DEPRECATED: Use participantId
    attachmentStorageId: v.optional(v.id("_storage")), // DEPRECATED: Use attachmentStorageIds
    attachmentFileName: v.optional(v.string()), // DEPRECATED
    attachmentFileType: v.optional(v.string()), // DEPRECATED

    // Migration tracking
    migrated_v2: v.optional(v.boolean()),

    // Read tracking
    readAt: v.optional(v.string()), // ISO string when message was read

    // Metadata
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_participant", ["linkedParticipantId"])
    .index("by_property", ["linkedPropertyId"])
    .index("by_date", ["communicationDate"])
    .index("by_contactType", ["contactType"])
    .index("by_type", ["communicationType"])
    .index("by_createdBy", ["createdBy"])
    // NEW INDEXES for v2
    .index("by_thread", ["threadId", "createdAt"])
    .index("by_participant_compliance", ["participantId", "complianceCategory", "createdAt"])
    .index("by_stakeholder", ["stakeholderEntityType", "stakeholderEntityId", "createdAt"])
    .index("by_follow_up", ["requiresFollowUp", "followUpDueDate"]),

  // Thread summaries table - performance cache for thread views
  threadSummaries: defineTable({
    threadId: v.string(),
    participantId: v.id("participants"),
    startedAt: v.number(),
    lastActivityAt: v.number(),
    messageCount: v.number(),
    participantNames: v.array(v.string()),
    subject: v.string(),
    previewText: v.string(),
    hasUnread: v.boolean(),
    complianceCategories: v.array(v.string()),
    requiresAction: v.boolean(),
  })
    .index("by_participant_activity", ["participantId", "lastActivityAt"])
    .index("by_thread", ["threadId"]),

  // Tasks table - follow-up tasks and action items
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),

    // Scheduling
    dueDate: v.string(), // YYYY-MM-DD
    reminderDate: v.optional(v.string()), // YYYY-MM-DD

    // Classification
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    category: v.union(
      v.literal("funding"),
      v.literal("plan_approval"),
      v.literal("documentation"),
      v.literal("follow_up"),
      v.literal("general")
    ),

    // Linking
    linkedParticipantId: v.optional(v.id("participants")),
    linkedPropertyId: v.optional(v.id("properties")),
    linkedCommunicationId: v.optional(v.id("communications")), // Created from a communication

    // Assignment
    assignedToUserId: v.optional(v.id("users")),

    // Completion tracking
    completedDate: v.optional(v.string()),
    completedBy: v.optional(v.id("users")),
    completionNotes: v.optional(v.string()),

    // Metadata
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_participant", ["linkedParticipantId"])
    .index("by_property", ["linkedPropertyId"])
    .index("by_communication", ["linkedCommunicationId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_dueDate", ["dueDate"])
    .index("by_assignedTo", ["assignedToUserId"])
    .index("by_category", ["category"])
    .index("by_status_dueDate", ["status", "dueDate"])
    .index("by_status_priority", ["status", "priority"])
    .index("by_createdBy", ["createdBy"]),
});
