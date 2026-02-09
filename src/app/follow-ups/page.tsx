"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState, StatCard, TaskCard, CommunicationCard } from "@/components/ui";
import HelpGuideButton from "@/components/ui/HelpGuideButton";
import HelpGuidePanel from "@/components/ui/HelpGuidePanel";
import { HELP_GUIDES } from "@/constants/helpGuides";
import { Id } from "../../../convex/_generated/dataModel";

export default function FollowUpsPage() {
  const searchParams = useSearchParams();

  // Initialize filters from URL params
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get("priority") || "all");
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get("category") || "all");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [showCommunications, setShowCommunications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const tasks = useQuery(api.tasks.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const taskStats = useQuery(api.tasks.getStats, user ? { userId: user.id as Id<"users"> } : "skip");
  const recentCommunications = useQuery(api.communications.getRecent, user ? { userId: user.id as Id<"users">, limit: 10 } : "skip");
  const updateTaskStatus = useMutation(api.tasks.updateStatus);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.filter((task) => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "active" && (task.status === "completed" || task.status === "cancelled")) {
          return false;
        } else if (statusFilter !== "active" && task.status !== statusFilter) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && task.category !== categoryFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(search);
        const matchesDescription = task.description?.toLowerCase().includes(search);
        const matchesParticipant = task.participant
          ? `${task.participant.firstName} ${task.participant.lastName}`.toLowerCase().includes(search)
          : false;
        if (!matchesTitle && !matchesDescription && !matchesParticipant) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, categoryFilter, searchTerm]);

  // Sort by due date (overdue first, then by date)
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // Overdue tasks first
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      // Then by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // Then by due date
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [filteredTasks]);

  const hasFilters = statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || searchTerm !== "";

  const handleStatusChange = async (taskId: string, newStatus: "pending" | "in_progress" | "completed" | "cancelled") => {
    if (!user) return;
    try {
      await updateTaskStatus({
        id: taskId as Id<"tasks">,
        status: newStatus,
        userId: user.id as Id<"users">,
      });
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="communications" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Follow-ups & Tasks</h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Track tasks and communication follow-ups
              </p>
            </div>
            <div className="flex gap-2">
              <HelpGuideButton onClick={() => setShowHelp(true)} />
              <Link
                href="/follow-ups/communications/new"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                + Log Communication
              </Link>
              <Link
                href="/follow-ups/tasks/new"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                + New Task
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          {taskStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Open Tasks"
                value={taskStats.open}
                color="blue"
              />
              <StatCard
                title="Overdue"
                value={taskStats.overdue}
                color={taskStats.overdue > 0 ? "red" : "gray"}
              />
              <StatCard
                title="Completed This Week"
                value={taskStats.completedThisWeek}
                color="green"
              />
              <StatCard
                title="Urgent"
                value={taskStats.byPriority.urgent}
                color={taskStats.byPriority.urgent > 0 ? "yellow" : "gray"}
              />
            </div>
          )}

          {/* Filters */}
          <fieldset className="bg-gray-800 rounded-lg p-4 mb-6">
            <legend className="sr-only">Filter tasks</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm text-gray-400 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className="block text-sm text-gray-400 mb-1">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active (Open)</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label htmlFor="priority-filter" className="block text-sm text-gray-400 mb-1">
                  Priority
                </label>
                <select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label htmlFor="category-filter" className="block text-sm text-gray-400 mb-1">
                  Category
                </label>
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="all">All Categories</option>
                  <option value="funding">Funding</option>
                  <option value="plan_approval">Plan Approval</option>
                  <option value="documentation">Documentation</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Results count */}
          {tasks !== undefined && (
            <p className="text-sm text-gray-400 mb-4" aria-live="polite">
              Showing {sortedTasks.length} task{sortedTasks.length !== 1 ? "s" : ""}
              {hasFilters && " (filtered)"}
            </p>
          )}

          {/* Tasks List */}
          {tasks === undefined ? (
            <LoadingScreen fullScreen={false} message="Loading tasks..." />
          ) : sortedTasks.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No tasks match your filters" : "No tasks yet"}
              description={
                hasFilters
                  ? "Try adjusting your filters to see more tasks"
                  : "Create your first task to start tracking follow-ups"
              }
              icon={<svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>}
              action={
                !hasFilters
                  ? {
                      label: "+ New Task",
                      href: "/follow-ups/tasks/new",
                    }
                  : undefined
              }
              isFiltered={hasFilters}
            />
          ) : (
            <div className="space-y-4" role="list" aria-label="Tasks list">
              {sortedTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task as any}
                  onStatusChange={handleStatusChange}
                  showQuickActions={true}
                />
              ))}
            </div>
          )}

          {/* Communications Section (Collapsible) */}
          <div className="mt-8 border-t border-gray-700 pt-6">
            <button
              onClick={() => setShowCommunications(!showCommunications)}
              className="flex items-center gap-2 text-lg font-semibold text-white hover:text-gray-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
              aria-expanded={showCommunications}
            >
              <span className={`transform transition-transform ${showCommunications ? "rotate-90" : ""}`}>
                ▶
              </span>
              Communication History
              {recentCommunications && (
                <span className="text-sm font-normal text-gray-400">
                  ({recentCommunications.length} recent)
                </span>
              )}
            </button>

            {showCommunications && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-gray-400 text-sm">Recent communications</p>
                  <Link
                    href="/follow-ups/communications/new"
                    className="text-teal-500 hover:text-teal-400 text-sm transition-colors"
                  >
                    + Log New
                  </Link>
                </div>

                {recentCommunications === undefined ? (
                  <LoadingScreen fullScreen={false} message="Loading communications..." />
                ) : recentCommunications.length === 0 ? (
                  <EmptyState
                    title="No communications logged"
                    description="Log your first communication to start tracking"
                    icon={<svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>}
                    action={{
                      label: "+ Log Communication",
                      href: "/follow-ups/communications/new",
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recentCommunications.map((comm) => (
                      <CommunicationCard
                        key={comm._id}
                        communication={comm as any}
                        compact={true}
                      />
                    ))}
                  </div>
                )}

                {recentCommunications && recentCommunications.length > 0 && (
                  <div className="mt-4 text-center">
                    <Link
                      href="/follow-ups/communications"
                      className="text-teal-500 hover:text-teal-400 text-sm transition-colors"
                    >
                      View All Communications →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <HelpGuidePanel
          guide={HELP_GUIDES.communications}
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
        />
      </div>
    </RequireAuth>
  );
}
