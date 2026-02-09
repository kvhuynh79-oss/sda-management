"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import SILProviderHeader from "@/components/SILProviderHeader";
import Link from "next/link";

type MaintenanceStatus =
  | "reported"
  | "awaiting_quotes"
  | "quoted"
  | "approved"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export default function SILProviderMaintenance() {
  const router = useRouter();
  const [silProviderId, setSilProviderId] = useState<Id<"silProviders"> | null>(
    null
  );
  const [providerName, setProviderName] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | "all">(
    "all"
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(storedUser);
    if (user.role !== "sil_provider" || !user.silProviderId) {
      router.push("/dashboard");
      return;
    }

    setSilProviderId(user.silProviderId as Id<"silProviders">);
    setProviderName(user.providerName || "");
  }, [router]);

  const maintenanceRequests = useQuery(
    api.silProviderPortal.getMaintenanceRequests,
    silProviderId
      ? {
          silProviderId,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }
      : "skip"
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-600 text-white";
      case "high":
        return "bg-orange-600 text-white";
      case "medium":
        return "bg-yellow-600 text-white";
      case "low":
        return "bg-teal-700 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reported":
        return "bg-teal-700/20 text-teal-500";
      case "awaiting_quotes":
      case "quoted":
        return "bg-yellow-600/20 text-yellow-400";
      case "approved":
      case "scheduled":
        return "bg-purple-600/20 text-purple-400";
      case "in_progress":
        return "bg-orange-600/20 text-orange-400";
      case "completed":
        return "bg-green-600/20 text-green-400";
      case "cancelled":
        return "bg-gray-600/20 text-gray-400";
      default:
        return "bg-gray-600/20 text-gray-400";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "plumbing":
        return "🔧";
      case "electrical":
        return "⚡";
      case "appliances":
        return "🔌";
      case "building":
        return "🏠";
      case "grounds":
        return "🌳";
      case "safety":
        return "🛡️";
      default:
        return "🔨";
    }
  };

  if (!silProviderId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <SILProviderHeader
        currentPage="maintenance"
        providerName={providerName}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Maintenance</h1>
            <p className="text-gray-400 mt-1">
              View and request maintenance for your properties
            </p>
          </div>
          <Link
            href="/portal/maintenance/new"
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Request Maintenance
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex gap-4 overflow-x-auto">
            {[
              { value: "all", label: "All" },
              { value: "reported", label: "Reported" },
              { value: "in_progress", label: "In Progress" },
              { value: "scheduled", label: "Scheduled" },
              { value: "completed", label: "Completed" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() =>
                  setStatusFilter(tab.value as MaintenanceStatus | "all")
                }
                className={`pb-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  statusFilter === tab.value
                    ? "border-yellow-500 text-yellow-400"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Maintenance List */}
        {!maintenanceRequests ? (
          <div className="text-center py-8">
            <div className="text-gray-400">Loading maintenance requests...</div>
          </div>
        ) : maintenanceRequests.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-400">No maintenance requests found</p>
            <p className="text-gray-400 text-sm mt-1">
              {statusFilter !== "all"
                ? "Try changing the filter"
                : "Everything is running smoothly!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {maintenanceRequests.map((request) => (
              <div
                key={request._id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:bg-gray-700/80 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">
                        {getCategoryIcon(request.category)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getPriorityColor(request.priority)}`}
                      >
                        {request.priority}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(request.status)}`}
                      >
                        {request.status.replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="text-white font-medium">{request.title}</h3>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                      {request.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-400">
                      <span>{request.reportedDate}</span>
                      <span>
                        {request.property?.propertyName ||
                          request.property?.addressLine1}
                      </span>
                      {request.dwelling && (
                        <span>{request.dwelling.dwellingName}</span>
                      )}
                      <span className="capitalize">{request.category}</span>
                    </div>
                    {request.scheduledDate && (
                      <div className="mt-2 text-sm text-purple-400">
                        Scheduled: {request.scheduledDate}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/portal/maintenance/${request._id}`}
                      className="text-teal-500 hover:text-teal-400 text-sm font-medium"
                    >
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
