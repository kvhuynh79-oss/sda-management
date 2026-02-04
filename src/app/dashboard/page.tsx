"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/ui";
import { SEVERITY_COLORS } from "@/constants/colors";
import { formatCurrency } from "@/utils/format";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const properties = useQuery(api.properties.getAll);
  const alertStats = useQuery(api.alerts.getStats);
  const scheduleStats = useQuery(api.preventativeSchedule.getStats);
  const upcomingSchedules = useQuery(api.preventativeSchedule.getUpcoming, { limit: 5 });
  const overdueSchedules = useQuery(api.preventativeSchedule.getOverdue);
  const activeAlerts = useQuery(api.alerts.getActive);
  const taskStats = useQuery(api.tasks.getStats);
  const upcomingTasks = useQuery(api.tasks.getUpcoming, { days: 7 });

  // Memoize property calculations
  const propertyStats = useMemo(() => {
    if (!properties) return null;

    const activeProperties = properties.filter(p => !p.propertyStatus || p.propertyStatus === "active");

    return {
      totalProperties: properties.length,
      totalDwellings: properties.reduce((sum, p) => sum + p.dwellingCount, 0),
      totalParticipants: activeProperties.reduce((sum, p) => sum + p.currentOccupancy, 0),
      totalVacancies: activeProperties.reduce((sum, p) => sum + p.vacancies, 0),
      activeSdaCount: activeProperties.length,
      underConstructionCount: properties.filter(p => p.propertyStatus === "under_construction").length,
      planningCount: properties.filter(p => p.propertyStatus === "planning").length,
      silPropertyCount: properties.filter(p => p.propertyStatus === "sil_property").length,
    };
  }, [properties]);

  // Memoize schedule calculations
  const scheduleCalcs = useMemo(() => {
    if (!upcomingSchedules) return { dueWithin7Days: 0, estimatedCost30Days: 0 };

    return {
      dueWithin7Days: upcomingSchedules.filter(s => s.daysUntilDue >= 0 && s.daysUntilDue <= 7).length,
      estimatedCost30Days: upcomingSchedules
        .filter(s => s.daysUntilDue >= 0 && s.daysUntilDue <= 30)
        .reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
    };
  }, [upcomingSchedules]);

  if (isLoading || !user) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="dashboard" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-white mb-8">Dashboard</h2>

        {/* Property Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/properties?status=active">
            <DashboardCard
              title="Active SDA"
              value={(propertyStats?.activeSdaCount ?? 0).toString()}
              subtitle="Operational properties"
              color="green"
            />
          </Link>
          <Link href="/properties?status=sil_property">
            <DashboardCard
              title="SIL Properties"
              value={(propertyStats?.silPropertyCount ?? 0).toString()}
              subtitle="SIL managed properties"
              color="orange"
            />
          </Link>
          <Link href="/properties?status=under_construction">
            <DashboardCard
              title="Under Construction"
              value={(propertyStats?.underConstructionCount ?? 0).toString()}
              subtitle="Properties being built"
              color="yellow"
            />
          </Link>
          <Link href="/properties?status=planning">
            <DashboardCard
              title="Planning Stage"
              value={(propertyStats?.planningCount ?? 0).toString()}
              subtitle="Future developments"
              color="blue"
            />
          </Link>
        </div>

        {/* General Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/properties">
            <DashboardCard
              title="Total Properties"
              value={(propertyStats?.totalProperties ?? 0).toString()}
              subtitle={`${propertyStats?.totalDwellings ?? 0} dwellings total`}
              color="blue"
            />
          </Link>
          <Link href="/participants">
            <DashboardCard
              title="Participants"
              value={(propertyStats?.totalParticipants ?? 0).toString()}
              subtitle="Active residents"
              color="green"
            />
          </Link>
          <Link href="/vacancies">
            <DashboardCard
              title="Vacancies"
              value={(propertyStats?.totalVacancies ?? 0).toString()}
              subtitle="Available spaces"
              color="yellow"
            />
          </Link>
          <div>
            <DashboardCard
              title="Alerts"
              value={(alertStats?.active || 0).toString()}
              subtitle={`${alertStats?.critical || 0} critical`}
              color="red"
            />
          </div>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link href="/follow-ups">
            <DashboardCard
              title="Open Tasks"
              value={(taskStats?.open || 0).toString()}
              subtitle="Pending follow-ups"
              color="blue"
            />
          </Link>
          <Link href="/follow-ups?status=pending">
            <DashboardCard
              title="Overdue Tasks"
              value={(taskStats?.overdue || 0).toString()}
              subtitle="Need attention"
              color={taskStats?.overdue && taskStats.overdue > 0 ? "red" : "green"}
            />
          </Link>
          <Link href="/follow-ups?priority=urgent">
            <DashboardCard
              title="Urgent Tasks"
              value={(taskStats?.byPriority?.urgent || 0).toString()}
              subtitle="High priority items"
              color={taskStats?.byPriority?.urgent && taskStats.byPriority.urgent > 0 ? "orange" : "green"}
            />
          </Link>
          <Link href="/follow-ups?category=funding">
            <DashboardCard
              title="Funding Tasks"
              value={(taskStats?.byCategory?.funding || 0).toString()}
              subtitle="Funding follow-ups"
              color="yellow"
            />
          </Link>
        </div>

        {/* Preventative Maintenance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/operations?tab=schedule">
            <DashboardCard
              title="Overdue Maintenance"
              value={(scheduleStats?.overdue || 0).toString()}
              subtitle="Requires immediate attention"
              color="red"
            />
          </Link>
          <Link href="/operations?tab=schedule">
            <DashboardCard
              title="Due Within 7 Days"
              value={scheduleCalcs.dueWithin7Days.toString()}
              subtitle="Upcoming scheduled tasks"
              color="yellow"
            />
          </Link>
          <Link href="/operations?tab=schedule">
            <DashboardCard
              title="Due Within 30 Days"
              value={(scheduleStats?.dueWithin30Days || 0).toString()}
              subtitle={`Est. ${formatCurrency(scheduleCalcs.estimatedCost30Days)}`}
              color="blue"
            />
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/participants/new">
              <QuickActionButton label="Add Participant" />
            </Link>
            <Link href="/properties/new">
              <QuickActionButton label="Add Property" />
            </Link>
            <Link href="/maintenance/new">
              <QuickActionButton label="Log Maintenance" />
            </Link>
            <Link href="/financials?tab=claims">
              <QuickActionButton label="View Claims" />
            </Link>
            <Link href="/documents/new">
              <QuickActionButton label="Upload Document" />
            </Link>
            <Link href="/operations?tab=schedule">
              <QuickActionButton label="View Schedule" />
            </Link>
            <Link href="/follow-ups/tasks/new">
              <QuickActionButton label="New Task" />
            </Link>
            <Link href="/follow-ups/communications/new">
              <QuickActionButton label="Log Communication" />
            </Link>
          </div>
        </div>

        {/* Upcoming Tasks */}
        {upcomingTasks && upcomingTasks.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Upcoming Tasks</h3>
              <Link href="/follow-ups" className="text-blue-400 hover:text-blue-300 text-sm">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingTasks.slice(0, 5).map((task) => {
                const priorityColors: Record<string, string> = {
                  urgent: "bg-red-600",
                  high: "bg-orange-600",
                  medium: "bg-yellow-600",
                  low: "bg-gray-600",
                };
                const categoryLabels: Record<string, string> = {
                  funding: "Funding",
                  plan_approval: "Plan Approval",
                  documentation: "Documentation",
                  follow_up: "Follow-up",
                  general: "General",
                };

                return (
                  <Link key={task._id} href={`/follow-ups/tasks/${task._id}`}>
                    <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-medium">{task.title}</p>
                          <span className={`px-2 py-1 text-white text-xs rounded-full ${priorityColors[task.priority]}`}>
                            {task.priority.toUpperCase()}
                          </span>
                          {task.isOverdue && (
                            <span className="px-2 py-1 text-white text-xs rounded-full bg-red-600 animate-pulse">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">
                          {categoryLabels[task.category]}
                          {task.participant && ` • ${task.participant.firstName} ${task.participant.lastName}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`${task.isOverdue ? "text-red-400" : "text-white"}`}>{task.dueDate}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Preventative Maintenance */}
        {upcomingSchedules && upcomingSchedules.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Upcoming Preventative Maintenance</h3>
              <Link href="/operations?tab=schedule" className="text-blue-400 hover:text-blue-300 text-sm">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingSchedules.map((schedule) => {
                const isOverdue = schedule.daysUntilDue < 0;
                const isDueSoon = schedule.daysUntilDue >= 0 && schedule.daysUntilDue <= 7;
                const statusColor = isOverdue
                  ? "bg-red-600"
                  : isDueSoon
                  ? "bg-yellow-600"
                  : "bg-green-600";
                const statusText = isOverdue
                  ? `OVERDUE (${Math.abs(schedule.daysUntilDue)} days)`
                  : `Due in ${schedule.daysUntilDue} days`;

                return (
                  <Link key={schedule._id} href="/operations?tab=schedule">
                    <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-medium">{schedule.taskName}</p>
                          <span className={`px-2 py-1 text-white text-xs rounded-full ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {schedule.dwelling
                            ? `${schedule.dwelling.dwellingName} at ${schedule.property?.addressLine1}`
                            : schedule.property?.addressLine1}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white">{schedule.nextDueDate}</p>
                        {schedule.estimatedCost && (
                          <p className="text-gray-400 text-sm">{formatCurrency(schedule.estimatedCost)}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Properties */}
        {properties && properties.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Properties</h3>
              <Link href="/properties" className="text-blue-400 hover:text-blue-300 text-sm">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {properties.slice(0, 5).map((property) => (
                <Link key={property._id} href={`/properties/${property._id}`}>
                  <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                    <div>
                      <p className="text-white font-medium">
                        {property.propertyName || property.addressLine1}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {property.suburb}, {property.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white">
                        {property.currentOccupancy}/{property.totalCapacity}
                      </p>
                      <p className="text-gray-400 text-sm">occupied</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Alerts Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Alerts</h3>
          </div>
          {activeAlerts && activeAlerts.length > 0 ? (
            <div className="space-y-3">
              {activeAlerts.slice(0, 5).map((alert) => (
                <div key={alert._id} className="p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-white text-xs rounded-full ${
                        SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS] || "bg-gray-600"
                      }`}
                    >
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-white font-medium">{alert.title}</span>
                  </div>
                  <p className="text-gray-400 text-sm">{alert.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">No alerts at this time</div>
          )}
        </div>
      </main>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: "blue" | "green" | "yellow" | "red" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    yellow: "bg-yellow-600",
    red: "bg-red-600",
    orange: "bg-orange-600",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">{title}</span>
        <div className={`w-3 h-3 rounded-full ${colorClasses[color]}`} />
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-500 text-sm">{subtitle}</div>
    </div>
  );
}

function QuickActionButton({ label }: { label: string }) {
  return (
    <div className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm text-center cursor-pointer">
      + {label}
    </div>
  );
}
