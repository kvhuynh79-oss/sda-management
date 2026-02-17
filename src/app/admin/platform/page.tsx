"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import { RequireAuth } from "../../../components/RequireAuth";
import { useAuth } from "../../../hooks/useAuth";
import { StatCard } from "../../../components/ui/StatCard";
import Badge from "../../../components/ui/Badge";
import {
  Globe,
  Users,
  Building2,
  Home,
  UserCheck,
  Search,
  Filter,
  ArrowRight,
  Clock,
  ShieldCheck,
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  BarChart3,
  Ticket,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  CircleDot,
  Timer,
  CheckCircle2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = "overview" | "revenue" | "tickets";
type StatusFilter = "all" | "active" | "trialing" | "suspended";
type SortKey = "name" | "lastActive" | "plan" | "users" | "properties";
type ViewMode = "table" | "card";

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

function formatResponseTime(ms: number): string {
  if (ms === 0) return "N/A";
  const hours = ms / 3600000;
  if (hours < 1) return `${Math.round(ms / 60000)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours / 24)}d`;
}

function daysUntil(timestamp: number | null | undefined): number {
  if (!timestamp) return 0;
  return Math.ceil((timestamp - Date.now()) / 86400000);
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
  status: "active" | "trialing" | "past_due" | "canceled";
}) {
  const config = {
    active: { variant: "success" as const, label: "Active" },
    trialing: { variant: "warning" as const, label: "Trialing" },
    past_due: { variant: "error" as const, label: "Past Due" },
    canceled: { variant: "neutral" as const, label: "Canceled" },
  };
  const { variant, label } = config[status];
  return (
    <Badge variant={variant} size="sm" dot>
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Ticket severity badge
// ---------------------------------------------------------------------------

function TicketSeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { variant: "error" | "orange" | "warning" | "neutral"; label: string }> = {
    critical: { variant: "error", label: "Critical" },
    high: { variant: "orange", label: "High" },
    normal: { variant: "warning", label: "Normal" },
    low: { variant: "neutral", label: "Low" },
  };
  const { variant, label } = config[severity] || config.normal;
  return (
    <Badge variant={variant} size="xs">
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Ticket status badge
// ---------------------------------------------------------------------------

function TicketStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "error" | "warning" | "info" | "success" | "neutral"; label: string }> = {
    open: { variant: "error", label: "Open" },
    in_progress: { variant: "warning", label: "In Progress" },
    waiting_on_customer: { variant: "info", label: "Waiting" },
    resolved: { variant: "success", label: "Resolved" },
    closed: { variant: "neutral", label: "Closed" },
  };
  const { variant, label } = config[status] || config.open;
  return (
    <Badge variant={variant} size="xs" dot>
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// SLA indicator dot
// ---------------------------------------------------------------------------

function SlaIndicator({ slaDeadline, status }: { slaDeadline: number; status: string }) {
  if (status === "resolved" || status === "closed") {
    return <span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" title="Resolved" aria-label="Resolved" />;
  }
  const now = Date.now();
  const fourHoursMs = 4 * 60 * 60 * 1000;
  if (slaDeadline < now) {
    return <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" title="SLA overdue" aria-label="SLA overdue" />;
  }
  if (slaDeadline - now < fourHoursMs) {
    return <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" title="SLA at risk" aria-label="SLA at risk (less than 4 hours)" />;
  }
  return <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" title="SLA on track" aria-label="SLA on track" />;
}

// ---------------------------------------------------------------------------
// Loading skeletons
// ---------------------------------------------------------------------------

const GRID_COLS_MAP: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

function StatsSkeleton({ count = 5 }: { count?: number }) {
  const lgCols = GRID_COLS_MAP[count > 5 ? 5 : count] || "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${lgCols} gap-4 mb-8`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-800 rounded-lg p-6 animate-pulse"
          aria-hidden="true"
        >
          <div className="h-3 w-20 bg-gray-700 rounded mb-3" />
          <div className="h-8 w-16 bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse flex items-center gap-4"
          aria-hidden="true"
        >
          <div className="h-4 w-32 bg-gray-700 rounded" />
          <div className="h-4 w-20 bg-gray-700 rounded" />
          <div className="h-4 w-16 bg-gray-700 rounded" />
          <div className="h-4 w-12 bg-gray-700 rounded flex-1" />
          <div className="h-8 w-16 bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 10;

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> },
  { key: "revenue", label: "Revenue", icon: <DollarSign className="w-4 h-4" aria-hidden="true" /> },
  { key: "tickets", label: "Tickets", icon: <Ticket className="w-4 h-4" aria-hidden="true" /> },
];

// ---------------------------------------------------------------------------
// Main page export
// ---------------------------------------------------------------------------

export default function PlatformDashboardPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <PlatformDashboardContent />
    </RequireAuth>
  );
}

// ---------------------------------------------------------------------------
// Page content (rendered inside RequireAuth)
// ---------------------------------------------------------------------------

function PlatformDashboardContent() {
  const { user } = useAuth();
  const userId = user ? (user.id as Id<"users">) : undefined;
  const router = useRouter();

  // Super-admin guard
  const dbUser = useQuery(
    api.auth.getUser,
    userId ? { userId } : "skip"
  );
  const isSuperAdmin = dbUser?.isSuperAdmin === true;

  // Core queries
  const metrics = useQuery(
    api.superAdmin.getPlatformMetrics,
    userId && isSuperAdmin ? { userId } : "skip"
  );
  const organizations = useQuery(
    api.superAdmin.getAllOrganizations,
    userId && isSuperAdmin ? { userId } : "skip"
  );
  const financialMetrics = useQuery(
    api.superAdmin.getFinancialMetrics,
    userId && isSuperAdmin ? { userId } : "skip"
  );
  const ticketMetrics = useQuery(
    api.supportTickets.getTicketMetrics,
    userId && isSuperAdmin ? { userId } : "skip"
  );
  const allTickets = useQuery(
    api.supportTickets.getAllTickets,
    userId && isSuperAdmin ? { userId } : "skip"
  );

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Org list state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastActive");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [quickJumpSearch, setQuickJumpSearch] = useState("");
  const [quickJumpOpen, setQuickJumpOpen] = useState(false);

  // Revenue tab state
  const [revSortKey, setRevSortKey] = useState<"name" | "plan" | "amount">("amount");
  const [revSortDir, setRevSortDir] = useState<"asc" | "desc">("desc");

  // Tickets tab state
  const [ticketStatusFilter, setTicketStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved" | "closed">("all");
  const [ticketSeverityFilter, setTicketSeverityFilter] = useState<"all" | "critical" | "high" | "normal" | "low">("all");

  // Filtered & sorted orgs
  const filteredOrgs = useMemo(() => {
    if (!organizations) return [];

    let result = organizations.filter((org) => {
      const matchesSearch =
        !searchTerm ||
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus = org.isActive && org.subscriptionStatus === "active";
      } else if (statusFilter === "trialing") {
        matchesStatus = org.subscriptionStatus === "trialing";
      } else if (statusFilter === "suspended") {
        matchesStatus = !org.isActive;
      }

      return matchesSearch && matchesStatus;
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "lastActive": {
          if (a.lastLoginTimestamp === null && b.lastLoginTimestamp === null) return 0;
          if (a.lastLoginTimestamp === null) return 1;
          if (b.lastLoginTimestamp === null) return -1;
          return b.lastLoginTimestamp - a.lastLoginTimestamp;
        }
        case "plan": {
          const planOrder = { enterprise: 0, professional: 1, starter: 2 };
          return (planOrder[a.plan] ?? 3) - (planOrder[b.plan] ?? 3);
        }
        case "users":
          return b.stats.userCount - a.stats.userCount;
        case "properties":
          return b.stats.propertyCount - a.stats.propertyCount;
        default:
          return 0;
      }
    });

    return result;
  }, [organizations, searchTerm, statusFilter, sortKey]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrgs.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrgs = filteredOrgs.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  // Quick jump filtered list
  const quickJumpOrgs = useMemo(() => {
    if (!organizations || !quickJumpSearch) return [];
    return organizations
      .filter((o) => o.name.toLowerCase().includes(quickJumpSearch.toLowerCase()))
      .slice(0, 8);
  }, [organizations, quickJumpSearch]);

  // Plan distribution
  const planDistribution = useMemo(() => {
    if (!organizations) return { starter: 0, professional: 0, enterprise: 0 };
    return {
      starter: organizations.filter((o) => o.plan === "starter").length,
      professional: organizations.filter((o) => o.plan === "professional").length,
      enterprise: organizations.filter((o) => o.plan === "enterprise").length,
    };
  }, [organizations]);

  // Recent tickets (5 most recent for overview)
  const recentTickets = useMemo(() => {
    if (!allTickets) return [];
    return allTickets.slice(0, 5);
  }, [allTickets]);

  // Filtered tickets for Tickets tab
  const filteredTickets = useMemo(() => {
    if (!allTickets) return [];
    return allTickets.filter((t) => {
      if (ticketStatusFilter !== "all" && t.status !== ticketStatusFilter) return false;
      if (ticketSeverityFilter !== "all" && t.severity !== ticketSeverityFilter) return false;
      return true;
    });
  }, [allTickets, ticketStatusFilter, ticketSeverityFilter]);

  // Sorted revenue table
  const sortedRevenueTable = useMemo(() => {
    if (!financialMetrics) return [];
    return [...financialMetrics.revenueTable].sort((a, b) => {
      const dir = revSortDir === "asc" ? 1 : -1;
      switch (revSortKey) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "plan": {
          const planOrder = { enterprise: 0, professional: 1, starter: 2 };
          return dir * ((planOrder[a.plan as keyof typeof planOrder] ?? 3) - (planOrder[b.plan as keyof typeof planOrder] ?? 3));
        }
        case "amount":
          return dir * (a.monthlyAmount - b.monthlyAmount);
        default:
          return 0;
      }
    });
  }, [financialMetrics, revSortKey, revSortDir]);

  const revenueTableTotal = useMemo(() => {
    if (!financialMetrics) return 0;
    return financialMetrics.revenueTable.reduce((sum, r) => sum + r.monthlyAmount, 0);
  }, [financialMetrics]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortKey]);

  // ---- Access denied state ----
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
              This page is restricted to platform super-administrators. Contact the
              system administrator if you believe this is an error.
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

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="admin" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-teal-600/20 rounded-lg">
            <LayoutDashboard
              className="w-8 h-8 text-teal-400"
              aria-hidden="true"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Platform Dashboard</h1>
            <p className="text-gray-400">MySDAManager Super Admin</p>
          </div>
        </div>

        {/* ---- Tab Bar ---- */}
        <nav
          className="border-b border-gray-700 mb-8"
          role="tablist"
          aria-label="Platform dashboard tabs"
        >
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`tabpanel-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
                  activeTab === tab.key
                    ? "border-teal-500 text-white"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ==================================================================== */}
        {/* OVERVIEW TAB                                                          */}
        {/* ==================================================================== */}
        {activeTab === "overview" && (
          <div id="tabpanel-overview" role="tabpanel" aria-labelledby="tab-overview">
            {/* Platform Metrics */}
            {!metrics ? (
              <StatsSkeleton count={5} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard
                  title="Organizations"
                  value={metrics.totalOrganizations}
                  subtitle={`${metrics.activeOrganizations} active`}
                  color="blue"
                  icon={<Globe className="w-6 h-6" aria-hidden="true" />}
                />
                <StatCard
                  title="Total Users"
                  value={metrics.totalUsers}
                  subtitle={`${metrics.activeUsers} active`}
                  color="green"
                  icon={<Users className="w-6 h-6" aria-hidden="true" />}
                />
                <StatCard
                  title="Properties"
                  value={metrics.totalProperties}
                  color="purple"
                  icon={<Building2 className="w-6 h-6" aria-hidden="true" />}
                />
                <StatCard
                  title="Dwellings"
                  value={metrics.totalDwellings}
                  color="yellow"
                  icon={<Home className="w-6 h-6" aria-hidden="true" />}
                />
                <StatCard
                  title="Participants"
                  value={metrics.totalParticipants}
                  color="green"
                  icon={<UserCheck className="w-6 h-6" aria-hidden="true" />}
                />
              </div>
            )}

            {/* Plan Distribution */}
            {organizations && (
              <section
                className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8"
                aria-labelledby="plan-distribution-heading"
              >
                <h2
                  id="plan-distribution-heading"
                  className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3"
                >
                  Plan Distribution
                </h2>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-500" aria-hidden="true" />
                    <span className="text-gray-300 text-sm">
                      Starter:{" "}
                      <span className="font-semibold text-white">
                        {planDistribution.starter}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-500" aria-hidden="true" />
                    <span className="text-gray-300 text-sm">
                      Professional:{" "}
                      <span className="font-semibold text-white">
                        {planDistribution.professional}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500" aria-hidden="true" />
                    <span className="text-gray-300 text-sm">
                      Enterprise:{" "}
                      <span className="font-semibold text-white">
                        {planDistribution.enterprise}
                      </span>
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Support Tickets Overview */}
            <section
              className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8"
              aria-labelledby="tickets-overview-heading"
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  id="tickets-overview-heading"
                  className="text-sm font-semibold text-gray-300 uppercase tracking-wider"
                >
                  Support Tickets Overview
                </h2>
                <button
                  onClick={() => setActiveTab("tickets")}
                  className="text-sm text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                >
                  View All
                </button>
              </div>

              {!ticketMetrics ? (
                <StatsSkeleton count={4} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    title="Open"
                    value={ticketMetrics.open}
                    color="red"
                    icon={<CircleDot className="w-5 h-5" aria-hidden="true" />}
                  />
                  <StatCard
                    title="In Progress"
                    value={ticketMetrics.inProgress}
                    color="yellow"
                    icon={<Timer className="w-5 h-5" aria-hidden="true" />}
                  />
                  <StatCard
                    title="Avg Response"
                    value={formatResponseTime(ticketMetrics.avgResponseTime)}
                    color="blue"
                    icon={<Clock className="w-5 h-5" aria-hidden="true" />}
                  />
                  <StatCard
                    title="SLA Compliance"
                    value={`${Math.round(ticketMetrics.slaCompliance)}%`}
                    color="green"
                    icon={<CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
                  />
                </div>
              )}

              {/* Recent 5 tickets */}
              {recentTickets.length > 0 ? (
                <div className="space-y-2">
                  {recentTickets.map((ticket) => (
                    <Link
                      key={ticket._id}
                      href={`/admin/platform/tickets/${ticket._id}`}
                      className="flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <span className="text-sm font-mono text-gray-400 whitespace-nowrap">
                        {ticket.ticketNumber}
                      </span>
                      <span className="text-sm text-gray-300 truncate">
                        {ticket.organizationName}
                      </span>
                      <span className="text-sm text-white truncate flex-1">
                        {ticket.subject}
                      </span>
                      <TicketSeverityBadge severity={ticket.severity} />
                      <TicketStatusBadge status={ticket.status} />
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatRelativeTime(ticket.createdAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : allTickets !== undefined ? (
                <div className="text-center py-6">
                  <Ticket className="w-8 h-8 text-gray-400 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-gray-400">No tickets yet</p>
                </div>
              ) : null}
            </section>

            {/* Organization List */}
            <section aria-labelledby="organizations-heading">
              {/* Header row with title and controls */}
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2
                    id="organizations-heading"
                    className="text-lg font-semibold text-white"
                  >
                    Organizations
                  </h2>

                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    {/* Status filter tabs */}
                    <div
                      className="flex bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
                      role="tablist"
                      aria-label="Filter organizations by status"
                    >
                      {(
                        [
                          { key: "all", label: "All" },
                          { key: "active", label: "Active" },
                          { key: "trialing", label: "Trialing" },
                          { key: "suspended", label: "Suspended" },
                        ] as { key: StatusFilter; label: string }[]
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          role="tab"
                          aria-selected={statusFilter === tab.key}
                          onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
                          className={`px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                            statusFilter === tab.key
                              ? "bg-teal-600 text-white"
                              : "text-gray-400 hover:text-white hover:bg-gray-700"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Search input */}
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        placeholder="Search organizations..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full sm:w-56 pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        aria-label="Search organizations by name"
                      />
                    </div>
                  </div>
                </div>

                {/* Second row: sort, view toggle, quick jump */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  {/* Quick jump */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Quick jump to org..."
                      value={quickJumpSearch}
                      onChange={(e) => {
                        setQuickJumpSearch(e.target.value);
                        setQuickJumpOpen(e.target.value.length > 0);
                      }}
                      onFocus={() => {
                        if (quickJumpSearch.length > 0) setQuickJumpOpen(true);
                      }}
                      onBlur={() => {
                        // Delay to allow click on dropdown item
                        setTimeout(() => setQuickJumpOpen(false), 200);
                      }}
                      className="w-full sm:w-52 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      aria-label="Quick jump to organization"
                    />
                    {quickJumpOpen && quickJumpOrgs.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                        {quickJumpOrgs.map((org) => (
                          <button
                            key={org._id}
                            onClick={() => {
                              router.push(`/admin/platform/${org._id}`);
                              setQuickJumpSearch("");
                              setQuickJumpOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus-visible:bg-gray-700"
                          >
                            <span className="font-medium">{org.name}</span>
                            <span className="text-gray-400 ml-2 text-xs">{org.plan}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sort dropdown */}
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      aria-label="Sort organizations"
                    >
                      <option value="name">Name (A-Z)</option>
                      <option value="lastActive">Last Active</option>
                      <option value="plan">Plan</option>
                      <option value="users">Users</option>
                      <option value="properties">Properties</option>
                    </select>
                  </div>

                  {/* View toggle */}
                  <div className="flex bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode("table")}
                      className={`p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                        viewMode === "table" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"
                      }`}
                      aria-label="Table view"
                      aria-pressed={viewMode === "table"}
                    >
                      <LayoutList className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setViewMode("card")}
                      className={`p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                        viewMode === "card" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"
                      }`}
                      aria-label="Card view"
                      aria-pressed={viewMode === "card"}
                    >
                      <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Organization list content */}
              {!organizations ? (
                <TableSkeleton />
              ) : filteredOrgs.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                  <Filter
                    className="w-10 h-10 text-gray-400 mx-auto mb-3"
                    aria-hidden="true"
                  />
                  <p className="text-gray-400">
                    {searchTerm || statusFilter !== "all"
                      ? "No organizations match your filters."
                      : "No organizations found."}
                  </p>
                  {(searchTerm || statusFilter !== "all") && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setCurrentPage(1);
                      }}
                      className="mt-3 text-sm text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : viewMode === "table" ? (
                /* ---- Table View ---- */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" role="table">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Plan</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Users</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Properties</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Active</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrgs.map((org) => (
                        <tr
                          key={org._id}
                          className="border-b border-gray-700/50 hover:bg-gray-800/70 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium truncate max-w-[200px]">
                                {org.name}
                              </span>
                              {!org.isActive && (
                                <Badge variant="error" size="xs">Suspended</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <PlanBadge plan={org.plan} />
                          </td>
                          <td className="py-3 px-4">
                            <SubscriptionStatusBadge status={org.subscriptionStatus} />
                          </td>
                          <td className="py-3 px-4 text-right text-gray-300">
                            {org.stats.userCount}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-300">
                            {org.stats.propertyCount}
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            {formatRelativeTime(org.lastLoginTimestamp)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/admin/platform/${org._id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                            >
                              View
                              <ArrowRight className="w-3 h-3" aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ---- Card View ---- */
                <div className="space-y-3">
                  {paginatedOrgs.map((org) => (
                    <div
                      key={org._id}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:bg-gray-700/80 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-white font-semibold text-base truncate">
                              {org.name}
                            </h3>
                            <PlanBadge plan={org.plan} />
                            <SubscriptionStatusBadge status={org.subscriptionStatus} />
                            {!org.isActive && (
                              <Badge variant="error" size="xs">Suspended</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" aria-hidden="true" />
                              {org.stats.userCount} user{org.stats.userCount !== 1 ? "s" : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                              {org.stats.propertyCount} propert{org.stats.propertyCount !== 1 ? "ies" : "y"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                              {formatRelativeTime(org.lastLoginTimestamp)}
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/admin/platform/${org._id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 whitespace-nowrap"
                        >
                          View
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {organizations && filteredOrgs.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-400">
                    Showing {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredOrgs.length)} of {filteredOrgs.length} organization{filteredOrgs.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg transition-colors hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      Prev
                    </button>
                    <span className="text-sm text-gray-400 px-2">
                      {safeCurrentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg transition-colors hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {/* Result count (when not paginated) */}
              {organizations && filteredOrgs.length > 0 && filteredOrgs.length <= ITEMS_PER_PAGE && (
                <p className="mt-4 text-sm text-gray-400">
                  Showing {filteredOrgs.length} of {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
                </p>
              )}
            </section>
          </div>
        )}

        {/* ==================================================================== */}
        {/* REVENUE TAB                                                           */}
        {/* ==================================================================== */}
        {activeTab === "revenue" && (
          <div id="tabpanel-revenue" role="tabpanel" aria-labelledby="tab-revenue">
            {/* Top-level financial stats */}
            {!financialMetrics ? (
              <StatsSkeleton count={4} />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard
                    title="MRR"
                    value={`$${financialMetrics.mrr.toLocaleString()}`}
                    color="green"
                    icon={<DollarSign className="w-6 h-6" aria-hidden="true" />}
                  />
                  <StatCard
                    title="ARR"
                    value={`$${financialMetrics.arr.toLocaleString()}`}
                    color="blue"
                    icon={<TrendingUp className="w-6 h-6" aria-hidden="true" />}
                  />
                  <StatCard
                    title="Active Paying"
                    value={financialMetrics.activePayingCount}
                    subtitle={`${financialMetrics.trialCount} trialing`}
                    color="purple"
                    icon={<Users className="w-6 h-6" aria-hidden="true" />}
                  />
                  <StatCard
                    title="ARPU"
                    value={`$${Math.round(financialMetrics.arpu).toLocaleString()}`}
                    color="yellow"
                    icon={<BarChart3 className="w-6 h-6" aria-hidden="true" />}
                  />
                </div>

                {/* MRR by Plan */}
                <section
                  className="mb-8"
                  aria-labelledby="mrr-by-plan-heading"
                >
                  <h2
                    id="mrr-by-plan-heading"
                    className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3"
                  >
                    MRR by Plan
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(["starter", "professional", "enterprise"] as const).map((plan) => {
                      const amount = financialMetrics.mrrByPlan[plan];
                      const price = plan === "starter" ? 250 : plan === "professional" ? 450 : 600;
                      const orgCount = amount / price;
                      return (
                        <div
                          key={plan}
                          className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                        >
                          <p className="text-sm text-gray-300 capitalize mb-1">{plan}</p>
                          <p className="text-2xl font-bold text-white">${amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {orgCount} org{orgCount !== 1 ? "s" : ""} x ${price}/mo
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Key Metrics */}
                <section
                  className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8"
                  aria-labelledby="key-metrics-heading"
                >
                  <h2
                    id="key-metrics-heading"
                    className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4"
                  >
                    Key Metrics
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Churn Rate</p>
                      <p className="text-2xl font-bold text-white">{financialMetrics.churnRate}%</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {financialMetrics.canceledCount} canceled of {financialMetrics.activePayingCount + financialMetrics.trialCount + financialMetrics.canceledCount} total
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Trial Conversion Rate</p>
                      <p className="text-2xl font-bold text-white">{financialMetrics.conversionRate}%</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {financialMetrics.activePayingCount} converted of {financialMetrics.activePayingCount + financialMetrics.trialCount} eligible
                      </p>
                    </div>
                  </div>
                </section>

                {/* At-Risk Organizations */}
                {(financialMetrics.atRiskOrgs.trialExpiringSoon.length > 0 ||
                  financialMetrics.atRiskOrgs.pastDue.length > 0 ||
                  financialMetrics.atRiskOrgs.trialExpired.length > 0) && (
                  <section
                    className="mb-8"
                    aria-labelledby="at-risk-heading"
                  >
                    <h2
                      id="at-risk-heading"
                      className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-yellow-400" aria-hidden="true" />
                      At-Risk Organizations
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {financialMetrics.atRiskOrgs.trialExpiringSoon.map((org) => (
                        <Link
                          key={org._id}
                          href={`/admin/platform/${org._id}`}
                          className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 hover:bg-yellow-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        >
                          <p className="text-sm font-medium text-white">{org.name}</p>
                          <p className="text-xs text-yellow-400 mt-1">
                            Trial expires in {daysUntil(org.trialEndsAt)} day{daysUntil(org.trialEndsAt) !== 1 ? "s" : ""}
                          </p>
                        </Link>
                      ))}
                      {financialMetrics.atRiskOrgs.pastDue.map((org) => (
                        <Link
                          key={org._id}
                          href={`/admin/platform/${org._id}`}
                          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 hover:bg-red-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        >
                          <p className="text-sm font-medium text-white">{org.name}</p>
                          <p className="text-xs text-red-400 mt-1">Payment past due</p>
                        </Link>
                      ))}
                      {financialMetrics.atRiskOrgs.trialExpired.map((org) => (
                        <Link
                          key={org._id}
                          href={`/admin/platform/${org._id}`}
                          className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 hover:bg-gray-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        >
                          <p className="text-sm font-medium text-white">{org.name}</p>
                          <p className="text-xs text-gray-400 mt-1">Trial expired</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Revenue Table */}
                <section aria-labelledby="revenue-table-heading">
                  <h2
                    id="revenue-table-heading"
                    className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3"
                  >
                    Revenue Table
                  </h2>
                  <div className="overflow-x-auto bg-gray-800 border border-gray-700 rounded-lg">
                    <table className="w-full text-sm" role="table">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4">
                            <button
                              onClick={() => {
                                if (revSortKey === "name") setRevSortDir(revSortDir === "asc" ? "desc" : "asc");
                                else { setRevSortKey("name"); setRevSortDir("asc"); }
                              }}
                              className="text-gray-400 font-medium hover:text-white transition-colors inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                            >
                              Org Name
                              {revSortKey === "name" && (
                                <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                              )}
                            </button>
                          </th>
                          <th className="text-left py-3 px-4">
                            <button
                              onClick={() => {
                                if (revSortKey === "plan") setRevSortDir(revSortDir === "asc" ? "desc" : "asc");
                                else { setRevSortKey("plan"); setRevSortDir("asc"); }
                              }}
                              className="text-gray-400 font-medium hover:text-white transition-colors inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                            >
                              Plan
                              {revSortKey === "plan" && (
                                <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                              )}
                            </button>
                          </th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                          <th className="text-right py-3 px-4">
                            <button
                              onClick={() => {
                                if (revSortKey === "amount") setRevSortDir(revSortDir === "asc" ? "desc" : "asc");
                                else { setRevSortKey("amount"); setRevSortDir("desc"); }
                              }}
                              className="text-gray-400 font-medium hover:text-white transition-colors inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded ml-auto"
                            >
                              Monthly Amount
                              {revSortKey === "amount" && (
                                <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                              )}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRevenueTable.map((row) => (
                          <tr
                            key={row._id}
                            className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <Link
                                href={`/admin/platform/${row._id}`}
                                className="text-white hover:text-teal-400 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                              >
                                {row.name}
                              </Link>
                            </td>
                            <td className="py-3 px-4">
                              <PlanBadge plan={row.plan as "starter" | "professional" | "enterprise"} />
                            </td>
                            <td className="py-3 px-4">
                              <SubscriptionStatusBadge status={row.subscriptionStatus as "active" | "trialing" | "past_due" | "canceled"} />
                            </td>
                            <td className="py-3 px-4 text-right text-white font-medium">
                              {row.monthlyAmount > 0 ? `$${row.monthlyAmount.toLocaleString()}` : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-600">
                          <td colSpan={3} className="py-3 px-4 text-sm font-semibold text-gray-300">
                            Total
                          </td>
                          <td className="py-3 px-4 text-right text-lg font-bold text-white">
                            ${revenueTableTotal.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TICKETS TAB                                                           */}
        {/* ==================================================================== */}
        {activeTab === "tickets" && (
          <div id="tabpanel-tickets" role="tabpanel" aria-labelledby="tab-tickets">
            {/* Ticket stats */}
            {!ticketMetrics ? (
              <StatsSkeleton count={4} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  title="Open"
                  value={ticketMetrics.open}
                  color="red"
                  icon={<CircleDot className="w-5 h-5" aria-hidden="true" />}
                />
                <StatCard
                  title="In Progress"
                  value={ticketMetrics.inProgress}
                  color="yellow"
                  icon={<Timer className="w-5 h-5" aria-hidden="true" />}
                />
                <StatCard
                  title="Avg Response"
                  value={formatResponseTime(ticketMetrics.avgResponseTime)}
                  color="blue"
                  icon={<Clock className="w-5 h-5" aria-hidden="true" />}
                />
                <StatCard
                  title="SLA Compliance"
                  value={`${Math.round(ticketMetrics.slaCompliance)}%`}
                  color="green"
                  icon={<CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
                />
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {/* Status filter */}
              <div className="flex bg-gray-800 border border-gray-700 rounded-lg overflow-hidden" role="group" aria-label="Filter tickets by status">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "open", label: "Open" },
                    { key: "in_progress", label: "In Progress" },
                    { key: "resolved", label: "Resolved" },
                    { key: "closed", label: "Closed" },
                  ] as { key: typeof ticketStatusFilter; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setTicketStatusFilter(tab.key)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                      ticketStatusFilter === tab.key
                        ? "bg-teal-600 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Severity filter */}
              <select
                value={ticketSeverityFilter}
                onChange={(e) => setTicketSeverityFilter(e.target.value as typeof ticketSeverityFilter)}
                className="bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="Filter tickets by severity"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Ticket list */}
            {!allTickets ? (
              <TableSkeleton />
            ) : filteredTickets.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                <Ticket className="w-10 h-10 text-gray-400 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-400">
                  {ticketStatusFilter !== "all" || ticketSeverityFilter !== "all"
                    ? "No tickets match your filters."
                    : "No support tickets yet."}
                </p>
                {(ticketStatusFilter !== "all" || ticketSeverityFilter !== "all") && (
                  <button
                    onClick={() => {
                      setTicketStatusFilter("all");
                      setTicketSeverityFilter("all");
                    }}
                    className="mt-3 text-sm text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto bg-gray-800 border border-gray-700 rounded-lg">
                <table className="w-full text-sm" role="table">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Ticket</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Org</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Subject</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Severity</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">SLA</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Created</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket) => (
                      <tr
                        key={ticket._id}
                        className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-gray-400 whitespace-nowrap">
                          {ticket.ticketNumber}
                        </td>
                        <td className="py-3 px-4 text-gray-300 truncate max-w-[160px]">
                          {ticket.organizationName}
                        </td>
                        <td className="py-3 px-4 text-white truncate max-w-[240px]">
                          {ticket.subject}
                        </td>
                        <td className="py-3 px-4">
                          <TicketSeverityBadge severity={ticket.severity} />
                        </td>
                        <td className="py-3 px-4">
                          <TicketStatusBadge status={ticket.status} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <SlaIndicator slaDeadline={ticket.slaDeadline} status={ticket.status} />
                        </td>
                        <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                          {formatRelativeTime(ticket.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/platform/tickets/${ticket._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                          >
                            View
                            <ArrowRight className="w-3 h-3" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ticket count */}
            {allTickets && filteredTickets.length > 0 && (
              <p className="mt-4 text-sm text-gray-400">
                Showing {filteredTickets.length} of {allTickets.length} ticket{allTickets.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
