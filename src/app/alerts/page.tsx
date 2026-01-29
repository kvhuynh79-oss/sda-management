"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Id } from "../../../convex/_generated/dataModel";

export default function AlertsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");

  const allAlerts = useQuery(api.alerts.getAll);
  const stats = useQuery(api.alerts.getStats);
  const acknowledgeAlert = useMutation(api.alerts.acknowledge);
  const resolveAlert = useMutation(api.alerts.resolve);
  const dismissAlert = useMutation(api.alerts.dismiss);
  const generateAlerts = useMutation(api.alerts.generateAlerts);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

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
    try {
      await dismissAlert({ alertId });
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

  if (!user) {
    return <LoadingScreen />;
  }

  // Filter alerts
  const filteredAlerts = allAlerts?.filter((alert) => {
    const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity;
    const matchesType = filterType === "all" || alert.alertType === filterType;
    const matchesStatus = filterStatus === "all" || alert.status === filterStatus;

    return matchesSeverity && matchesType && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Alerts & Notifications</h2>
            <p className="text-gray-400 mt-1">Monitor important events and take action</p>
          </div>
          <button
            onClick={handleGenerateAlerts}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            🔄 Generate Alerts
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard label="Active Alerts" value={stats.active.toString()} color="blue" />
            <StatCard label="Critical" value={stats.critical.toString()} color="red" />
            <StatCard label="Warnings" value={stats.warning.toString()} color="yellow" />
            <StatCard label="Info" value={stats.info.toString()} color="green" />
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
              <select
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
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
        </div>

        {/* Alerts List */}
        {allAlerts === undefined ? (
          <div className="text-gray-400 text-center py-12">Loading alerts...</div>
        ) : filteredAlerts && filteredAlerts.length === 0 ? (
          <EmptyState hasFilters={filterStatus !== "active" || filterSeverity !== "all" || filterType !== "all"} />
        ) : (
          <div className="space-y-4">
            {filteredAlerts?.map((alert) => (
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

        {/* Results count */}
        {filteredAlerts && filteredAlerts.length > 0 && (
          <p className="text-gray-400 text-sm text-center mt-6">
            Showing {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>
    </div>
  );
}

function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(
    null
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sda_user");
    router.push("/login");
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <Image
                src="/Logo.jpg"
                alt="Better Living Solutions"
                width={140}
                height={40}
                className="rounded"
              />
            </Link>
            <nav className="flex gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/properties" className="text-gray-400 hover:text-white transition-colors">
                Properties
              </Link>
              <Link
                href="/participants"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Participants
              </Link>
              <Link href="/payments" className="text-gray-400 hover:text-white transition-colors">
                Payments
              </Link>
              <Link
                href="/maintenance"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Maintenance
              </Link>
              <Link href="/documents" className="text-gray-400 hover:text-white transition-colors">
                Documents
              </Link>
              <Link href="/alerts" className="text-white font-medium">
                Alerts
              </Link>
              <Link href="/schedule" className="text-gray-400 hover:text-white transition-colors">
                Schedule
              </Link>
              <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
                Settings
              </Link>
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-gray-300">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                {user.role.replace("_", " ")}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colorClasses = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
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
  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-600",
      warning: "bg-yellow-600",
      info: "bg-blue-600",
    };
    return colors[severity] || colors.info;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-red-600",
      acknowledged: "bg-yellow-600",
      resolved: "bg-green-600",
      dismissed: "bg-gray-600",
    };
    return colors[status] || colors.active;
  };

  const formatType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getLinkedEntity = () => {
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
  };

  const linkedEntity = getLinkedEntity();

  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors border-l-4 border-l-red-600">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-3 py-1 text-white text-xs rounded-full ${getSeverityColor(
                alert.severity
              )}`}
            >
              {alert.severity.toUpperCase()}
            </span>
            <span
              className={`px-3 py-1 text-white text-xs rounded-full ${getStatusColor(
                alert.status
              )}`}
            >
              {alert.status.toUpperCase()}
            </span>
            <span className="text-gray-400 text-xs">{formatType(alert.alertType)}</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">{alert.title}</h3>
          <p className="text-gray-300 text-sm mb-3">{alert.message}</p>

          {linkedEntity && (
            <div className="text-sm text-gray-400">
              <span className="text-gray-500">{linkedEntity.type}: </span>
              {linkedEntity.link ? (
                <Link href={linkedEntity.link} className="text-blue-400 hover:text-blue-300">
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
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors"
            >
              Acknowledge
            </button>
            <button
              onClick={() => onResolve(alert._id)}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
            >
              Resolve
            </button>
            <button
              onClick={() => onDismiss(alert._id)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
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
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg p-12 text-center">
      <div className="text-gray-500 text-6xl mb-4">🔔</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {hasFilters ? "No alerts found" : "All clear!"}
      </h3>
      <p className="text-gray-400 mb-6">
        {hasFilters
          ? "Try adjusting your filters to see more results"
          : "No active alerts at this time"}
      </p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
