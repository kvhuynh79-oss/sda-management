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
    ownerId: v.id("owners"),
    ownershipType: v.union(v.literal("investor"), v.literal("self_owned")),
    revenueSharePercent: v.optional(v.number()),
    sdaRegistrationNumber: v.optional(v.string()),
    sdaRegistrationDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_state", ["state"]),

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
    dailySdaRate: v.number(),
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
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    scheduledDate: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    contractorName: v.optional(v.string()),
    contractorContact: v.optional(v.string()),
    quotedAmount: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    invoiceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dwelling", ["dwellingId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

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
    storageId: v.string(),
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
});
