"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState, StatCard } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "../../../convex/_generated/dataModel";
import { formatStatus } from "@/utils/format";

// Severity badge colors
const SEVERITY_BADGE_COLORS: Record<string, string> = {
  critical: "bg-red-600",
  warning: "bg-yellow-600",
  info: "bg-blue-600",
};

// Alert status badge colors
const ALERT_STATUS_COLORS: Record<string, string> = {
  active: "bg-red-600",
  acknowledged: "bg-yellow-600",
  resolved: "bg-green-600",
  dismissed: "bg-gray-600",
};

export default function AlertsPage() {
  const { user } = useAuth();
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");

  const allAlerts = useQuery(api.alerts.getAll);
  const stats = useQuery(api.alerts.getStats);
  const acknowledgeAlert = useMutation(api.alerts.acknowledge);
  const resolveAlert = useMutation(api.alerts.resolve);
  const dismissAlert = useMutation(api.alerts.dismiss);
  const generateAlerts = useMutation(api.alerts.generateAlerts);

  // Memoize filtered alerts
  const filteredAlerts = useMemo(() => {
    if (!allAlerts) return [];

    return allAlerts.filter((alert) => {
      const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity;
      const matchesType = filterType === "all" || alert.alertType === filterType;
      const matchesStatus = filterStatus === "all" || alert.status === filterStatus;

      return matchesSeverity && matchesType && matchesStatus;
    });
  }, [allAlerts, filterSeverity, filterType, filterStatus]);

  const hasFilters =
    filterStatus !== "active" || filterSeverity !== "all" || filterType !== "all";

  const handleAcknowledge = async (alertId: Id<"alerts">) => {
    if (!user) return;
    try {
      await acknowledgeAlert({ alertId, userId: user.id as Id<"users"> });
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  const handleResolve = async (alertId: Id<"alerts">) => {
    if (!user) return;
    try {
      await resolveAlert({ alertId, userId: user.id as Id<"users"> });
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    }
  };

  const handleDismiss = async (alertId: Id<"alerts">) => {
    if (!user) return;
    try {
      await dismissAlert({ alertId, userId: user.id as Id<"users"> });
    } catch (err) {
      console.error("Failed to dismiss alert:", err);
    }
  };

  const handleGenerateAlerts = async () => {
    try {
      await generateAlerts({});
    } catch (err) {
      console.error("Failed to generate alerts:", err);
    }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="dashboard" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Alerts & Notifications</h1>
              <p className="text-gray-400 mt-1">Monitor important events and take action</p>
            </div>
            <button
              onClick={handleGenerateAlerts}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Generate Alerts
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard title="Active Alerts" value={stats.active} color="blue" />
              <StatCard title="Critical" value={stats.critical} color="red" />
              <StatCard title="Warnings" value={stats.warning} color="yellow" />
              <StatCard title="Info" value={stats.info} color="green" />
            </div>
          )}

          {/* Filters */}
          <fieldset className="bg-gray-800 rounded-lg p-4 mb-6">
            <legend className="sr-only">Filter alerts</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
              <div>
                <label htmlFor="severity-filter" className="block text-sm font-medium text-gray-300 mb-2">
                  Severity
                </label>
                <select
                  id="severity-filter"
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
              <div>
                <label htmlFor="type-filter" className="block text-sm font-medium text-gray-300 mb-2">
                  Type
                </label>
                <select
                  id="type-filter"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="claim_due">Claim Due</option>
                  <option value="plan_expiry">Plan Expiry</option>
                  <option value="document_expiry">Document Expiry</option>
                  <option value="maintenance_due">Maintenance Due</option>
                  <option value="vacancy">Vacancy</option>
                  <option value="payment_missing">Payment Missing</option>
                  <option value="low_funding">Low Funding</option>
                  <option value="preventative_schedule_due">Preventative Schedule Due</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Results count */}
          {allAlerts !== undefined && (
            <p className="text-sm text-gray-400 mb-4" aria-live="polite">
              Showing {filteredAlerts.length} of {allAlerts.length} alerts
              {hasFilters && " (filtered)"}
            </p>
          )}

          {/* Alerts List */}
          {allAlerts === undefined ? (
            <LoadingScreen fullScreen={false} message="Loading alerts..." />
          ) : filteredAlerts.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No alerts found" : "All clear!"}
              description={
                hasFilters
                  ? "Try adjusting your filters to see more results"
                  : "No active alerts at this time"
              }
              icon={<span className="text-6xl">🔔</span>}
              isFiltered={hasFilters}
            />
          ) : (
            <div className="space-y-4" role="list" aria-label="Alerts list">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert._id}
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onDismiss,
}: {
  alert: any;
  onAcknowledge: (id: Id<"alerts">) => void;
  onResolve: (id: Id<"alerts">) => void;
  onDismiss: (id: Id<"alerts">) => void;
}) {
  const linkedEntity = useMemo(() => {
    if (alert.alertType === "claim_due" && alert.participant) {
      return {
        name: `${alert.participant.firstName} ${alert.participant.lastName}`,
        link: `/financials?tab=claims`,
        type: "Claim",
      };
    }
    if (alert.participant) {
      return {
        name: `${alert.participant.firstName} ${alert.participant.lastName}`,
        link: `/participants/${alert.participant._id}`,
        type: "Participant",
      };
    }
    if (alert.property) {
      return {
        name: alert.property.propertyName || alert.property.addressLine1,
        link: `/properties/${alert.property._id}`,
        type: "Property",
      };
    }
    if (alert.dwelling) {
      return {
        name: alert.dwelling.dwellingName,
        link: null,
        type: "Dwelling",
      };
    }
    if (alert.maintenance) {
      return {
        name: alert.maintenance.title,
        link: `/maintenance`,
        type: "Maintenance",
      };
    }
    if (alert.preventativeSchedule) {
      return {
        name: alert.preventativeSchedule.taskName,
        link: `/preventative-schedule`,
        type: "Preventative Schedule",
      };
    }
    return null;
  }, [alert]);

  return (
    <article
      className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors border-l-4 border-l-red-600"
      role="listitem"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-3 py-1 text-white text-xs rounded-full ${
                SEVERITY_BADGE_COLORS[alert.severity] || "bg-gray-600"
              }`}
            >
              {alert.severity.toUpperCase()}
            </span>
            <span
              className={`px-3 py-1 text-white text-xs rounded-full ${
                ALERT_STATUS_COLORS[alert.status] || "bg-gray-600"
              }`}
            >
              {alert.status.toUpperCase()}
            </span>
            <span className="text-gray-400 text-xs">{formatStatus(alert.alertType)}</span>
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">{alert.title}</h2>
          <p className="text-gray-300 text-sm mb-3">{alert.message}</p>

          {linkedEntity && (
            <div className="text-sm text-gray-400">
              <span className="text-gray-500">{linkedEntity.type}: </span>
              {linkedEntity.link ? (
                <Link
                  href={linkedEntity.link}
                  className="text-blue-400 hover:text-blue-300 focus:outline-none focus-visible:underline"
                >
                  {linkedEntity.name}
                </Link>
              ) : (
                <span className="text-white">{linkedEntity.name}</span>
              )}
            </div>
          )}
        </div>

        {alert.status === "active" && (
          <div className="flex gap-2">
            <button
              onClick={() => onAcknowledge(alert._id)}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
            >
              Acknowledge
            </button>
            <button
              onClick={() => onResolve(alert._id)}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Resolve
            </button>
            <button
              onClick={() => onDismiss(alert._id)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Trigger Date</p>
          <p className="text-white">{alert.triggerDate}</p>
        </div>
        {alert.dueDate && (
          <div>
            <p className="text-gray-500 text-xs">Due Date</p>
            <p className="text-white">{alert.dueDate}</p>
          </div>
        )}
      </div>
    </article>
  );
}
