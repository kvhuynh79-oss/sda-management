"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import ViewToggle, { type ViewMode } from "@/components/communications/ViewToggle";
import StatsHeader from "@/components/communications/StatsHeader";
import ThreadView from "@/components/communications/ThreadView";
import TimelineView from "@/components/communications/TimelineView";
import StakeholderView from "@/components/communications/StakeholderView";
import ComplianceView from "@/components/communications/ComplianceView";
import FilterSidebar, { type CommunicationFilters } from "@/components/communications/FilterSidebar";

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

  // Active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((v) => v !== undefined && v !== false).length;
  }, [filters]);

  // Stats query
  const stats = useQuery(
    api.communications.getCommunicationDashboardStats,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

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
    },
    [updateUrl]
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
              />
            )}
            {activeView === "timeline" && (
              <TimelineView
                userId={user.id}
                typeFilter={filters.type}
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
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
              />
            )}
          </div>
        </div>
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
