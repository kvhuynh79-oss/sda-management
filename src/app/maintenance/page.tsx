"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

export default function MaintenancePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allRequests = useQuery(api.maintenanceRequests.getAll);
  const stats = useQuery(api.maintenanceRequests.getStats);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  if (!user) {
    return <LoadingScreen />;
  }

  // Filter requests
  const filteredRequests = allRequests?.filter((request) => {
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

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="maintenance" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Maintenance Requests</h2>
            <p className="text-gray-400 mt-1">Track and manage property maintenance</p>
          </div>
          <Link
            href="/maintenance/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + Log Request
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard label="Total Requests" value={stats.total.toString()} color="blue" />
            <StatCard label="Open" value={stats.open.toString()} color="yellow" />
            <StatCard label="Urgent" value={stats.urgent.toString()} color="red" />
            <StatCard label="Completed" value={stats.completed.toString()} color="green" />
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Title, description, property..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
              <select
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
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
        </div>

        {/* Requests List */}
        {allRequests === undefined ? (
          <div className="text-gray-400 text-center py-12">Loading requests...</div>
        ) : filteredRequests && filteredRequests.length === 0 ? (
          <EmptyState
            hasFilters={
              searchTerm !== "" ||
              filterStatus !== "open" ||
              filterPriority !== "all" ||
              filterCategory !== "all"
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredRequests?.map((request) => (
              <RequestCard key={request._id} request={request} />
            ))}
          </div>
        )}

        {/* Results count */}
        {filteredRequests && filteredRequests.length > 0 && (
          <p className="text-gray-400 text-sm text-center mt-6">
            Showing {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>
    </div>
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

function RequestCard({ request }: { request: any }) {
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-600",
      high: "bg-orange-600",
      medium: "bg-yellow-600",
      low: "bg-gray-600",
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      reported: "bg-red-600",
      awaiting_quotes: "bg-orange-600",
      quoted: "bg-yellow-600",
      approved: "bg-blue-600",
      scheduled: "bg-purple-600",
      in_progress: "bg-cyan-600",
      completed: "bg-green-600",
      cancelled: "bg-gray-600",
    };
    return colors[status] || colors.reported;
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Link href={`/maintenance/${request._id}`} className="block">
      <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer border border-transparent hover:border-gray-600">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs text-white ${getPriorityColor(request.priority)}`}>
                {request.priority.toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs text-white ${getStatusColor(request.status)}`}>
                {formatStatus(request.status)}
              </span>
              <span className="text-gray-400 text-sm">{formatCategory(request.category)}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{request.title}</h3>
            <p className="text-gray-300 text-sm mb-3">{request.description}</p>
          </div>
          <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
            Edit
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-700 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Property</p>
            <p className="text-white">
              {request.property?.propertyName || request.property?.addressLine1 || "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Dwelling</p>
            <p className="text-white">{request.dwelling?.dwellingName || "Unknown"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Reported Date</p>
            <p className="text-white">{request.reportedDate}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">
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
                <p className="text-gray-500 text-xs">Contractor</p>
                <p className="text-white">{request.contractorName}</p>
              </div>
            )}
            {request.quotedAmount && (
              <div>
                <p className="text-gray-500 text-xs">Quoted</p>
                <p className="text-white">${request.quotedAmount.toFixed(2)}</p>
              </div>
            )}
            {request.actualCost && (
              <div>
                <p className="text-gray-500 text-xs">Actual Cost</p>
                <p className="text-white">${request.actualCost.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg p-12 text-center">
      <div className="text-gray-500 text-6xl mb-4">🔧</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {hasFilters ? "No requests found" : "No maintenance requests yet"}
      </h3>
      <p className="text-gray-400 mb-6">
        {hasFilters
          ? "Try adjusting your filters to see more results"
          : "Start tracking maintenance by logging your first request"}
      </p>
      {!hasFilters && (
        <Link
          href="/maintenance/new"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + Log First Request
        </Link>
      )}
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
