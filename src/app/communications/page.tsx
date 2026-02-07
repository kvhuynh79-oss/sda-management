"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState, StatCard, TaskCard } from "@/components/ui";
import ViewToggle, { type ViewMode } from "@/components/communications/ViewToggle";
import StatsHeader from "@/components/communications/StatsHeader";
import ThreadView from "@/components/communications/ThreadView";
import TimelineView from "@/components/communications/TimelineView";
import StakeholderView from "@/components/communications/StakeholderView";
import ComplianceView from "@/components/communications/ComplianceView";
import FilterSidebar, { type CommunicationFilters } from "@/components/communications/FilterSidebar";
import BulkActionBar from "@/components/communications/BulkActionBar";
import { useBulkSelection } from "@/hooks/useBulkSelection";

function CommunicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auth state from localStorage (useAuth pattern)
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("sda_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const userId = parsed._id || parsed.id;
        if (userId) {
          setUser({ id: userId, role: parsed.role });
        }
      } catch {
        // Invalid data
      }
    }
  }, []);

  // View state from URL
  const activeView = (searchParams.get("view") as ViewMode) || "thread";

  // Filters from URL
  const filters: CommunicationFilters = useMemo(() => ({
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    type: searchParams.get("type") || undefined,
    contactType: searchParams.get("contactType") || undefined,
    complianceCategory: searchParams.get("complianceCategory") || undefined,
    requiresFollowUp: searchParams.get("requiresFollowUp") === "true" || undefined,
    hasFlags: searchParams.get("hasFlags") === "true" || undefined,
  }), [searchParams]);

  // Thread-specific filters
  const threadFilterUnread = searchParams.get("threadFilter") === "unread";
  const threadFilterAction = searchParams.get("threadFilter") === "action";
  const threadStatus = (searchParams.get("threadStatus") as "active" | "completed" | "archived") || "active";

  // Active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((v) => v !== undefined && v !== false).length;
  }, [filters]);

  // Bulk selection
  const bulkSelection = useBulkSelection<string>();
  const isSelecting = bulkSelection.hasSelection;

  // Stats query
  const stats = useQuery(
    api.communications.getCommunicationDashboardStats,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  // Tasks queries (for Tasks tab)
  const tasks = useQuery(api.tasks.getAll);
  const taskStats = useQuery(api.tasks.getStats);
  const updateTaskStatus = useMutation(api.tasks.updateStatus);

  // Update URL params
  const updateUrl = useCallback(
    (params: Record<string, string | undefined>) => {
      const current = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === "") {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      }
      router.replace(`/communications?${current.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleViewChange = useCallback(
    (view: ViewMode) => {
      updateUrl({ view, threadFilter: undefined });
      bulkSelection.deselectAll();
    },
    [updateUrl, bulkSelection]
  );

  const handleFilterChange = useCallback(
    (newFilters: CommunicationFilters) => {
      updateUrl({
        dateFrom: newFilters.dateFrom,
        dateTo: newFilters.dateTo,
        type: newFilters.type,
        contactType: newFilters.contactType,
        complianceCategory: newFilters.complianceCategory,
        requiresFollowUp: newFilters.requiresFollowUp ? "true" : undefined,
        hasFlags: newFilters.hasFlags ? "true" : undefined,
      });
    },
    [updateUrl]
  );

  const handleStatClick = useCallback(
    (view: ViewMode, filter?: string) => {
      if (filter === "unread") {
        updateUrl({ view, threadFilter: "unread" });
      } else if (filter === "action") {
        updateUrl({ view, threadFilter: "action" });
      } else {
        updateUrl({ view, threadFilter: undefined });
      }
    },
    [updateUrl]
  );

  // Task filtering for Tasks tab
  const taskStatusFilter = searchParams.get("taskStatus") || "active";
  const taskPriorityFilter = searchParams.get("taskPriority") || "all";

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task) => {
      if (taskStatusFilter !== "all") {
        if (taskStatusFilter === "active" && (task.status === "completed" || task.status === "cancelled")) return false;
        else if (taskStatusFilter !== "active" && task.status !== taskStatusFilter) return false;
      }
      if (taskPriorityFilter !== "all" && task.priority !== taskPriorityFilter) return false;
      return true;
    });
  }, [tasks, taskStatusFilter, taskPriorityFilter]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
      if (priorityDiff !== 0) return priorityDiff;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [filteredTasks]);

  const handleTaskStatusChange = useCallback(
    async (taskId: string, newStatus: "pending" | "in_progress" | "completed" | "cancelled") => {
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
    },
    [user, updateTaskStatus]
  );

  if (!user) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="communications" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Communications</h1>
        </div>

        {/* Stats Header */}
        <StatsHeader
          stats={stats ? {
            totalThreads: stats.totalThreads,
            unreadThreads: stats.unreadThreads,
            requiresAction: stats.requiresAction,
            recentActivity: stats.recentActivity,
          } : undefined}
          onStatClick={handleStatClick}
        />

        {/* View Toggle */}
        <ViewToggle
          activeView={activeView}
          onChange={handleViewChange}
          counts={{
            threads: stats?.totalThreads,
            unread: stats?.unreadThreads,
            compliance: stats?.complianceBreakdown
              ? Object.entries(stats.complianceBreakdown)
                  .filter(([key]) => key !== "none" && key !== "routine")
                  .reduce((sum, [, count]) => sum + (count as number), 0)
              : 0,
            tasks: taskStats?.open,
          }}
        />

        {/* Main content area with sidebar */}
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <FilterSidebar
            filters={filters}
            onChange={handleFilterChange}
            activeFilterCount={activeFilterCount}
          />

          {/* Active View */}
          <div className="flex-1 min-w-0">
            {activeView === "thread" && (
              <ThreadView
                userId={user.id}
                filterUnread={threadFilterUnread || undefined}
                filterRequiresAction={threadFilterAction || undefined}
                statusFilter={threadStatus}
                onStatusChange={(status) => updateUrl({ threadStatus: status === "active" ? undefined : status })}
                userRole={user.role}
                isSelecting={isSelecting}
                selectedIds={bulkSelection.selectedIds}
                onToggleSelect={bulkSelection.toggle}
              />
            )}
            {activeView === "timeline" && (
              <TimelineView
                userId={user.id}
                typeFilter={filters.type}
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                isSelecting={isSelecting}
                selectedIds={bulkSelection.selectedIds}
                onToggleSelect={bulkSelection.toggle}
              />
            )}
            {activeView === "stakeholder" && (
              <StakeholderView
                userId={user.id}
                contactTypeFilter={filters.contactType}
              />
            )}
            {activeView === "compliance" && (
              <ComplianceView
                userId={user.id}
                categoryFilter={filters.complianceCategory}
                isSelecting={isSelecting}
                selectedIds={bulkSelection.selectedIds}
                onToggleSelect={bulkSelection.toggle}
              />
            )}
            {activeView === "tasks" && (
              <div role="tabpanel" id="panel-tasks" aria-labelledby="tab-tasks">
                {/* Task Stats */}
                {taskStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <StatCard title="Open Tasks" value={taskStats.open} color="blue" />
                    <StatCard title="Overdue" value={taskStats.overdue} color={taskStats.overdue > 0 ? "red" : "gray"} />
                    <StatCard title="Completed This Week" value={taskStats.completedThisWeek} color="green" />
                    <StatCard title="Urgent" value={taskStats.byPriority.urgent} color={taskStats.byPriority.urgent > 0 ? "yellow" : "gray"} />
                  </div>
                )}

                {/* Task Filters */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <div>
                    <label htmlFor="task-status" className="block text-xs text-gray-400 mb-1">Status</label>
                    <select
                      id="task-status"
                      value={taskStatusFilter}
                      onChange={(e) => updateUrl({ taskStatus: e.target.value === "active" ? undefined : e.target.value })}
                      className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="task-priority" className="block text-xs text-gray-400 mb-1">Priority</label>
                    <select
                      id="task-priority"
                      value={taskPriorityFilter}
                      onChange={(e) => updateUrl({ taskPriority: e.target.value === "all" ? undefined : e.target.value })}
                      className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Priorities</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Link
                      href="/follow-ups/tasks/new"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      + New Task
                    </Link>
                  </div>
                </div>

                {/* Task List */}
                {tasks === undefined ? (
                  <LoadingScreen fullScreen={false} message="Loading tasks..." />
                ) : sortedTasks.length === 0 ? (
                  <EmptyState
                    title="No tasks found"
                    description="Create a task to start tracking follow-ups."
                    icon={
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    }
                    action={{ label: "+ New Task", href: "/follow-ups/tasks/new" }}
                  />
                ) : (
                  <div className="space-y-3" role="list" aria-label="Tasks list">
                    {sortedTasks.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task as any}
                        onStatusChange={handleTaskStatusChange}
                        showQuickActions={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedIds={bulkSelection.selectedIds}
          onDeselectAll={bulkSelection.deselectAll}
          onActionComplete={bulkSelection.deselectAll}
          userId={user.id}
        />
      </main>
    </div>
  );
}

export default function CommunicationsPage() {
  return (
    <RequireAuth>
      <CommunicationsContent />
    </RequireAuth>
  );
}
