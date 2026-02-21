"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "../../../../components/Header";
import { RequireAuth } from "../../../../components/RequireAuth";
import { useAuth } from "../../../../hooks/useAuth";
import { useConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { StatCard } from "../../../../components/ui/StatCard";
import Badge from "../../../../components/ui/Badge";
import {
  ArrowLeft,
  Users,
  Building2,
  Home,
  UserCheck,
  ShieldCheck,
  Clock,
  Settings,
  Ban,
  CheckCircle,
  Eye,
  X,
  Plus,
  Edit,
  User,
  Activity,
  FileText,
  CreditCard,
  MessageSquare,
  BarChart3,
  StickyNote,
  Wrench,
  AlertTriangle,
  FileCheck,
  Mail,
  ClipboardList,
  Save,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAN_PRICES: Record<string, number> = {
  starter: 250,
  professional: 450,
  enterprise: 600,
};

// ---------------------------------------------------------------------------
// Helper: format relative time
// ---------------------------------------------------------------------------

function formatRelativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "Never";
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDate(timestamp: number | undefined | null): string {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Plan badge component
// ---------------------------------------------------------------------------

function PlanBadge({ plan }: { plan: "starter" | "professional" | "enterprise" }) {
  const config = {
    starter: { variant: "neutral" as const, label: "Starter" },
    professional: { variant: "info" as const, label: "Professional" },
    enterprise: { variant: "purple" as const, label: "Enterprise" },
  };
  const { variant, label } = config[plan];
  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Subscription status badge
// ---------------------------------------------------------------------------

function SubscriptionStatusBadge({
  status,
}: {
  status: "active" | "trialing" | "past_due" | "canceled" | "trial_expired" | undefined;
}) {
  if (!status) return null;
  const config = {
    active: { variant: "success" as const, label: "Active" },
    trialing: { variant: "warning" as const, label: "Trialing" },
    past_due: { variant: "error" as const, label: "Past Due" },
    canceled: { variant: "neutral" as const, label: "Canceled" },
    trial_expired: { variant: "error" as const, label: "Trial Expired" },
  };
  const { variant, label } = config[status];
  return (
    <Badge variant={variant} size="sm" dot>
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Ticket status badge
// ---------------------------------------------------------------------------

function TicketStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "success" | "info" | "warning" | "error" | "neutral"; label: string }> = {
    open: { variant: "error", label: "Open" },
    in_progress: { variant: "info", label: "In Progress" },
    waiting_on_customer: { variant: "warning", label: "Waiting" },
    resolved: { variant: "success", label: "Resolved" },
    closed: { variant: "neutral", label: "Closed" },
  };
  const { variant, label } = config[status] || { variant: "neutral" as const, label: status };
  return (
    <Badge variant={variant} size="xs">
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Ticket severity badge
// ---------------------------------------------------------------------------

function TicketSeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { variant: "error" | "warning" | "info" | "neutral"; label: string }> = {
    critical: { variant: "error", label: "Critical" },
    high: { variant: "warning", label: "High" },
    normal: { variant: "info", label: "Normal" },
    low: { variant: "neutral", label: "Low" },
  };
  const { variant, label } = config[severity] || { variant: "neutral" as const, label: severity };
  return (
    <Badge variant={variant} size="xs">
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { variant: "info" | "purple" | "warning" | "success" | "orange" | "neutral"; label: string }> = {
    admin: { variant: "purple", label: "Admin" },
    property_manager: { variant: "info", label: "Property Manager" },
    staff: { variant: "success", label: "Staff" },
    sil_provider: { variant: "orange", label: "SIL Provider" },
    viewer: { variant: "neutral", label: "Viewer" },
    accountant: { variant: "warning", label: "Accountant" },
  };
  const { variant, label } = config[role] || { variant: "neutral" as const, label: role.replace("_", " ") };
  return (
    <Badge variant={variant} size="xs">
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Usage card (inline component for feature usage)
// ---------------------------------------------------------------------------

function UsageCard({ label, count, icon }: { label: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-700 rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1 text-gray-400" aria-hidden="true">
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{count}</div>
      <div className="text-gray-400 text-xs">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="admin" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-5 w-48 bg-gray-700 rounded" />
          <div className="h-8 w-72 bg-gray-700 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-6">
                <div className="h-3 w-20 bg-gray-700 rounded mb-3" />
                <div className="h-8 w-16 bg-gray-700 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-gray-800 rounded-lg p-6 h-64" />
          <div className="bg-gray-800 rounded-lg p-6 h-40" />
          <div className="bg-gray-800 rounded-lg p-6 h-48" />
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adjust Limits Modal
// ---------------------------------------------------------------------------

function AdjustLimitsModal({
  currentMaxUsers,
  currentMaxProperties,
  onClose,
  onSave,
}: {
  currentMaxUsers: number;
  currentMaxProperties: number;
  onClose: () => void;
  onSave: (maxUsers: number, maxProperties: number) => void;
}) {
  const [maxUsers, setMaxUsers] = useState(currentMaxUsers);
  const [maxProperties, setMaxProperties] = useState(currentMaxProperties);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[400] bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-[401] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-limits-title"
      >
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md mx-4 sm:mx-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <h2 id="adjust-limits-title" className="text-lg font-semibold text-white">
              Adjust Plan Limits
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div>
              <label
                htmlFor="max-users"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Maximum Users
              </label>
              <input
                id="max-users"
                type="number"
                min={1}
                value={maxUsers}
                onChange={(e) => setMaxUsers(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label
                htmlFor="max-properties"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Maximum Properties
              </label>
              <input
                id="max-properties"
                type="number"
                min={1}
                value={maxProperties}
                onChange={(e) => setMaxProperties(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(maxUsers, maxProperties)}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              Save Limits
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Extend Trial Modal
// ---------------------------------------------------------------------------

function ExtendTrialModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (days: number) => void;
}) {
  const [days, setDays] = useState(14);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[400] bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-[401] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="extend-trial-title"
      >
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md mx-4 sm:mx-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <h2 id="extend-trial-title" className="text-lg font-semibold text-white">
              Extend Trial Period
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="px-6 py-4">
            <label
              htmlFor="trial-days"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Extend by (days)
            </label>
            <input
              id="trial-days"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="mt-2 text-xs text-gray-400">
              The trial will be extended by {days} day{days !== 1 ? "s" : ""} from the
              current trial end date (or from today if no trial is set).
            </p>
          </div>

          <div className="px-6 py-4 border-t border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(days)}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              Extend Trial
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Impersonation Panel (read-only data snapshot)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ImpersonationPanel({
  data,
  onClose,
}: {
  data: any;
  onClose: () => void;
}) {
  const org = data?.organization;
  const properties = data?.properties || [];
  const participants = data?.participants || [];

  return (
    <section
      className="bg-gray-800 border border-teal-600/50 rounded-lg p-6 mt-6"
      aria-labelledby="impersonation-heading"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-teal-400" aria-hidden="true" />
          <h2
            id="impersonation-heading"
            className="text-lg font-semibold text-white"
          >
            Viewing as: {org?.name || "Organization"}
          </h2>
          <Badge variant="warning" size="xs">
            Read-Only
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          aria-label="Close impersonation view"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{properties.length}</div>
          <div className="text-xs text-gray-400">Properties</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{participants.length}</div>
          <div className="text-xs text-gray-400">Participants</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{data?.recentMaintenance?.length || 0}</div>
          <div className="text-xs text-gray-400">Recent Maintenance</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{data?.recentIncidents?.length || 0}</div>
          <div className="text-xs text-gray-400">Recent Incidents</div>
        </div>
      </div>

      {/* Recent properties */}
      {properties.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Properties ({properties.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {properties.slice(0, 10).map((prop: any) => (
              <div
                key={prop._id}
                className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-white truncate block">
                    {prop.propertyName || prop.addressLine1}
                  </span>
                  {prop.suburb && (
                    <span className="text-xs text-gray-400">
                      {prop.suburb}, {prop.state} {prop.postcode}
                    </span>
                  )}
                </div>
                <Badge
                  variant={prop.propertyStatus === "active" || !prop.propertyStatus ? "success" : "neutral"}
                  size="xs"
                >
                  {prop.propertyStatus || "active"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent participants */}
      {participants.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Participants ({participants.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {participants.slice(0, 10).map((p: any) => (
              <div
                key={p._id}
                className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-white">
                  {p.firstName} {p.lastName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{p.ndisNumber}</span>
                  <Badge
                    variant={p.status === "active" ? "success" : "neutral"}
                    size="xs"
                  >
                    {p.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Action icon map for audit logs
// ---------------------------------------------------------------------------

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <Plus className="w-3.5 h-3.5 text-green-400" />,
  update: <Edit className="w-3.5 h-3.5 text-teal-500" />,
  delete: <Ban className="w-3.5 h-3.5 text-red-400" />,
  login: <User className="w-3.5 h-3.5 text-purple-400" />,
  logout: <User className="w-3.5 h-3.5 text-gray-400" />,
};

// ---------------------------------------------------------------------------
// Main page export
// ---------------------------------------------------------------------------

export default function OrganizationDetailPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <OrganizationDetailContent />
    </RequireAuth>
  );
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

function OrganizationDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const orgId = params.id as string;
  const userId = user ? (user.id as Id<"users">) : undefined;
  const { confirm: confirmDialog } = useConfirmDialog();

  // Super-admin check
  const dbUser = useQuery(api.auth.getUser, userId ? { userId } : "skip");
  const isSuperAdmin = dbUser?.isSuperAdmin === true;

  // Organization detail query - returns { organization, users, counts, recentAuditLogs, providerInfo, supportTicketStats, featureUsageThisMonth, adminNotes }
  const orgData = useQuery(
    api.superAdmin.getOrganizationDetail,
    userId && isSuperAdmin && orgId
      ? { userId, organizationId: orgId as Id<"organizations"> }
      : "skip"
  );

  // Support tickets query
  const orgTickets = useQuery(
    api.superAdmin.getOrgTickets,
    userId && isSuperAdmin && orgId
      ? { userId, orgId: orgId as Id<"organizations"> }
      : "skip"
  );

  // Mutations
  const toggleOrgActive = useMutation(api.superAdmin.toggleOrgActive);
  const extendTrialMutation = useMutation(api.superAdmin.extendTrial);
  const adjustPlanLimitsMutation = useMutation(api.superAdmin.adjustPlanLimits);
  const impersonateOrganization = useMutation(api.superAdmin.impersonateOrganization);
  const updateNotes = useMutation(api.superAdmin.updateAdminNotes);

  // Local state
  const [showAdjustLimits, setShowAdjustLimits] = useState(false);
  const [showExtendTrial, setShowExtendTrial] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [impersonationData, setImpersonationData] = useState<any>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Unwrap the nested response
  const org = orgData?.organization;
  const orgUsers = orgData?.users || [];
  const counts = orgData?.counts;
  const recentAuditLogs = orgData?.recentAuditLogs || [];
  const providerInfo = orgData?.providerInfo;
  const supportTicketStats = orgData?.supportTicketStats;
  const featureUsage = orgData?.featureUsageThisMonth;

  // Derived data
  const adminUser = useMemo(
    () => orgUsers.find((u) => u.role === "admin"),
    [orgUsers]
  );

  const daysActive = useMemo(() => {
    if (!org?.createdAt) return 0;
    return Math.floor((Date.now() - org.createdAt) / 86400000);
  }, [org?.createdAt]);

  // Sync admin notes from server when data loads
  useEffect(() => {
    if (orgData?.adminNotes !== undefined && orgData?.adminNotes !== null) {
      setAdminNotes(orgData.adminNotes);
    }
  }, [orgData?.adminNotes]);

  // Track whether notes have been modified from server state
  const notesModified = adminNotes !== (orgData?.adminNotes ?? "");

  // ---- Handlers ----

  const handleToggleActive = useCallback(async () => {
    if (!userId || !org) return;

    const action = org.isActive ? "suspend" : "reactivate";
    const confirmed = await confirmDialog({
      title: `${org.isActive ? "Suspend" : "Reactivate"} Organization`,
      message: `Are you sure you want to ${action} "${org.name}"? ${
        org.isActive
          ? "All users in this organization will lose access immediately."
          : "Users will regain access to the platform."
      }`,
      confirmLabel: org.isActive ? "Suspend" : "Reactivate",
      variant: org.isActive ? "danger" : "default",
    });

    if (!confirmed) return;

    try {
      setActionLoading("toggle");
      await toggleOrgActive({
        userId,
        organizationId: org._id,
        isActive: !org.isActive,
      });
    } catch (err) {
    } finally {
      setActionLoading(null);
    }
  }, [userId, org, confirmDialog, toggleOrgActive]);

  const handleAdjustLimits = useCallback(
    async (maxUsers: number, maxProperties: number) => {
      if (!userId || !org) return;
      try {
        setActionLoading("limits");
        await adjustPlanLimitsMutation({
          userId,
          organizationId: org._id,
          maxUsers,
          maxProperties,
        });
        setShowAdjustLimits(false);
      } catch (err) {
      } finally {
        setActionLoading(null);
      }
    },
    [userId, org, adjustPlanLimitsMutation]
  );

  const handleExtendTrial = useCallback(
    async (days: number) => {
      if (!userId || !org) return;
      try {
        setActionLoading("trial");
        await extendTrialMutation({
          userId,
          organizationId: org._id,
          additionalDays: days,
        });
        setShowExtendTrial(false);
      } catch (err) {
      } finally {
        setActionLoading(null);
      }
    },
    [userId, org, extendTrialMutation]
  );

  const handleImpersonate = useCallback(async () => {
    if (!userId || !org) return;
    try {
      setIsImpersonating(true);
      const data = await impersonateOrganization({
        userId,
        organizationId: org._id,
      });
      setImpersonationData(data);
    } catch (err) {
    } finally {
      setIsImpersonating(false);
    }
  }, [userId, org, impersonateOrganization]);

  const handleSaveNotes = useCallback(async () => {
    if (!userId || !orgId) return;
    try {
      setNotesSaving(true);
      await updateNotes({
        userId,
        orgId: orgId as Id<"organizations">,
        notes: adminNotes,
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) {
    } finally {
      setNotesSaving(false);
    }
  }, [userId, orgId, adminNotes, updateNotes]);

  // ---- Access denied ----
  if (dbUser !== undefined && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="admin" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="p-4 bg-red-600/20 rounded-full mb-4">
              <ShieldCheck className="w-10 h-10 text-red-400" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400 text-center max-w-md">
              This page is restricted to platform super-administrators.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              Return to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ---- Loading state ----
  if (!orgData || !org) {
    return <DetailSkeleton />;
  }

  // ---- Limit utilization helpers ----
  const userUtilization = org.maxUsers > 0
    ? Math.min((orgUsers.length / org.maxUsers) * 100, 100)
    : 0;
  const propertyUtilization = org.maxProperties > 0
    ? Math.min(((counts?.properties || 0) / org.maxProperties) * 100, 100)
    : 0;

  const formatLimit = (value: number) =>
    value >= 999999 ? "Unlimited" : value.toLocaleString();

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="admin" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/admin/platform"
          className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Platform Dashboard
        </Link>

        {/* ---- Organization Header ---- */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-white">{org.name}</h1>
              <PlanBadge plan={org.plan} />
              <SubscriptionStatusBadge status={org.subscriptionStatus} />
              {!org.isActive && (
                <Badge variant="error" size="sm">
                  Suspended
                </Badge>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              Since {formatDate(org.createdAt)}
              {org.trialEndsAt && (
                <span className="ml-2">
                  &middot; Trial ends {formatDate(org.trialEndsAt)}
                </span>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggleActive}
              disabled={actionLoading === "toggle"}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 min-h-[44px] ${
                org.isActive
                  ? "bg-red-600/20 text-red-400 hover:bg-red-600/30 focus-visible:ring-red-500"
                  : "bg-green-600/20 text-green-400 hover:bg-green-600/30 focus-visible:ring-green-500"
              } ${actionLoading === "toggle" ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {org.isActive ? (
                <>
                  <Ban className="w-4 h-4" aria-hidden="true" />
                  Suspend
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  Reactivate
                </>
              )}
            </button>
          </div>
        </div>

        {/* ---- Stats Row ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Users"
            value={orgUsers.length}
            subtitle={`of ${formatLimit(org.maxUsers)}`}
            color="blue"
            icon={<Users className="w-6 h-6" aria-hidden="true" />}
          />
          <StatCard
            title="Properties"
            value={counts?.properties || 0}
            subtitle={`of ${formatLimit(org.maxProperties)}`}
            color="purple"
            icon={<Building2 className="w-6 h-6" aria-hidden="true" />}
          />
          <StatCard
            title="Dwellings"
            value={counts?.dwellings || 0}
            color="yellow"
            icon={<Home className="w-6 h-6" aria-hidden="true" />}
          />
          <StatCard
            title="Participants"
            value={counts?.participants || 0}
            color="green"
            icon={<UserCheck className="w-6 h-6" aria-hidden="true" />}
          />
        </div>

        {/* ---- Organization Contact Info ---- */}
        <section
          className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8"
          aria-labelledby="org-details-heading"
        >
          <h2
            id="org-details-heading"
            className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4"
          >
            Organization Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Admin Contact */}
            <div>
              <div className="text-gray-400 text-xs mb-1">Admin Contact</div>
              {adminUser ? (
                <>
                  <div className="text-white text-sm">
                    {adminUser.firstName} {adminUser.lastName}
                  </div>
                  <div className="text-gray-400 text-xs">{adminUser.email}</div>
                  {adminUser.phone && (
                    <div className="text-gray-400 text-xs">{adminUser.phone}</div>
                  )}
                </>
              ) : (
                <div className="text-gray-400 text-sm">No admin user found</div>
              )}
            </div>

            {/* Org Slug */}
            <div>
              <div className="text-gray-400 text-xs mb-1">Slug</div>
              <div className="text-white text-sm font-mono">{org.slug}</div>
            </div>

            {/* Created Date */}
            <div>
              <div className="text-gray-400 text-xs mb-1">Created</div>
              <div className="text-white text-sm">{formatDate(org.createdAt)}</div>
              <div className="text-gray-400 text-xs">{daysActive} days active</div>
            </div>

            {/* Provider Settings - only show if available */}
            {providerInfo && (
              <>
                <div>
                  <div className="text-gray-400 text-xs mb-1">ABN</div>
                  <div className="text-white text-sm">{providerInfo.abn || "Not set"}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Phone</div>
                  <div className="text-white text-sm">{providerInfo.phone || "Not set"}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Bank Details</div>
                  <div className="text-white text-sm">
                    {providerInfo.bankBsb ? "Configured" : "Not set"}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ---- Plan & Limits ---- */}
        <section
          className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8"
          aria-labelledby="plan-limits-heading"
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              id="plan-limits-heading"
              className="text-lg font-semibold text-white flex items-center gap-2"
            >
              <Settings className="w-5 h-5 text-gray-400" aria-hidden="true" />
              Plan &amp; Limits
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdjustLimits(true)}
                className="px-3 py-1.5 text-sm font-medium text-teal-400 bg-teal-600/10 hover:bg-teal-600/20 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                Adjust Limits
              </button>
              <button
                onClick={() => setShowExtendTrial(true)}
                className="px-3 py-1.5 text-sm font-medium text-yellow-400 bg-yellow-600/10 hover:bg-yellow-600/20 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
              >
                Extend Trial
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Users progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Users</span>
                <span className="text-sm text-white font-medium">
                  {orgUsers.length} / {formatLimit(org.maxUsers)}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    userUtilization >= 90
                      ? "bg-red-500"
                      : userUtilization >= 70
                        ? "bg-yellow-500"
                        : "bg-teal-500"
                  }`}
                  style={{ width: `${userUtilization}%` }}
                  role="progressbar"
                  aria-valuenow={orgUsers.length}
                  aria-valuemin={0}
                  aria-valuemax={org.maxUsers}
                  aria-label={`Users: ${orgUsers.length} of ${formatLimit(org.maxUsers)}`}
                />
              </div>
            </div>

            {/* Properties progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Properties</span>
                <span className="text-sm text-white font-medium">
                  {counts?.properties || 0} / {formatLimit(org.maxProperties)}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    propertyUtilization >= 90
                      ? "bg-red-500"
                      : propertyUtilization >= 70
                        ? "bg-yellow-500"
                        : "bg-teal-500"
                  }`}
                  style={{ width: `${propertyUtilization}%` }}
                  role="progressbar"
                  aria-valuenow={counts?.properties || 0}
                  aria-valuemin={0}
                  aria-valuemax={org.maxProperties}
                  aria-label={`Properties: ${counts?.properties || 0} of ${formatLimit(org.maxProperties)}`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ---- Billing & Subscription ---- */}
        <section
          className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8"
          aria-labelledby="billing-heading"
        >
          <h2
            id="billing-heading"
            className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4 text-gray-400" aria-hidden="true" />
            Billing & Subscription
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Monthly Amount</div>
              <div className="text-white text-lg font-semibold">
                ${PLAN_PRICES[org.plan] || 0}
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Status</div>
              <div className="mt-1">
                <SubscriptionStatusBadge status={org.subscriptionStatus} />
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Plan</div>
              <div className="mt-1">
                <PlanBadge plan={org.plan} />
              </div>
            </div>
            {org.trialEndsAt ? (
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">Trial Ends</div>
                <div className="text-white text-sm">{formatDate(org.trialEndsAt)}</div>
                {org.trialEndsAt > Date.now() ? (
                  <div className="text-yellow-400 text-xs">
                    {Math.ceil((org.trialEndsAt - Date.now()) / 86400000)} days remaining
                  </div>
                ) : (
                  <div className="text-red-400 text-xs">Expired</div>
                )}
              </div>
            ) : (
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">Stripe Customer</div>
                <div className="text-white text-sm font-mono truncate">
                  {org.stripeCustomerId ? org.stripeCustomerId.slice(0, 18) + "..." : "Not linked"}
                </div>
              </div>
            )}
          </div>

          {org.onboardingServiceRequested && (
            <div className="mt-3 px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" aria-hidden="true" />
              <span className="text-yellow-400 text-sm font-medium">Managed Setup Requested</span>
              <span className="text-gray-400 text-xs ml-2">
                Tier: {org.onboardingServiceTier || "Not specified"}
              </span>
            </div>
          )}
        </section>

        {/* ---- Users Table ---- */}
        <section
          className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-8"
          aria-labelledby="users-heading"
        >
          <div className="px-6 py-4 border-b border-gray-700">
            <h2
              id="users-heading"
              className="text-lg font-semibold text-white flex items-center gap-2"
            >
              <Users className="w-5 h-5 text-gray-400" aria-hidden="true" />
              Users ({orgUsers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Organization users">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Last Login
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {orgUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      No users in this organization.
                    </td>
                  </tr>
                ) : (
                  orgUsers.map((orgUser) => (
                    <tr
                      key={orgUser._id}
                      className="hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <User
                              className="w-4 h-4 text-gray-400"
                              aria-hidden="true"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {orgUser.firstName} {orgUser.lastName}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {orgUser.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <RoleBadge role={orgUser.role} />
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={orgUser.isActive ? "success" : "neutral"}
                          size="xs"
                          dot
                        >
                          {orgUser.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-gray-400">
                          {formatRelativeTime(orgUser.lastLogin)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Support Tickets ---- */}
        <section
          className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8"
          aria-labelledby="tickets-heading"
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              id="tickets-heading"
              className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-gray-400" aria-hidden="true" />
              Support Tickets
              {supportTicketStats && supportTicketStats.openCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {supportTicketStats.openCount}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3">
              {supportTicketStats && (
                <span className="text-gray-400 text-xs">
                  {supportTicketStats.totalCount} total
                </span>
              )}
            </div>
          </div>

          {orgTickets && orgTickets.length > 0 ? (
            <div className="space-y-2">
              {orgTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-white text-sm font-mono flex-shrink-0">
                      {ticket.ticketNumber}
                    </span>
                    <span className="text-gray-300 text-sm truncate">
                      {ticket.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <TicketSeverityBadge severity={ticket.severity} />
                    <TicketStatusBadge status={ticket.status} />
                    <span className="text-gray-400 text-xs whitespace-nowrap hidden sm:inline">
                      {formatRelativeTime(ticket.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : orgTickets === undefined ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="text-center py-6">
              <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" aria-hidden="true" />
              <p className="text-gray-400 text-sm">No support tickets</p>
            </div>
          )}
        </section>

        {/* ---- Feature Usage (This Month) ---- */}
        <section
          className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8"
          aria-labelledby="usage-heading"
        >
          <h2
            id="usage-heading"
            className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4 text-gray-400" aria-hidden="true" />
            Feature Usage (This Month)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <UsageCard
              label="Maintenance"
              count={featureUsage?.maintenance ?? 0}
              icon={<Wrench className="w-4 h-4" />}
            />
            <UsageCard
              label="Incidents"
              count={featureUsage?.incidents ?? 0}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <UsageCard
              label="Documents"
              count={featureUsage?.documents ?? 0}
              icon={<FileCheck className="w-4 h-4" />}
            />
            <UsageCard
              label="Communications"
              count={featureUsage?.communications ?? 0}
              icon={<Mail className="w-4 h-4" />}
            />
            <UsageCard
              label="Inspections"
              count={featureUsage?.inspections ?? 0}
              icon={<ClipboardList className="w-4 h-4" />}
            />
          </div>
        </section>

        {/* ---- Admin Notes ---- */}
        <section
          className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8"
          aria-labelledby="admin-notes-heading"
        >
          <h2
            id="admin-notes-heading"
            className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"
          >
            <StickyNote className="w-4 h-4 text-gray-400" aria-hidden="true" />
            Admin Notes
          </h2>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px] resize-y"
            placeholder="Internal notes about this organization (onboarding progress, support context, health observations...)"
            aria-label="Admin notes for this organization"
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleSaveNotes}
              disabled={notesSaving || !notesModified}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 min-h-[44px] ${
                notesSaving || !notesModified
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-teal-600 hover:bg-teal-700 text-white"
              }`}
            >
              {notesSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" aria-hidden="true" />
                  Save Notes
                </>
              )}
            </button>
            {notesSaved && (
              <span className="text-green-400 text-sm flex items-center gap-1" role="status">
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
                Saved
              </span>
            )}
            {notesModified && !notesSaved && !notesSaving && (
              <span className="text-yellow-400 text-xs">Unsaved changes</span>
            )}
          </div>
        </section>

        {/* ---- Recent Activity ---- */}
        <section
          className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8"
          aria-labelledby="activity-heading"
        >
          <h2
            id="activity-heading"
            className="text-lg font-semibold text-white flex items-center gap-2 mb-4"
          >
            <Activity className="w-5 h-5 text-gray-400" aria-hidden="true" />
            Recent Activity
          </h2>

          {recentAuditLogs.length === 0 ? (
            <div className="text-center py-8">
              <FileText
                className="w-10 h-10 text-gray-400 mx-auto mb-2"
                aria-hidden="true"
              />
              <p className="text-gray-400 text-sm">No recent activity.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAuditLogs.map((entry) => (
                <div
                  key={entry._id}
                  className="flex items-start gap-3 py-2 border-b border-gray-700/50 last:border-0"
                >
                  <div className="mt-0.5">
                    {ACTION_ICONS[entry.action] || (
                      <Activity className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300">
                      <span className="text-white font-medium">
                        {entry.userName}
                      </span>{" "}
                      {entry.action}{" "}
                      <span className="text-gray-300">
                        {entry.entityType}
                      </span>
                      {entry.entityName && (
                        <>
                          {" "}
                          &ldquo;
                          <span className="text-white">{entry.entityName}</span>
                          &rdquo;
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---- Impersonate Section ---- */}
        <section
          className="bg-gray-800 border border-gray-700 rounded-lg p-6"
          aria-labelledby="impersonate-heading"
        >
          <h2
            id="impersonate-heading"
            className="text-lg font-semibold text-white flex items-center gap-2 mb-2"
          >
            <Eye className="w-5 h-5 text-gray-400" aria-hidden="true" />
            Impersonate
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            View a read-only snapshot of this organization&apos;s data without
            switching accounts.
          </p>
          <button
            onClick={handleImpersonate}
            disabled={isImpersonating}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 min-h-[44px] ${
              isImpersonating ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isImpersonating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" aria-hidden="true" />
                View as this organization
              </>
            )}
          </button>
        </section>

        {/* ---- Impersonation Data Panel ---- */}
        {impersonationData && (
          <ImpersonationPanel
            data={impersonationData}
            onClose={() => setImpersonationData(null)}
          />
        )}

        {/* ---- Modals ---- */}
        {showAdjustLimits && (
          <AdjustLimitsModal
            currentMaxUsers={org.maxUsers}
            currentMaxProperties={org.maxProperties}
            onClose={() => setShowAdjustLimits(false)}
            onSave={handleAdjustLimits}
          />
        )}

        {showExtendTrial && (
          <ExtendTrialModal
            onClose={() => setShowExtendTrial(false)}
            onSave={handleExtendTrial}
          />
        )}
      </main>
    </div>
  );
}
