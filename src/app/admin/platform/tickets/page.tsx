"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "../../../../components/Header";
import { RequireAuth } from "../../../../components/RequireAuth";
import { useAuth } from "../../../../hooks/useAuth";
import {
  ArrowLeft,
  Ticket,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CircleDot,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helper: format relative time
// ---------------------------------------------------------------------------

function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 60) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// SLA indicator dot
// ---------------------------------------------------------------------------

function SlaIndicator({ slaDeadline }: { slaDeadline: number }) {
  const now = Date.now();
  const remaining = slaDeadline - now;
  const fourHours = 4 * 60 * 60 * 1000;

  let colorClass: string;
  let label: string;

  if (remaining <= 0) {
    colorClass = "bg-red-500";
    label = "SLA overdue";
  } else if (remaining < fourHours) {
    colorClass = "bg-yellow-500";
    label = "SLA due soon (less than 4 hours)";
  } else {
    colorClass = "bg-green-500";
    label = "SLA on track";
  }

  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${colorClass} flex-shrink-0`}
      title={label}
      aria-label={label}
    />
  );
}

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { className: string; label: string }> = {
    critical: {
      className: "text-red-400 bg-red-500/20 border-red-500/30",
      label: "Critical",
    },
    high: {
      className: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
      label: "High",
    },
    normal: {
      className: "text-blue-400 bg-blue-500/20 border-blue-500/30",
      label: "Normal",
    },
    low: {
      className: "text-gray-400 bg-gray-500/20 border-gray-500/30",
      label: "Low",
    },
  };

  const { className, label } = config[severity] || config.normal;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${className}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    open: {
      className: "bg-red-600 text-white",
      label: "Open",
    },
    in_progress: {
      className: "bg-yellow-600 text-white",
      label: "In Progress",
    },
    waiting_on_customer: {
      className: "bg-blue-600 text-white",
      label: "Waiting",
    },
    resolved: {
      className: "bg-green-600 text-white",
      label: "Resolved",
    },
    closed: {
      className: "bg-gray-600 text-white",
      label: "Closed",
    },
  };

  const { className, label } = config[status] || config.open;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded ${className}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TicketListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 bg-gray-700 rounded" />
                <div className="h-4 w-48 bg-gray-700 rounded" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-32 bg-gray-700 rounded" />
                <div className="h-3 w-16 bg-gray-700 rounded" />
                <div className="h-3 w-16 bg-gray-700 rounded" />
              </div>
            </div>
            <div className="h-5 w-20 bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusFilter =
  | "all"
  | "open"
  | "in_progress"
  | "waiting_on_customer"
  | "resolved"
  | "closed";
type SeverityFilter = "all" | "critical" | "high" | "normal" | "low";

// ---------------------------------------------------------------------------
// Main page export
// ---------------------------------------------------------------------------

export default function TicketDashboardPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <TicketDashboardContent />
    </RequireAuth>
  );
}

// ---------------------------------------------------------------------------
// Page content (rendered inside RequireAuth)
// ---------------------------------------------------------------------------

function TicketDashboardContent() {
  const { user } = useAuth();
  const userId = user ? (user.id as Id<"users">) : undefined;

  // Super-admin guard
  const dbUser = useQuery(api.auth.getUser, userId ? { userId } : "skip");
  const isSuperAdmin = dbUser?.isSuperAdmin === true;

  // Fetch all tickets across all orgs (super-admin only)
  const tickets = useQuery(
    api.supportTickets.getAllTickets,
    userId && isSuperAdmin ? { userId } : "skip"
  );

  // Local filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Client-side filtering
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];

    return tickets.filter((ticket) => {
      // Status filter
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;

      // Severity filter
      if (severityFilter !== "all" && ticket.severity !== severityFilter)
        return false;

      // Search filter (ticket number, subject, org name)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          ticket.ticketNumber.toLowerCase().includes(term) ||
          ticket.subject.toLowerCase().includes(term) ||
          ticket.organizationName.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [tickets, statusFilter, severityFilter, searchTerm]);

  // Quick stat counts
  const stats = useMemo(() => {
    if (!tickets) return { open: 0, inProgress: 0, overdue: 0, total: 0 };
    const now = Date.now();
    return {
      open: tickets.filter((t) => t.status === "open").length,
      inProgress: tickets.filter(
        (t) => t.status === "in_progress" || t.status === "waiting_on_customer"
      ).length,
      overdue: tickets.filter(
        (t) =>
          t.slaDeadline < now &&
          t.status !== "resolved" &&
          t.status !== "closed"
      ).length,
      total: tickets.length,
    };
  }, [tickets]);

  // ---- Access denied state ----
  if (dbUser !== undefined && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="admin" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="p-4 bg-red-600/20 rounded-full mb-4">
              <ShieldCheck
                className="w-10 h-10 text-red-400"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Access Denied
            </h1>
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

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-teal-600/20 rounded-lg">
            <Ticket className="w-8 h-8 text-teal-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
            <p className="text-gray-400">
              Manage support tickets across all organizations
            </p>
          </div>
        </div>

        {/* Quick stats */}
        {tickets && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total Tickets</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{stats.open}</div>
              <div className="text-sm text-gray-400">Open</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {stats.inProgress}
              </div>
              <div className="text-sm text-gray-400">In Progress</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className="w-5 h-5 text-red-400"
                  aria-hidden="true"
                />
                <span className="text-2xl font-bold text-red-400">
                  {stats.overdue}
                </span>
              </div>
              <div className="text-sm text-gray-400">SLA Overdue</div>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Status filter */}
          <div
            className="flex bg-gray-800 border border-gray-700 rounded-lg overflow-hidden flex-wrap"
            role="tablist"
            aria-label="Filter tickets by status"
          >
            {(
              [
                { key: "all", label: "All" },
                { key: "open", label: "Open" },
                { key: "in_progress", label: "In Progress" },
                { key: "waiting_on_customer", label: "Waiting" },
                { key: "resolved", label: "Resolved" },
                { key: "closed", label: "Closed" },
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

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) =>
              setSeverityFilter(e.target.value as SeverityFilter)
            }
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Filter tickets by severity"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {/* Search input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="Search tickets by number, subject, or organization"
            />
          </div>
        </div>

        {/* Ticket list */}
        {!tickets ? (
          <TicketListSkeleton />
        ) : filteredTickets.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
            {tickets.length === 0 ? (
              <>
                <Ticket
                  className="w-10 h-10 text-gray-400 mx-auto mb-3"
                  aria-hidden="true"
                />
                <p className="text-gray-400">No tickets yet.</p>
              </>
            ) : (
              <>
                <Filter
                  className="w-10 h-10 text-gray-400 mx-auto mb-3"
                  aria-hidden="true"
                />
                <p className="text-gray-400">
                  No tickets match your filters.
                </p>
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setSeverityFilter("all");
                    setSearchTerm("");
                  }}
                  className="mt-3 text-sm text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket._id}
                href={`/admin/platform/tickets/${ticket._id}`}
                className="block bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Left section: ticket info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <span className="text-sm font-mono text-teal-400 font-semibold">
                        {ticket.ticketNumber}
                      </span>
                      <span className="text-white font-medium truncate max-w-[300px] sm:max-w-[400px]">
                        {ticket.subject.length > 50
                          ? `${ticket.subject.substring(0, 50)}...`
                          : ticket.subject}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-gray-400">
                        {ticket.organizationName}
                      </span>
                      <SeverityBadge severity={ticket.severity} />
                      <StatusBadge status={ticket.status} />
                      <SlaIndicator slaDeadline={ticket.slaDeadline} />
                    </div>
                  </div>

                  {/* Right section: time and message count */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {ticket.messageCount > 0 && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <CircleDot
                          className="w-3 h-3"
                          aria-hidden="true"
                        />
                        {ticket.messageCount}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {timeAgo(ticket.createdAt)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Result count */}
        {tickets && filteredTickets.length > 0 && (
          <p className="mt-4 text-sm text-gray-400">
            Showing {filteredTickets.length} of {tickets.length} ticket
            {tickets.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>
    </div>
  );
}
