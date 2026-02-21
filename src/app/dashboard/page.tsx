"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui";
import { SEVERITY_COLORS } from "@/constants/colors";
import { formatCurrency } from "@/utils/format";
import { Id } from "../../../convex/_generated/dataModel";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const userId = user ? (user.id as Id<"users">) : undefined;
  const properties = useQuery(api.properties.getAll, userId ? { userId } : "skip");
  const alertStats = useQuery(api.alerts.getStats, userId ? { userId } : "skip");
  const scheduleStats = useQuery(api.preventativeSchedule.getStats, userId ? { userId } : "skip");
  const upcomingSchedules = useQuery(api.preventativeSchedule.getUpcoming, userId ? { userId, limit: 5 } : "skip");
  const overdueSchedules = useQuery(api.preventativeSchedule.getOverdue, userId ? { userId } : "skip");
  const activeAlerts = useQuery(api.alerts.getActive, userId ? { userId } : "skip");
  const taskStats = useQuery(api.tasks.getStats, userId ? { userId } : "skip");
  const upcomingTasks = useQuery(api.tasks.getUpcoming, userId ? { userId, days: 30 } : "skip");
  const certStats = useQuery(api.complianceCertifications.getDashboardStats, userId ? { userId } : "skip");
  const consentStats = useQuery(api.participants.getConsentStats, userId ? { userId } : "skip");

  const createTask = useMutation(api.tasks.create);
  const updateTaskStatus = useMutation(api.tasks.updateStatus);

  // Quick task entry
  const [quickTaskTitle, setQuickTaskTitle] = useState("");

  // Collapsible sections (persisted in localStorage)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("dashboard_collapsed") || "{}");
    } catch {
      return {};
    }
  });

  const toggleSection = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("dashboard_collapsed", JSON.stringify(next));
      return next;
    });
  }, []);

  const tasksExpanded = collapsed["tasksExpanded"] ?? false;

  const handleQuickAdd = async () => {
    if (!quickTaskTitle.trim() || !user) return;
    const today = new Date().toISOString().split("T")[0];
    await createTask({
      title: quickTaskTitle.trim(),
      dueDate: today,
      priority: "medium",
      category: "general",
      createdBy: user.id as Id<"users">,
    });
    setQuickTaskTitle("");
  };

  const handleCompleteTask = async (taskId: Id<"tasks">) => {
    if (!user) return;
    await updateTaskStatus({
      id: taskId,
      status: "completed",
      userId: user.id as Id<"users">,
    });
  };

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
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="dashboard" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-white mb-8">Dashboard</h2>

        {/* Property Portfolio */}
        <section className="mb-10" aria-labelledby="section-property-portfolio">
          <div
            className="flex justify-between items-center mb-4 cursor-pointer select-none"
            onClick={() => toggleSection("portfolio")}
            role="button"
            aria-expanded={!collapsed["portfolio"]}
          >
            <h3 id="section-property-portfolio" className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Property Portfolio
            </h3>
            <span className="text-gray-400 text-sm">{collapsed["portfolio"] ? "▶" : "▼"}</span>
          </div>
          {!collapsed["portfolio"] && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            </>
          )}
        </section>

        {/* Tasks & Follow-ups */}
        <section className="mb-10" aria-labelledby="section-tasks">
          <div
            className="flex justify-between items-center mb-4 cursor-pointer select-none"
            onClick={() => toggleSection("taskStats")}
            role="button"
            aria-expanded={!collapsed["taskStats"]}
          >
            <h3 id="section-tasks" className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Tasks & Follow-ups
            </h3>
            <span className="text-gray-400 text-sm">{collapsed["taskStats"] ? "▶" : "▼"}</span>
          </div>
          {!collapsed["taskStats"] && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
          )}
        </section>

        {/* Operations */}
        <section className="mb-10" aria-labelledby="section-operations">
          <div
            className="flex justify-between items-center mb-4 cursor-pointer select-none"
            onClick={() => toggleSection("operations")}
            role="button"
            aria-expanded={!collapsed["operations"]}
          >
            <h3 id="section-operations" className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Operations
            </h3>
            <span className="text-gray-400 text-sm">{collapsed["operations"] ? "▶" : "▼"}</span>
          </div>
          {!collapsed["operations"] && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          )}
        </section>

        {/* Task Command Centre */}
        <section className="mb-10" aria-labelledby="section-command-centre">
          <div
            className="flex justify-between items-center mb-4 cursor-pointer select-none"
            onClick={() => toggleSection("commandCentre")}
            role="button"
            aria-expanded={!collapsed["commandCentre"]}
          >
            <div className="flex items-center gap-2">
              <h3 id="section-command-centre" className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Tasks
              </h3>
              {upcomingTasks && upcomingTasks.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-700 text-white">
                  {upcomingTasks.length}
                </span>
              )}
            </div>
            <span className="text-gray-400 text-sm">{collapsed["commandCentre"] ? "▶" : "▼"}</span>
          </div>
          {!collapsed["commandCentre"] && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
              {/* Quick Add */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
                  placeholder="Quick add task... (press Enter)"
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-gray-400 text-sm"
                />
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickTaskTitle.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                >
                  +
                </button>
              </div>

              {/* Task List */}
              {upcomingTasks && upcomingTasks.length > 0 ? (
                <div className={`space-y-2 ${tasksExpanded ? "max-h-[400px] overflow-y-auto pr-1" : ""}`}>
                  {upcomingTasks.slice(0, tasksExpanded ? 15 : 5).map((task) => (
                    <div
                      key={task._id}
                      className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors group"
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleCompleteTask(task._id as Id<"tasks">)}
                        className="w-5 h-5 flex-shrink-0 rounded-full border-2 border-gray-500 hover:border-teal-500 hover:bg-teal-500/20 transition-colors flex items-center justify-center"
                        title="Mark complete"
                        aria-label={`Complete task: ${task.title}`}
                      >
                        <span className="opacity-0 group-hover:opacity-100 text-teal-400 text-xs">✓</span>
                      </button>

                      {/* Task Content */}
                      <Link href={`/follow-ups/tasks/${task._id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-white text-sm font-medium truncate">{task.title}</p>
                          <span className={`px-1.5 py-0.5 text-white text-xs rounded-full ${priorityColors[task.priority]} flex-shrink-0`}>
                            {task.priority.toUpperCase()}
                          </span>
                          {task.isOverdue && (
                            <span className="px-1.5 py-0.5 text-white text-xs rounded-full bg-red-600 font-semibold ring-2 ring-red-500/40 ring-offset-1 ring-offset-gray-800 flex-shrink-0">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs">
                          {categoryLabels[task.category]}
                          {task.participant && ` · ${task.participant.firstName} ${task.participant.lastName}`}
                        </p>
                      </Link>

                      {/* Due Date */}
                      <span className={`text-sm flex-shrink-0 ${task.isOverdue ? "text-red-400" : "text-gray-400"}`}>
                        {task.dueDate}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">No upcoming tasks</p>
              )}

              {/* Expand/Collapse Toggle */}
              {upcomingTasks && upcomingTasks.length > 5 && (
                <button
                  onClick={() => toggleSection("tasksExpanded")}
                  className="w-full mt-2 py-1.5 text-sm text-gray-400 hover:text-teal-400 transition-colors flex items-center justify-center gap-1"
                >
                  {tasksExpanded ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      Show less
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      Show more ({upcomingTasks.length - 5} more)
                    </>
                  )}
                </button>
              )}

              {/* Footer */}
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-700">
                <Link href="/follow-ups/tasks/new" className="text-teal-500 hover:text-teal-400 text-sm">
                  + Detailed Task
                </Link>
                <Link href="/follow-ups" className="text-teal-500 hover:text-teal-400 text-sm">
                  View all →
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="mb-10" aria-labelledby="section-quick-actions">
          <div
            className="flex justify-between items-center mb-4 cursor-pointer select-none"
            onClick={() => toggleSection("quickActions")}
            role="button"
            aria-expanded={!collapsed["quickActions"]}
          >
            <h3 id="section-quick-actions" className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Quick Actions
            </h3>
            <span className="text-gray-400 text-sm">{collapsed["quickActions"] ? "▶" : "▼"}</span>
          </div>
          {!collapsed["quickActions"] && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
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
          )}
        </section>

        {/* Recent Activity */}
        <section className="mb-10" aria-labelledby="section-recent-activity">
          <h3 id="section-recent-activity" className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Recent Activity
          </h3>

        {/* Upcoming Preventative Maintenance */}
        {upcomingSchedules && upcomingSchedules.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-600">
            <div
              className="flex justify-between items-center cursor-pointer select-none"
              onClick={() => toggleSection("maintenance")}
              role="button"
              aria-expanded={!collapsed["maintenance"]}
            >
              <h3 className="text-lg font-semibold text-white">Upcoming Preventative Maintenance</h3>
              <div className="flex items-center gap-3">
                <Link href="/operations?tab=schedule" className="text-teal-500 hover:text-teal-400 text-sm" onClick={(e) => e.stopPropagation()}>
                  View all →
                </Link>
                <span className="text-gray-400 text-sm">{collapsed["maintenance"] ? "▶" : "▼"}</span>
              </div>
            </div>
            {!collapsed["maintenance"] && (
              <div className="space-y-3 mt-4">
                {upcomingSchedules.map((schedule) => (
                  <Link key={schedule._id} href="/operations?tab=schedule">
                    <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-medium">{schedule.taskName}</p>
                          <span
                            className={`px-2 py-1 text-white text-xs rounded-full ${
                              schedule.daysUntilDue <= 0
                                ? "bg-red-600"
                                : schedule.daysUntilDue <= 7
                                ? "bg-yellow-600"
                                : "bg-green-600"
                            }`}
                          >
                            {schedule.daysUntilDue <= 0
                              ? `${Math.abs(schedule.daysUntilDue)} days overdue`
                              : `Due in ${schedule.daysUntilDue} days`}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {schedule.property?.propertyName || schedule.property?.addressLine1 || "Unknown property"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white">{schedule.nextDueDate}</p>
                        {schedule.estimatedCost && (
                          <p className="text-gray-400 text-sm">
                            {formatCurrency(schedule.estimatedCost)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Participant Consent Status */}
        {consentStats && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-600">
            <div
              className="flex justify-between items-center cursor-pointer select-none"
              onClick={() => toggleSection("consent")}
              role="button"
              aria-expanded={!collapsed["consent"]}
            >
              <h3 className="text-lg font-semibold text-white">Participant Consent</h3>
              <div className="flex items-center gap-3">
                <Link href="/participants" className="text-teal-500 hover:text-teal-400 text-sm" onClick={(e) => e.stopPropagation()}>
                  View Participants &rarr;
                </Link>
                <span className="text-gray-400 text-sm">{collapsed["consent"] ? "▶" : "▼"}</span>
              </div>
            </div>
            {!collapsed["consent"] && (
              <div className="mt-4">
                {consentStats.expired > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-600/50 rounded-lg mb-3">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-red-400 text-sm font-medium">
                      {consentStats.expired} consent{consentStats.expired !== 1 ? "s" : ""} expired &mdash; renewal required
                    </span>
                  </div>
                )}
                {consentStats.missing > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg mb-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-yellow-400 text-sm font-medium">
                      {consentStats.missing} participant{consentStats.missing !== 1 ? "s" : ""} missing consent records
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-400">{consentStats.active}</p>
                    <p className="text-gray-300 text-sm">Active</p>
                  </div>
                  <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                    <p className={`text-2xl font-bold ${consentStats.expiringSoon > 0 ? "text-yellow-400" : "text-white"}`}>
                      {consentStats.expiringSoon}
                    </p>
                    <p className="text-gray-300 text-sm">Expiring Soon</p>
                  </div>
                  <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                    <p className={`text-2xl font-bold ${consentStats.expired > 0 ? "text-red-400" : "text-white"}`}>
                      {consentStats.expired}
                    </p>
                    <p className="text-gray-300 text-sm">Expired</p>
                  </div>
                  <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                    <p className={`text-2xl font-bold ${consentStats.missing > 0 ? "text-gray-300" : "text-white"}`}>
                      {consentStats.missing}
                    </p>
                    <p className="text-gray-300 text-sm">Missing</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compliance Certifications */}
        {certStats && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-600">
            <div
              className="flex justify-between items-center cursor-pointer select-none"
              onClick={() => toggleSection("certs")}
              role="button"
              aria-expanded={!collapsed["certs"]}
            >
              <h3 className="text-lg font-semibold text-white">Compliance Certifications</h3>
              <div className="flex items-center gap-3">
                <Link href="/compliance/certifications" className="text-teal-500 hover:text-teal-400 text-sm" onClick={(e) => e.stopPropagation()}>
                  View Certifications →
                </Link>
                <span className="text-gray-400 text-sm">{collapsed["certs"] ? "▶" : "▼"}</span>
              </div>
            </div>
            {!collapsed["certs"] && (
              <div className="mt-4">
                {certStats.expired > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-600/50 rounded-lg mb-3">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-red-400 text-sm font-medium">
                      {certStats.expired} certification{certStats.expired !== 1 ? "s" : ""} expired — action required
                    </span>
                  </div>
                )}
                {certStats.expiringSoon > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg mb-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-yellow-400 text-sm font-medium">
                      {certStats.expiringSoon} certification{certStats.expiringSoon !== 1 ? "s" : ""} expiring within 30 days
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                    <p className="text-2xl font-bold text-white">{certStats.total}</p>
                    <p className="text-gray-300 text-sm">Total Certs</p>
                  </div>
                  <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                    <p className={`text-2xl font-bold ${certStats.expired > 0 ? "text-red-400" : "text-white"}`}>
                      {certStats.expired}
                    </p>
                    <p className="text-gray-300 text-sm">Expired</p>
                  </div>
                  <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                    <p className={`text-2xl font-bold ${certStats.expiringSoon > 0 ? "text-yellow-400" : "text-white"}`}>
                      {certStats.expiringSoon}
                    </p>
                    <p className="text-gray-300 text-sm">Expiring Soon</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alerts Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
          <div
            className="flex justify-between items-center cursor-pointer select-none"
            onClick={() => toggleSection("alerts")}
            role="button"
            aria-expanded={!collapsed["alerts"]}
          >
            <h3 className="text-lg font-semibold text-white">Recent Alerts</h3>
            <span className="text-gray-400 text-sm">{collapsed["alerts"] ? "▶" : "▼"}</span>
          </div>
          {!collapsed["alerts"] && (
            <>
              {activeAlerts && activeAlerts.length > 0 ? (
                <div className="space-y-3 mt-4">
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
                <div className="text-gray-400 text-center py-8 mt-4">No alerts at this time</div>
              )}
            </>
          )}
        </div>
        </section>
      </main>
      <BottomNav currentPage="dashboard" />
    </div>
    </RequireAuth>
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
    blue: "bg-teal-700",
    green: "bg-green-600",
    yellow: "bg-yellow-600",
    red: "bg-red-600",
    orange: "bg-orange-600",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-600 hover:bg-gray-700/80 hover:border-gray-500 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-300 text-sm font-medium">{title}</span>
        <div className={`w-3 h-3 rounded-full ${colorClasses[color]}`} />
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-400 text-sm">{subtitle}</div>
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
