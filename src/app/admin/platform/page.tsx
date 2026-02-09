"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
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
} from "lucide-react";

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
// Loading skeleton for stats
// ---------------------------------------------------------------------------

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {Array.from({ length: 5 }).map((_, i) => (
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

// ---------------------------------------------------------------------------
// Loading skeleton for org list
// ---------------------------------------------------------------------------

function OrgListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-5 w-48 bg-gray-700 rounded" />
              <div className="h-3 w-64 bg-gray-700 rounded" />
            </div>
            <div className="h-9 w-16 bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

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

type StatusFilter = "all" | "active" | "trialing" | "suspended";

function PlatformDashboardContent() {
  const { user } = useAuth();
  const userId = user ? (user.id as Id<"users">) : undefined;

  // Super-admin guard: check isSuperAdmin flag via a direct user query
  const dbUser = useQuery(
    api.auth.getUser,
    userId ? { userId } : "skip"
  );

  const isSuperAdmin = dbUser?.isSuperAdmin === true;

  // Queries - use actual Convex inferred types
  const metrics = useQuery(
    api.superAdmin.getPlatformMetrics,
    userId && isSuperAdmin ? { userId } : "skip"
  );

  const organizations = useQuery(
    api.superAdmin.getAllOrganizations,
    userId && isSuperAdmin ? { userId } : "skip"
  );

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Filtered orgs - backend returns { ...org, stats: { userCount, propertyCount, ... }, lastLoginTimestamp }
  const filteredOrgs = useMemo(() => {
    if (!organizations) return [];

    return organizations.filter((org) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
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
  }, [organizations, searchTerm, statusFilter]);

  // Plan distribution counts
  const planDistribution = useMemo(() => {
    if (!organizations) return { starter: 0, professional: 0, enterprise: 0 };
    return {
      starter: organizations.filter((o) => o.plan === "starter").length,
      professional: organizations.filter((o) => o.plan === "professional").length,
      enterprise: organizations.filter((o) => o.plan === "enterprise").length,
    };
  }, [organizations]);

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

        {/* ---- Platform Metrics ---- */}
        {!metrics ? (
          <StatsSkeleton />
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

        {/* ---- Plan Distribution ---- */}
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

        {/* ---- Organization List ---- */}
        <section aria-labelledby="organizations-heading">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2
              id="organizations-heading"
              className="text-lg font-semibold text-white"
            >
              Organizations
            </h2>

            {/* Search & Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3">
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
                    onClick={() => setStatusFilter(tab.key)}
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  aria-label="Search organizations by name"
                />
              </div>
            </div>
          </div>

          {/* Organization cards */}
          {!organizations ? (
            <OrgListSkeleton />
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
                  }}
                  className="mt-3 text-sm text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrgs.map((org) => (
                <div
                  key={org._id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:bg-gray-700/80 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Left: name + badges */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-white font-semibold text-base truncate">
                          {org.name}
                        </h3>
                        <PlanBadge plan={org.plan} />
                        <SubscriptionStatusBadge status={org.subscriptionStatus} />
                        {!org.isActive && (
                          <Badge variant="error" size="xs">
                            Suspended
                          </Badge>
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

                    {/* Right: view button */}
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

          {/* Result count */}
          {organizations && filteredOrgs.length > 0 && (
            <p className="mt-4 text-sm text-gray-400">
              Showing {filteredOrgs.length} of {organizations.length} organization
              {organizations.length !== 1 ? "s" : ""}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
