"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import Badge from "@/components/ui/Badge";
import {
  LifeBuoy,
  Plus,
  Clock,
  ArrowRight,
  AlertCircle,
  Inbox,
} from "lucide-react";

// ── Status badge configuration ───────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { variant: "error" | "warning" | "info" | "success" | "neutral"; label: string }> = {
  open: { variant: "error", label: "Open" },
  in_progress: { variant: "warning", label: "In Progress" },
  waiting_on_customer: { variant: "info", label: "Waiting on You" },
  resolved: { variant: "success", label: "Resolved" },
  closed: { variant: "neutral", label: "Closed" },
};

const SEVERITY_CONFIG: Record<string, { variant: "error" | "warning" | "info" | "neutral"; label: string }> = {
  critical: { variant: "error", label: "Critical" },
  high: { variant: "warning", label: "High" },
  normal: { variant: "info", label: "Normal" },
  low: { variant: "neutral", label: "Low" },
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug Report",
  how_to: "How-to Question",
  feature_request: "Feature Request",
  billing: "Billing",
  data_issue: "Data Issue",
  other: "Other",
};

// ── Relative time helper ─────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(timestamp).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function TicketSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-4 bg-gray-700 rounded w-24 mb-2" />
          <div className="h-5 bg-gray-700 rounded w-3/4" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-700 rounded-full w-16" />
          <div className="h-6 bg-gray-700 rounded-full w-16" />
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="h-3 bg-gray-700 rounded w-20" />
        <div className="h-3 bg-gray-700 rounded w-24" />
        <div className="h-3 bg-gray-700 rounded w-28" />
      </div>
    </div>
  );
}

// ── Main page component ──────────────────────────────────────────────────────

export default function SupportPage() {
  const { user } = useAuth();
  const router = useRouter();

  const tickets = useQuery(
    api.supportTickets.getByOrganization,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  // Stats
  const stats = useMemo(() => {
    if (!tickets) return null;
    const open = tickets.filter((t) => t.status === "open").length;
    const inProgress = tickets.filter(
      (t) => t.status === "in_progress" || t.status === "waiting_on_customer"
    ).length;
    const resolved = tickets.filter(
      (t) => t.status === "resolved" || t.status === "closed"
    ).length;
    return { open, inProgress, resolved, total: tickets.length };
  }, [tickets]);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="support" />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li className="text-gray-400" aria-hidden="true">/</li>
              <li className="text-white">Support Tickets</li>
            </ol>
          </nav>

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <LifeBuoy className="w-7 h-7 text-teal-400" aria-hidden="true" />
              <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
            </div>
            <Link
              href="/support"
              onClick={(e) => {
                e.preventDefault();
                // Trigger the floating SupportButton instead of navigating
                const triggerBtn = document.getElementById("support-trigger-button");
                if (triggerBtn) {
                  triggerBtn.click();
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              New Ticket
            </Link>
          </div>

          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{stats.open}</p>
                <p className="text-xs text-gray-400 mt-0.5">Open</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{stats.inProgress}</p>
                <p className="text-xs text-gray-400 mt-0.5">In Progress</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
                <p className="text-xs text-gray-400 mt-0.5">Resolved</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {!tickets && (
            <div className="space-y-3">
              <TicketSkeleton />
              <TicketSkeleton />
              <TicketSkeleton />
            </div>
          )}

          {/* Empty state */}
          {tickets && tickets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-gray-400" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">No support tickets yet</h3>
              <p className="text-gray-400 text-sm max-w-sm">
                Need help? Click the support button in the bottom-right corner to submit a ticket.
              </p>
            </div>
          )}

          {/* Ticket list */}
          {tickets && tickets.length > 0 && (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                const severityCfg = SEVERITY_CONFIG[ticket.severity] || SEVERITY_CONFIG.normal;
                const categoryLabel = CATEGORY_LABELS[ticket.category] || ticket.category;

                return (
                  <button
                    key={ticket._id}
                    onClick={() => router.push(`/support/${ticket._id}`)}
                    className="w-full text-left bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700/80 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono text-teal-400">
                            {ticket.ticketNumber}
                          </span>
                          <Badge variant={statusCfg.variant} size="xs" dot>
                            {statusCfg.label}
                          </Badge>
                          <Badge variant={severityCfg.variant} size="xs">
                            {severityCfg.label}
                          </Badge>
                        </div>
                        <h3 className="text-white font-medium truncate">
                          {ticket.subject}
                        </h3>
                      </div>
                      <ArrowRight
                        className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors flex-shrink-0 mt-1"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-400">
                      <span>{categoryLabel}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        Created {formatRelativeTime(ticket.createdAt)}
                      </span>
                      {ticket.updatedAt !== ticket.createdAt && (
                        <span>Updated {formatRelativeTime(ticket.updatedAt)}</span>
                      )}
                      {ticket.messageCount > 0 && (
                        <span>
                          {ticket.messageCount} message{ticket.messageCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {/* SLA warning */}
                      {(ticket.status === "open" || ticket.status === "in_progress") &&
                        ticket.slaDeadline < Date.now() && (
                          <span className="flex items-center gap-1 text-red-400 font-medium">
                            <AlertCircle className="w-3 h-3" aria-hidden="true" />
                            SLA Overdue
                          </span>
                        )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}
