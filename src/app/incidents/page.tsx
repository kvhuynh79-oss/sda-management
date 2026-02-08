"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState } from "@/components/ui";
import { formatStatus } from "@/utils/format";

// Severity badge colors
const SEVERITY_BADGE_COLORS: Record<string, string> = {
  critical: "bg-red-600",
  major: "bg-orange-600",
  moderate: "bg-yellow-600",
  minor: "bg-gray-600",
};

// Incident status badge colors
const INCIDENT_STATUS_COLORS: Record<string, string> = {
  reported: "bg-red-600",
  under_investigation: "bg-yellow-600",
  resolved: "bg-green-600",
  closed: "bg-gray-600",
};

export default function IncidentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const incidents = useQuery(api.incidents.getAll, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const hasFilters = statusFilter !== "all";

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900 overflow-x-hidden">
        <Header currentPage="incidents" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Incident Reports</h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">Track and manage incident reports</p>
            </div>
            <Link
              href="/incidents/new"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex-shrink-0 self-start sm:self-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              + Report Incident
            </Link>
          </div>

          {/* Filters */}
          <fieldset className="bg-gray-800 rounded-lg p-4 mb-6">
            <legend className="sr-only">Filter incidents by status</legend>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
              <span className="text-gray-400 flex-shrink-0" id="status-filter-label">Filter by status:</span>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" role="group" aria-labelledby="status-filter-label">
                {["all", "reported", "under_investigation", "resolved", "closed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    aria-pressed={statusFilter === status}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      statusFilter === status
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {status === "all" ? "All" : formatStatus(status)}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          {/* Results count */}
          {incidents !== undefined && (
            <p className="text-sm text-gray-400 mb-4" aria-live="polite">
              Showing {incidents.length} incident{incidents.length !== 1 ? "s" : ""}
              {hasFilters && " (filtered)"}
            </p>
          )}

          {/* Incidents List */}
          {incidents === undefined ? (
            <LoadingScreen fullScreen={false} message="Loading incidents..." />
          ) : incidents.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No incidents match your filter" : "No incidents reported"}
              description={
                hasFilters
                  ? "Try selecting a different status filter"
                  : "Use the button above to report a new incident"
              }
              icon={<svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
              action={
                !hasFilters
                  ? {
                      label: "+ Report Incident",
                      href: "/incidents/new",
                    }
                  : undefined
              }
              isFiltered={hasFilters}
            />
          ) : (
            <div className="space-y-4" role="list" aria-label="Incidents list">
              {incidents.map((incident) => (
                <IncidentCard key={incident._id} incident={incident} />
              ))}
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}

function IncidentCard({ incident }: { incident: any }) {
  return (
    <article
      className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700 hover:bg-gray-700/80 transition-colors"
      role="listitem"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 rounded text-xs text-white ${
                SEVERITY_BADGE_COLORS[incident.severity] || "bg-gray-600"
              }`}
            >
              {incident.severity.toUpperCase()}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs text-white ${
                INCIDENT_STATUS_COLORS[incident.status] || "bg-gray-600"
              }`}
            >
              {incident.status.replace(/_/g, " ").toUpperCase()}
            </span>
            {incident.isNdisReportable && (
              <>
                {incident.ndisNotificationOverdue ? (
                  <span className="px-2 py-1 rounded text-xs bg-red-600 text-white font-semibold ring-2 ring-red-500/40 ring-offset-1 ring-offset-gray-800">
                    NDIS OVERDUE
                  </span>
                ) : incident.ndisCommissionNotified ? (
                  <span className="px-2 py-1 rounded text-xs bg-green-600 text-white">
                    NDIS Notified
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded text-xs bg-yellow-600 text-black font-medium">
                    NDIS Required ({incident.ndisNotificationTimeframe === "24_hours" ? "24hr" : "5 days"})
                  </span>
                )}
              </>
            )}
            <span className="text-gray-400 text-sm">{formatStatus(incident.incidentType)}</span>
          </div>
          <h2 className="text-lg font-semibold text-white">{incident.title}</h2>
          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{incident.description}</p>
        </div>
        <div className="flex sm:flex-col gap-2 flex-shrink-0">
          <Link
            href={`/incidents/${incident._id}`}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            View Details
          </Link>
          <Link
            href={`/follow-ups/communications/new?subject=${encodeURIComponent(`Incident: ${incident.title}`)}&complianceCategory=incident_related&linkedIncidentId=${incident._id}${incident.participantId ? `&participantId=${incident.participantId}` : ""}${incident.propertyId ? `&propertyId=${incident.propertyId}` : ""}${incident.participant ? `&contactName=${encodeURIComponent(`${incident.participant.firstName} ${incident.participant.lastName}`)}` : ""}`}
            className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded text-sm text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Add Entry
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 sm:gap-6 text-sm text-gray-400">
        <div>
          <span className="text-gray-400">Property:</span>{" "}
          {incident.property?.propertyName || incident.property?.addressLine1}
        </div>
        {incident.participant && (
          <div>
            <span className="text-gray-400">Participant:</span>{" "}
            {incident.participant.firstName} {incident.participant.lastName}
          </div>
        )}
        <div>
          <span className="text-gray-400">Date:</span> {incident.incidentDate}
        </div>
      </div>
    </article>
  );
}
