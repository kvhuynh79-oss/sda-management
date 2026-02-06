"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState, StatCard } from "@/components/ui";
import { PRIORITY_COLORS, MAINTENANCE_STATUS_COLORS } from "@/constants/colors";
import { formatStatus, formatCategory, formatCurrency } from "@/utils/format";

// Priority badge colors (solid backgrounds for badges)
const PRIORITY_BADGE_COLORS: Record<string, string> = {
  urgent: "bg-red-600",
  high: "bg-orange-600",
  medium: "bg-yellow-600",
  low: "bg-gray-600",
};

// Status badge colors (solid backgrounds for badges)
const STATUS_BADGE_COLORS: Record<string, string> = {
  reported: "bg-red-600",
  awaiting_quotes: "bg-orange-600",
  quoted: "bg-yellow-600",
  approved: "bg-blue-600",
  scheduled: "bg-purple-600",
  in_progress: "bg-cyan-600",
  completed: "bg-green-600",
  cancelled: "bg-gray-600",
};

export default function MaintenancePage() {
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allRequests = useQuery(api.maintenanceRequests.getAll);
  const stats = useQuery(api.maintenanceRequests.getStats);

  // Memoize filtered requests
  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];

    return allRequests.filter((request) => {
      // Status filter
      let matchesStatus = true;
      if (filterStatus === "open") {
        matchesStatus = request.status !== "completed" && request.status !== "cancelled";
      } else if (filterStatus !== "all") {
        matchesStatus = request.status === filterStatus;
      }

      // Priority filter
      const matchesPriority = filterPriority === "all" || request.priority === filterPriority;

      // Category filter
      const matchesCategory = filterCategory === "all" || request.category === filterCategory;

      // Search filter
      const matchesSearch =
        !searchTerm ||
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.property?.addressLine1.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.dwelling?.dwellingName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesPriority && matchesCategory && matchesSearch;
    });
  }, [allRequests, filterStatus, filterPriority, filterCategory, searchTerm]);

  const hasFilters = searchTerm !== "" || filterStatus !== "open" || filterPriority !== "all" || filterCategory !== "all";

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="operations" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Maintenance Requests</h1>
              <p className="text-gray-400 mt-1">Track and manage property maintenance</p>
            </div>
            <Link
              href="/maintenance/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              + Log Request
            </Link>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Requests" value={stats.total} color="blue" />
              <StatCard title="Open" value={stats.open} color="yellow" />
              <StatCard title="Urgent" value={stats.urgent} color="red" />
              <StatCard title="Completed" value={stats.completed} color="green" />
            </div>
          )}

          {/* Filters */}
          <fieldset className="bg-gray-800 rounded-lg p-4 mb-6">
            <legend className="sr-only">Filter maintenance requests</legend>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-2">
                  Search
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Title, description, property..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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
                  <option value="open">Open</option>
                  <option value="reported">Reported</option>
                  <option value="awaiting_quotes">Awaiting Quotes</option>
                  <option value="quoted">Quoted</option>
                  <option value="approved">Approved</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  id="priority-filter"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  id="category-filter"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="appliances">Appliances</option>
                  <option value="building">Building</option>
                  <option value="grounds">Grounds</option>
                  <option value="safety">Safety</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Results count */}
          {allRequests !== undefined && (
            <p className="text-sm text-gray-400 mb-4" aria-live="polite">
              Showing {filteredRequests.length} of {allRequests.length} requests
              {hasFilters && " (filtered)"}
            </p>
          )}

          {/* Requests List */}
          {allRequests === undefined ? (
            <LoadingScreen fullScreen={false} message="Loading maintenance requests..." />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No requests match your filters" : "No maintenance requests yet"}
              description={
                hasFilters
                  ? "Try adjusting your filters to see more results"
                  : "Start tracking maintenance by logging your first request"
              }
              icon={<span className="text-6xl">🔧</span>}
              action={
                !hasFilters
                  ? {
                      label: "+ Log First Request",
                      href: "/maintenance/new",
                    }
                  : undefined
              }
              isFiltered={hasFilters}
            />
          ) : (
            <div className="space-y-4" role="list" aria-label="Maintenance requests list">
              {filteredRequests.map((request) => (
                <RequestCard key={request._id} request={request} />
              ))}
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}

function RequestCard({ request }: { request: any }) {
  return (
    <Link
      href={`/maintenance/${request._id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
      role="listitem"
    >
      <article className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer border border-transparent hover:border-gray-600">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`px-3 py-1 rounded-full text-xs text-white ${
                  PRIORITY_BADGE_COLORS[request.priority] || "bg-gray-600"
                }`}
              >
                {request.priority.toUpperCase()}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs text-white ${
                  STATUS_BADGE_COLORS[request.status] || "bg-gray-600"
                }`}
              >
                {formatStatus(request.status)}
              </span>
              <span className="text-gray-400 text-sm">{formatCategory(request.category)}</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">{request.title}</h2>
            <p className="text-gray-300 text-sm mb-3">{request.description}</p>
          </div>
          <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-700 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Property</p>
            <p className="text-white">
              {request.property?.propertyName || request.property?.addressLine1 || "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Dwelling</p>
            <p className="text-white">{request.dwelling?.dwellingName || "Unknown"}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Reported Date</p>
            <p className="text-white">{request.reportedDate}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">
              {request.requestType === "reactive" ? "Reported By" : "Type"}
            </p>
            <p className="text-white capitalize">
              {request.reportedBy || request.requestType.replace("_", " ")}
            </p>
          </div>
        </div>

        {(request.contractorName || request.quotedAmount || request.actualCost) && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700 text-sm">
            {request.contractorName && (
              <div>
                <p className="text-gray-400 text-xs">Contractor</p>
                <p className="text-white">{request.contractorName}</p>
              </div>
            )}
            {request.quotedAmount && (
              <div>
                <p className="text-gray-400 text-xs">Quoted</p>
                <p className="text-white">{formatCurrency(request.quotedAmount)}</p>
              </div>
            )}
            {request.actualCost && (
              <div>
                <p className="text-gray-400 text-xs">Actual Cost</p>
                <p className="text-white">{formatCurrency(request.actualCost)}</p>
              </div>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}
