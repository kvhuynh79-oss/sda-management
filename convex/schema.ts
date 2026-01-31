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
      v.literal("accountant")
    ),
    phone: v.optional(v.string()),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

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
        v.literal("sil_property") // SIL property managed for other providers
      )
    ),
    expectedCompletionDate: v.optional(v.string()), // For under_construction properties
    silProviderName: v.optional(v.string()), // For SIL properties - the provider we manage for
    ownerId: v.id("owners"),
    ownershipType: v.union(v.literal("investor"), v.literal("self_owned")),
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
    .index("by_propertyStatus", ["propertyStatus"]),

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
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_occupancyStatus", ["occupancyStatus"]),

  // Participants table - NDIS participants
  participants: defineTable({
    ndisNumber: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),
    dwellingId: v.id("dwellings"),
    moveInDate: v.string(),
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
    .index("by_dwelling", ["dwellingId"])
    .index("by_status", ["status"]),

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
    .index("by_status", ["planStatus"]),

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
    .index("by_date", ["paymentDate"]),

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
    .index("by_status", ["status"]),

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
    quotedAmount: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    invoiceNumber: v.optional(v.string()),
    completionNotes: v.optional(v.string()), // How completion was confirmed
    warrantyPeriodMonths: v.optional(v.number()), // Warranty period in months
    warrantyExpiryDate: v.optional(v.string()), // Auto-calculated warranty end date
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dwelling", ["dwellingId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

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
    contractorName: v.string(),
    contractorContact: v.optional(v.string()),
    contractorEmail: v.optional(v.string()),
    quoteAmount: v.number(),
    quoteDate: v.string(),
    validUntil: v.optional(v.string()), // Quote expiry date
    estimatedDays: v.optional(v.number()), // Estimated days to complete
    warrantyMonths: v.optional(v.number()), // Warranty offered
    description: v.optional(v.string()), // Quote details/scope
    status: v.union(
      v.literal("pending"), // Quote received, awaiting decision
      v.literal("accepted"), // Quote accepted, contractor awarded
      v.literal("rejected"), // Quote rejected
      v.literal("expired") // Quote expired
    ),
    acceptedDate: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_maintenance_request", ["maintenanceRequestId"])
    .index("by_status", ["status"]),

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
    .index("by_nextDueDate", ["nextDueDate"]),

  // Documents table - file uploads
  documents: defineTable({
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    storageId: v.id("_storage"),
    documentType: v.union(
      v.literal("ndis_plan"),
      v.literal("service_agreement"),
      v.literal("lease"),
      v.literal("insurance"),
      v.literal("compliance"),
      v.literal("centrepay_consent"),
      v.literal("report"),
      v.literal("other")
    ),
    documentCategory: v.union(
      v.literal("participant"),
      v.literal("property"),
      v.literal("dwelling"),
      v.literal("owner")
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
    .index("by_documentType", ["documentType"]),

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
      v.literal("preventative_schedule_due")
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
    .index("by_severity", ["severity"]),

  // Incidents table - incident reports for properties/participants
  incidents: defineTable({
    propertyId: v.id("properties"),
    dwellingId: v.optional(v.id("dwellings")),
    participantId: v.optional(v.id("participants")), // Optional - if incident involves specific participant
    incidentType: v.union(
      v.literal("injury"),
      v.literal("near_miss"),
      v.literal("property_damage"),
      v.literal("behavioral"),
      v.literal("medication"),
      v.literal("abuse_neglect"),
      v.literal("complaint"),
      v.literal("other")
    ),
    severity: v.union(
      v.literal("minor"),
      v.literal("moderate"),
      v.literal("major"),
      v.literal("critical")
    ),
    title: v.string(),
    description: v.string(),
    incidentDate: v.string(),
    incidentTime: v.optional(v.string()),
    location: v.optional(v.string()), // Where in the property
    witnessNames: v.optional(v.string()),
    immediateActionTaken: v.optional(v.string()),
    followUpRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
    reportedToNdis: v.optional(v.boolean()),
    ndisReportDate: v.optional(v.string()),
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
    .index("by_severity", ["severity"]),

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
});
