"use client";

import { ReactNode } from "react";

// Badge variants
const VARIANTS = {
  // Status variants (with background)
  success: "bg-green-500/20 text-green-400 border-green-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  info: "bg-teal-600/20 text-teal-500 border-teal-600/30",
  neutral: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  pink: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  // Solid variants (for stronger visual emphasis)
  "success-solid": "bg-green-600 text-white border-green-600",
  "warning-solid": "bg-yellow-600 text-white border-yellow-600",
  "error-solid": "bg-red-600 text-white border-red-600",
  "info-solid": "bg-teal-700 text-white border-teal-700",
  "neutral-solid": "bg-gray-600 text-white border-gray-600",
  "purple-solid": "bg-purple-600 text-white border-purple-600",
} as const;

// Size variants
const SIZES = {
  xs: "text-xs px-1.5 py-0.5",
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-sm px-3 py-1.5",
} as const;

type BadgeVariant = keyof typeof VARIANTS;
type BadgeSize = keyof typeof SIZES;

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  // Allow custom color classes (for using existing color constants)
  colorClassName?: string;
  // Optional dot indicator
  dot?: boolean;
  dotColor?: string;
}

export default function Badge({
  children,
  variant = "neutral",
  size = "sm",
  className = "",
  colorClassName,
  dot = false,
  dotColor,
}: BadgeProps) {
  const baseClasses = "inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors";
  const variantClasses = colorClassName || VARIANTS[variant];
  const sizeClasses = SIZES[size];

  return (
    <span className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColor || "bg-current"}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

// Preset badges for common status types
export function StatusBadge({
  status,
  size = "sm",
}: {
  status: "active" | "inactive" | "pending" | "completed" | "cancelled" | "archived";
  size?: BadgeSize;
}) {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    active: { variant: "success", label: "Active" },
    inactive: { variant: "neutral", label: "Inactive" },
    pending: { variant: "warning", label: "Pending" },
    completed: { variant: "info", label: "Completed" },
    cancelled: { variant: "error", label: "Cancelled" },
    archived: { variant: "neutral", label: "Archived" },
  };

  const config = statusConfig[status] || statusConfig.inactive;
  return (
    <Badge variant={config.variant} size={size} dot>
      {config.label}
    </Badge>
  );
}

export function PriorityBadge({
  priority,
  size = "sm",
}: {
  priority: "low" | "medium" | "high" | "urgent" | "critical";
  size?: BadgeSize;
}) {
  const priorityConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    low: { variant: "neutral", label: "Low" },
    medium: { variant: "warning", label: "Medium" },
    high: { variant: "orange", label: "High" },
    urgent: { variant: "error", label: "Urgent" },
    critical: { variant: "error", label: "Critical" },
  };

  const config = priorityConfig[priority] || priorityConfig.medium;
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

export function MaintenanceStatusBadge({
  status,
  size = "sm",
}: {
  status: "open" | "in_progress" | "awaiting_parts" | "awaiting_quote" | "scheduled" | "completed" | "cancelled";
  size?: BadgeSize;
}) {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    open: { variant: "warning", label: "Open" },
    in_progress: { variant: "info", label: "In Progress" },
    awaiting_parts: { variant: "purple", label: "Awaiting Parts" },
    awaiting_quote: { variant: "orange", label: "Awaiting Quote" },
    scheduled: { variant: "cyan", label: "Scheduled" },
    completed: { variant: "success", label: "Completed" },
    cancelled: { variant: "neutral", label: "Cancelled" },
  };

  const config = statusConfig[status] || statusConfig.open;
  return (
    <Badge variant={config.variant} size={size} dot>
      {config.label}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
  size = "sm",
}: {
  status: "pending" | "submitted" | "paid" | "rejected" | "partial";
  size?: BadgeSize;
}) {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: "warning", label: "Pending" },
    submitted: { variant: "info", label: "Submitted" },
    paid: { variant: "success", label: "Paid" },
    rejected: { variant: "error", label: "Rejected" },
    partial: { variant: "orange", label: "Partial" },
  };

  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant={config.variant} size={size} dot>
      {config.label}
    </Badge>
  );
}

export function SeverityBadge({
  severity,
  size = "sm",
}: {
  severity: "minor" | "moderate" | "major" | "critical";
  size?: BadgeSize;
}) {
  const severityConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    minor: { variant: "neutral", label: "Minor" },
    moderate: { variant: "warning", label: "Moderate" },
    major: { variant: "orange", label: "Major" },
    critical: { variant: "error", label: "Critical" },
  };

  const config = severityConfig[severity] || severityConfig.moderate;
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

export function TaskStatusBadge({
  status,
  size = "sm",
}: {
  status: "pending" | "in_progress" | "completed" | "cancelled";
  size?: BadgeSize;
}) {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: "warning", label: "Pending" },
    in_progress: { variant: "info", label: "In Progress" },
    completed: { variant: "success", label: "Completed" },
    cancelled: { variant: "neutral", label: "Cancelled" },
  };

  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant={config.variant} size={size} dot>
      {config.label}
    </Badge>
  );
}

export function TaskCategoryBadge({
  category,
  size = "sm",
}: {
  category: "funding" | "plan_approval" | "documentation" | "follow_up" | "general";
  size?: BadgeSize;
}) {
  const categoryConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    funding: { variant: "purple", label: "Funding" },
    plan_approval: { variant: "cyan", label: "Plan Approval" },
    documentation: { variant: "orange", label: "Documentation" },
    follow_up: { variant: "info", label: "Follow-up" },
    general: { variant: "neutral", label: "General" },
  };

  const config = categoryConfig[category] || categoryConfig.general;
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

export function CommunicationTypeBadge({
  type,
  size = "sm",
}: {
  type: "email" | "sms" | "phone_call" | "meeting" | "other";
  size?: BadgeSize;
}) {
  const typeConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    email: { variant: "info", label: "Email" },
    sms: { variant: "success", label: "SMS" },
    phone_call: { variant: "purple", label: "Phone" },
    meeting: { variant: "orange", label: "Meeting" },
    other: { variant: "neutral", label: "Other" },
  };

  const config = typeConfig[type] || typeConfig.other;
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

export function ContactTypeBadge({
  contactType,
  size = "sm",
}: {
  contactType: "ndia" | "support_coordinator" | "sil_provider" | "participant" | "family" | "plan_manager" | "ot" | "contractor" | "other";
  size?: BadgeSize;
}) {
  const typeConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    ndia: { variant: "purple", label: "NDIA" },
    support_coordinator: { variant: "info", label: "Support Coordinator" },
    sil_provider: { variant: "orange", label: "SIL Provider" },
    participant: { variant: "success", label: "Participant" },
    family: { variant: "cyan", label: "Family" },
    plan_manager: { variant: "purple", label: "Plan Manager" },
    ot: { variant: "pink", label: "OT" },
    contractor: { variant: "warning", label: "Contractor" },
    other: { variant: "neutral", label: "Other" },
  };

  const config = typeConfig[contactType] || typeConfig.other;
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

export function DirectionBadge({
  direction,
  size = "xs",
}: {
  direction: "sent" | "received";
  size?: BadgeSize;
}) {
  const directionConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    sent: { variant: "info-solid", label: "Sent" },
    received: { variant: "success-solid", label: "Received" },
  };

  const config = directionConfig[direction] || directionConfig.sent;
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

export function ComplianceCategoryBadge({
  category,
  size = "sm",
}: {
  category: "routine" | "incident_related" | "complaint" | "safeguarding" | "plan_review" | "access_request" | "quality_audit" | "advocacy" | "none";
  size?: BadgeSize;
}) {
  const categoryConfig: Record<string, { variant: BadgeVariant; label: string; icon: string }> = {
    routine: { variant: "neutral", label: "Routine", icon: "\u2713" },
    incident_related: { variant: "error", label: "Incident Related", icon: "\u26A0" },
    complaint: { variant: "warning", label: "Complaint", icon: "\u2709" },
    safeguarding: { variant: "error", label: "Safeguarding", icon: "\u26D4" },
    plan_review: { variant: "info", label: "Plan Review", icon: "\u2606" },
    access_request: { variant: "purple", label: "Access Request", icon: "\u2192" },
    quality_audit: { variant: "success", label: "Quality Audit", icon: "\u2714" },
    advocacy: { variant: "cyan", label: "Advocacy", icon: "\u2696" },
    none: { variant: "neutral", label: "None", icon: "\u2014" },
  };

  const config = categoryConfig[category] || categoryConfig.none;
  return (
    <Badge variant={config.variant} size={size}>
      <span aria-hidden="true">{config.icon}</span> {config.label}
    </Badge>
  );
}

export function ComplianceFlagBadge({
  flag,
  size = "sm",
}: {
  flag: "requires_documentation" | "time_sensitive" | "participant_consent" | "ndia_reportable" | "escalation_required" | "legal_hold";
  size?: BadgeSize;
}) {
  const flagConfig: Record<string, { variant: BadgeVariant; label: string; icon: string }> = {
    requires_documentation: { variant: "warning", label: "Docs Required", icon: "\u2709" },
    time_sensitive: { variant: "error", label: "Time Sensitive", icon: "\u23F0" },
    participant_consent: { variant: "info", label: "Consent", icon: "\u2714" },
    ndia_reportable: { variant: "purple", label: "NDIA Reportable", icon: "\u2691" },
    escalation_required: { variant: "error", label: "Escalation", icon: "\u26A0" },
    legal_hold: { variant: "orange", label: "Legal Hold", icon: "\u2696" },
  };

  const config = flagConfig[flag] || { variant: "neutral" as BadgeVariant, label: flag, icon: "\u2022" };
  return (
    <Badge variant={config.variant} size={size}>
      <span aria-hidden="true">{config.icon}</span> {config.label}
    </Badge>
  );
}

export function StakeholderTypeBadge({
  type,
  size = "sm",
}: {
  type: "support_coordinator" | "sil_provider" | "ndia" | "occupational_therapist" | "guardian" | "advocate" | "contractor" | "participant" | "family" | "other";
  size?: BadgeSize;
}) {
  const typeConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    support_coordinator: { variant: "info", label: "Support Coordinator" },
    sil_provider: { variant: "orange", label: "SIL Provider" },
    ndia: { variant: "purple", label: "NDIA" },
    occupational_therapist: { variant: "success", label: "OT" },
    guardian: { variant: "cyan", label: "Guardian" },
    advocate: { variant: "warning", label: "Advocate" },
    contractor: { variant: "neutral", label: "Contractor" },
    participant: { variant: "info", label: "Participant" },
    family: { variant: "success", label: "Family" },
    other: { variant: "neutral", label: "Other" },
  };

  const config = typeConfig[type] || typeConfig.other;
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}
