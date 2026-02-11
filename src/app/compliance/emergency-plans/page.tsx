"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, StatCard } from "@/components/ui";
import Badge from "@/components/ui/Badge";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/utils/format";

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "error" | "neutral"; label: string }> = {
  active: { variant: "success", label: "Active" },
  draft: { variant: "neutral", label: "Draft" },
  under_review: { variant: "warning", label: "Under Review" },
  archived: { variant: "error", label: "Archived" },
};

function EmergencyPlansContent() {
  const { confirm, alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProperty, setFilterProperty] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("sda_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Invalid data
      }
    }
  }, []);

  const plans = useQuery(
    api.emergencyManagementPlans.getAll,
    user
      ? {
          userId: user.id as Id<"users">,
          status: filterStatus || undefined,
          propertyId: filterProperty ? (filterProperty as Id<"properties">) : undefined,
        }
      : "skip"
  );

  const stats = useQuery(
    api.emergencyManagementPlans.getStats,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  const properties = useQuery(
    api.properties.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  const removePlan = useMutation(api.emergencyManagementPlans.remove);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = async (planId: Id<"emergencyManagementPlans">) => {
    if (!user) return;
    const confirmed = await confirm({
      title: "Delete Emergency Plan",
      message: "Are you sure you want to delete this emergency management plan? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await removePlan({
        userId: user.id as Id<"users">,
        id: planId,
      });
    } catch (err: any) {
      await alertDialog({ title: "Error", message: err.message || "Failed to delete plan" });
    }
  };

  const hasFilters = filterStatus || filterProperty;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/compliance"
              className="text-teal-500 hover:text-teal-400 text-sm mb-2 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              &larr; Back to Compliance Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white">Emergency Management Plans</h1>
            <p className="text-gray-400 mt-1">
              Manage emergency management plans for SDA properties
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/compliance/emergency-plans/new"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              + New Emergency Plan
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Plans" value={stats.total} color="blue" />
            <StatCard title="Active" value={stats.active} color="green" />
            <StatCard title="Needs Review" value={stats.overdueReview} color="yellow" />
            <StatCard title="Without Plans" value={stats.propertiesWithoutPlan} color="red" />
          </div>
        )}

        {/* Filters */}
        <fieldset className="bg-gray-800 rounded-lg p-4 mb-6">
          <legend className="sr-only">Filter emergency plans</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div>
              <label htmlFor="emp-status-filter" className="block text-sm font-medium text-gray-300 mb-1">
                Status
              </label>
              <select
                id="emp-status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="under_review">Under Review</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Property Filter */}
            <div>
              <label htmlFor="emp-property-filter" className="block text-sm font-medium text-gray-300 mb-1">
                Property
              </label>
              <select
                id="emp-property-filter"
                value={filterProperty}
                onChange={(e) => setFilterProperty(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              >
                <option value="">All Properties</option>
                {properties?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.propertyName || p.addressLine1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => {
                setFilterStatus("");
                setFilterProperty("");
              }}
              className="mt-3 text-sm text-teal-500 hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              Clear all filters
            </button>
          )}
        </fieldset>

        {/* Plans Table */}
        {plans === undefined ? (
          <LoadingScreen fullScreen={false} message="Loading emergency plans..." />
        ) : plans.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-gray-400 mb-4">
              {hasFilters
                ? "No emergency plans match your filters"
                : "No emergency management plans created yet"}
            </p>
            {!hasFilters && (
              <Link
                href="/compliance/emergency-plans/new"
                className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                + Create First Emergency Plan
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Property
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Status
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Version
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Last Reviewed
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Next Review
                    </th>
                    <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {plans.map((plan) => {
                    const statusInfo = STATUS_BADGE[plan.status] || {
                      variant: "neutral" as const,
                      label: plan.status.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
                    };

                    const isOverdue =
                      plan.nextReviewDate &&
                      plan.nextReviewDate < new Date().toISOString().split("T")[0] &&
                      plan.status !== "archived";

                    return (
                      <tr
                        key={plan._id}
                        className="hover:bg-gray-700/50 transition-colors"
                      >
                        {/* Property */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white text-sm font-medium">
                              {plan.property?.propertyName || plan.property?.addressLine1 || "Unknown Property"}
                            </p>
                            {plan.dwelling && (
                              <p className="text-gray-400 text-xs mt-0.5">
                                {plan.dwelling.dwellingName || "Dwelling"}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant} size="xs" dot>
                            {statusInfo.label}
                          </Badge>
                          {isOverdue && (
                            <p className="text-red-400 text-xs mt-0.5">
                              Review overdue
                            </p>
                          )}
                        </td>

                        {/* Version */}
                        <td className="px-4 py-3 text-sm text-gray-300">
                          v{plan.version || "1.0"}
                        </td>

                        {/* Last Reviewed */}
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {formatDate(plan.lastReviewDate)}
                        </td>

                        {/* Next Review */}
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <span className={isOverdue ? "text-red-400 font-medium" : ""}>
                            {formatDate(plan.nextReviewDate)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/compliance/emergency-plans/${plan._id}`}
                              className="text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                            >
                              View
                            </Link>
                            {(user?.role === "admin" || user?.role === "property_manager") && (
                              <button
                                onClick={() => handleDelete(plan._id)}
                                className="text-red-400 hover:text-red-300 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Results count */}
            <div className="px-4 py-3 border-t border-gray-700 text-sm text-gray-400">
              Showing {plans.length} plan{plans.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EmergencyPlansPage() {
  return (
    <RequireAuth>
      <EmergencyPlansContent />
    </RequireAuth>
  );
}
