// Status colors for various entity states
export const STATUS_COLORS = {
  active: "bg-green-500/20 text-green-400",
  inactive: "bg-gray-500/20 text-gray-400",
  pending: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-blue-500/20 text-blue-400",
  cancelled: "bg-red-500/20 text-red-400",
  archived: "bg-gray-500/20 text-gray-400",
} as const;

// Maintenance request status colors
export const MAINTENANCE_STATUS_COLORS = {
  open: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  awaiting_parts: "bg-purple-500/20 text-purple-400",
  awaiting_quote: "bg-orange-500/20 text-orange-400",
  scheduled: "bg-cyan-500/20 text-cyan-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-gray-500/20 text-gray-400",
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
  near_miss: "bg-blue-500/20 text-blue-400",
  complaint: "bg-pink-500/20 text-pink-400",
  safeguarding: "bg-red-600/30 text-red-300",
  other: "bg-gray-500/20 text-gray-400",
} as const;

// Payment status colors
export const PAYMENT_STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400",
  submitted: "bg-blue-500/20 text-blue-400",
  paid: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  partial: "bg-orange-500/20 text-orange-400",
} as const;

// Document type colors
export const DOCUMENT_TYPE_COLORS = {
  ndis_plan: "bg-blue-500/20 text-blue-400",
  service_agreement: "bg-purple-500/20 text-purple-400",
  lease: "bg-green-500/20 text-green-400",
  insurance: "bg-orange-500/20 text-orange-400",
  compliance: "bg-yellow-500/20 text-yellow-400",
  other: "bg-gray-500/20 text-gray-400",
} as const;

// Relationship type colors (Support Coordinators, SIL Providers)
export const RELATIONSHIP_TYPE_COLORS = {
  referred: "bg-green-500/20 text-green-400",
  current: "bg-blue-500/20 text-blue-400",
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
  improved_liveability: "bg-blue-500/20 text-blue-400",
  fully_accessible: "bg-purple-500/20 text-purple-400",
  robust: "bg-orange-500/20 text-orange-400",
  high_physical_support: "bg-green-500/20 text-green-400",
} as const;

// Alert type colors
export const ALERT_TYPE_COLORS = {
  expiry_warning: "bg-yellow-500/20 text-yellow-400",
  overdue: "bg-red-500/20 text-red-400",
  reminder: "bg-blue-500/20 text-blue-400",
  vacancy: "bg-purple-500/20 text-purple-400",
  compliance: "bg-orange-500/20 text-orange-400",
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
