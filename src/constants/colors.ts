// Status colors for various entity states
export const STATUS_COLORS = {
  active: "bg-green-500/20 text-green-400",
  inactive: "bg-gray-500/20 text-gray-400",
  pending: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-teal-600/20 text-teal-500",
  cancelled: "bg-red-500/20 text-red-400",
  archived: "bg-gray-500/20 text-gray-400",
} as const;

// Maintenance request status colors
export const MAINTENANCE_STATUS_COLORS = {
  open: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-teal-600/20 text-teal-500",
  awaiting_parts: "bg-purple-500/20 text-purple-400",
  awaiting_quote: "bg-orange-500/20 text-orange-400",
  scheduled: "bg-cyan-500/20 text-cyan-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-gray-500/20 text-gray-400",
} as const;

// Employment type colors
export const EMPLOYMENT_TYPE_COLORS = {
  full_time: "bg-green-500/20 text-green-400",
  part_time: "bg-blue-500/20 text-blue-400",
  casual: "bg-yellow-500/20 text-yellow-400",
  contractor: "bg-purple-500/20 text-purple-400",
} as const;

// Screening status colors
export const SCREENING_STATUS_COLORS = {
  current: "bg-green-500/20 text-green-400",
  expiring_soon: "bg-yellow-500/20 text-yellow-400",
  expired: "bg-red-500/20 text-red-400",
  not_recorded: "bg-gray-500/20 text-gray-400",
} as const;

// Priority colors
export const PRIORITY_COLORS = {
  low: "bg-gray-500/20 text-gray-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
  critical: "bg-red-600/30 text-red-300",
} as const;

// Incident severity colors
export const SEVERITY_COLORS = {
  minor: "bg-gray-500/20 text-gray-400",
  moderate: "bg-yellow-500/20 text-yellow-400",
  major: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
} as const;

// Incident type colors
export const INCIDENT_TYPE_COLORS = {
  injury: "bg-red-500/20 text-red-400",
  property_damage: "bg-orange-500/20 text-orange-400",
  behavioral: "bg-yellow-500/20 text-yellow-400",
  medication: "bg-purple-500/20 text-purple-400",
  near_miss: "bg-teal-600/20 text-teal-500",
  complaint: "bg-pink-500/20 text-pink-400",
  safeguarding: "bg-red-600/30 text-red-300",
  other: "bg-gray-500/20 text-gray-400",
} as const;

// Payment status colors
export const PAYMENT_STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400",
  submitted: "bg-teal-600/20 text-teal-500",
  paid: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  partial: "bg-orange-500/20 text-orange-400",
} as const;

// Document type colors
export const DOCUMENT_TYPE_COLORS = {
  ndis_plan: "bg-teal-600/20 text-teal-500",
  service_agreement: "bg-purple-500/20 text-purple-400",
  lease: "bg-green-500/20 text-green-400",
  insurance: "bg-orange-500/20 text-orange-400",
  compliance: "bg-yellow-500/20 text-yellow-400",
  other: "bg-gray-500/20 text-gray-400",
} as const;

// Relationship type colors (Support Coordinators, SIL Providers)
export const RELATIONSHIP_TYPE_COLORS = {
  referred: "bg-green-500/20 text-green-400",
  current: "bg-teal-600/20 text-teal-500",
  past: "bg-gray-500/20 text-gray-400",
  inquiry: "bg-yellow-500/20 text-yellow-400",
} as const;

// Rating colors (1-5 stars)
export const RATING_COLORS = {
  1: "text-red-400",
  2: "text-orange-400",
  3: "text-yellow-400",
  4: "text-lime-400",
  5: "text-green-400",
} as const;

// SDA Category colors
export const SDA_CATEGORY_COLORS = {
  improved_liveability: "bg-teal-600/20 text-teal-500",
  fully_accessible: "bg-purple-500/20 text-purple-400",
  robust: "bg-orange-500/20 text-orange-400",
  high_physical_support: "bg-green-500/20 text-green-400",
} as const;

// Alert type colors
export const ALERT_TYPE_COLORS = {
  expiry_warning: "bg-yellow-500/20 text-yellow-400",
  overdue: "bg-red-500/20 text-red-400",
  reminder: "bg-teal-600/20 text-teal-500",
  vacancy: "bg-purple-500/20 text-purple-400",
  compliance: "bg-orange-500/20 text-orange-400",
} as const;

// Occupancy colors (for property cards)
export const OCCUPANCY_COLORS = {
  full: "bg-green-600",
  partial: "bg-yellow-600",
  empty: "bg-red-600",
} as const;

// Property status colors with labels
export const PROPERTY_STATUS_COLORS = {
  active: { bg: "bg-green-600", label: "Active" },
  under_construction: { bg: "bg-yellow-600", label: "Under Construction" },
  planning: { bg: "bg-teal-700", label: "Planning" },
  sil_property: { bg: "bg-purple-600", label: "SIL Property" },
  inactive: { bg: "bg-gray-600", label: "Inactive" },
} as const;

// Inspection status colors
export const INSPECTION_STATUS_COLORS = {
  draft: "bg-gray-600",
  in_progress: "bg-yellow-600",
  completed: "bg-green-600",
  cancelled: "bg-red-600",
} as const;

// Contractor specialty colors
export const SPECIALTY_COLORS = {
  plumbing: "bg-teal-700",
  electrical: "bg-yellow-600",
  hvac: "bg-cyan-600",
  general: "bg-gray-600",
  landscaping: "bg-green-600",
  cleaning: "bg-purple-600",
  pest_control: "bg-orange-600",
  roofing: "bg-red-600",
  painting: "bg-pink-600",
  carpentry: "bg-amber-600",
  appliances: "bg-indigo-600",
  fire_safety: "bg-red-500",
  other: "bg-gray-500",
} as const;

// Helper function to get color class with fallback
export function getStatusColor(status: string, colorMap: Record<string, string>): string {
  return colorMap[status.toLowerCase()] || "bg-gray-500/20 text-gray-400";
}

// Export type helpers
export type StatusType = keyof typeof STATUS_COLORS;
export type MaintenanceStatusType = keyof typeof MAINTENANCE_STATUS_COLORS;
export type PriorityType = keyof typeof PRIORITY_COLORS;
export type SeverityType = keyof typeof SEVERITY_COLORS;
export type IncidentType = keyof typeof INCIDENT_TYPE_COLORS;
export type PaymentStatusType = keyof typeof PAYMENT_STATUS_COLORS;
export type RelationshipType = keyof typeof RELATIONSHIP_TYPE_COLORS;

// Communication type colors
export const COMMUNICATION_TYPE_COLORS = {
  email: "bg-teal-600/20 text-teal-500",
  sms: "bg-green-500/20 text-green-400",
  phone_call: "bg-purple-500/20 text-purple-400",
  meeting: "bg-orange-500/20 text-orange-400",
  other: "bg-gray-500/20 text-gray-400",
} as const;

// Communication direction colors
export const DIRECTION_COLORS = {
  sent: "bg-teal-700",
  received: "bg-green-600",
} as const;

// Contact type colors (for communications)
export const CONTACT_TYPE_COLORS = {
  ndia: "bg-purple-500/20 text-purple-400",
  support_coordinator: "bg-teal-600/20 text-teal-500",
  sil_provider: "bg-orange-500/20 text-orange-400",
  participant: "bg-green-500/20 text-green-400",
  family: "bg-cyan-500/20 text-cyan-400",
  plan_manager: "bg-indigo-500/20 text-indigo-400",
  ot: "bg-pink-500/20 text-pink-400",
  contractor: "bg-yellow-500/20 text-yellow-400",
  other: "bg-gray-500/20 text-gray-400",
} as const;

// Task status colors
export const TASK_STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-teal-600/20 text-teal-500",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-gray-500/20 text-gray-400",
} as const;

// Task category colors
export const TASK_CATEGORY_COLORS = {
  funding: "bg-purple-500/20 text-purple-400",
  plan_approval: "bg-cyan-500/20 text-cyan-400",
  documentation: "bg-orange-500/20 text-orange-400",
  follow_up: "bg-teal-600/20 text-teal-500",
  general: "bg-gray-500/20 text-gray-400",
} as const;

// Compliance category colors
export const COMPLIANCE_CATEGORY_COLORS = {
  routine: "bg-gray-500/20 text-gray-400",
  incident_related: "bg-red-500/20 text-red-400",
  complaint: "bg-yellow-500/20 text-yellow-400",
  safeguarding: "bg-red-600/30 text-red-300",
  plan_review: "bg-teal-600/20 text-teal-500",
  access_request: "bg-purple-500/20 text-purple-400",
  quality_audit: "bg-green-500/20 text-green-400",
  advocacy: "bg-teal-500/20 text-teal-400",
  none: "bg-gray-500/20 text-gray-400",
} as const;

// Compliance flag colors
export const COMPLIANCE_FLAG_COLORS = {
  requires_documentation: "bg-yellow-500/20 text-yellow-400",
  time_sensitive: "bg-red-500/20 text-red-400",
  participant_consent: "bg-teal-600/20 text-teal-500",
  ndia_reportable: "bg-purple-500/20 text-purple-400",
  escalation_required: "bg-red-600/30 text-red-300",
  legal_hold: "bg-orange-500/20 text-orange-400",
} as const;

// Stakeholder type colors
export const STAKEHOLDER_TYPE_COLORS = {
  support_coordinator: "bg-teal-600/20 text-teal-500",
  sil_provider: "bg-orange-500/20 text-orange-400",
  ndia: "bg-purple-500/20 text-purple-400",
  occupational_therapist: "bg-green-500/20 text-green-400",
  guardian: "bg-teal-500/20 text-teal-400",
  advocate: "bg-yellow-500/20 text-yellow-400",
  contractor: "bg-gray-500/20 text-gray-400",
  participant: "bg-teal-600/20 text-teal-500",
  family: "bg-green-500/20 text-green-400",
  other: "bg-gray-500/20 text-gray-400",
} as const;

// Type exports for new colors
export type CommunicationType = keyof typeof COMMUNICATION_TYPE_COLORS;
export type DirectionType = keyof typeof DIRECTION_COLORS;
export type ContactType = keyof typeof CONTACT_TYPE_COLORS;
export type TaskStatusType = keyof typeof TASK_STATUS_COLORS;
export type TaskCategoryType = keyof typeof TASK_CATEGORY_COLORS;
export type ComplianceCategoryType = keyof typeof COMPLIANCE_CATEGORY_COLORS;
export type ComplianceFlagType = keyof typeof COMPLIANCE_FLAG_COLORS;
export type StakeholderType = keyof typeof STAKEHOLDER_TYPE_COLORS;

// Policy status colors
export const POLICY_STATUS_COLORS = {
  draft: "bg-gray-500/20 text-gray-400",
  active: "bg-green-500/20 text-green-400",
  under_review: "bg-yellow-500/20 text-yellow-400",
  archived: "bg-purple-500/20 text-purple-400",
} as const;

export type PolicyStatusType = keyof typeof POLICY_STATUS_COLORS;
