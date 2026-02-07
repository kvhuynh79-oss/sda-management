"use client";

import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Id } from "../../../convex/_generated/dataModel";
import { formatStatus } from "@/utils/format";
import { generateInspectionPDF } from "@/utils/inspectionPdf";

function InspectionsContent() {
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: Id<"inspections">; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const convex = useConvex();

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

  const inspections = useQuery(api.inspections.getInspections, {});
  const templates = useQuery(api.inspections.getTemplates, {});
  const seedBLSTemplate = useMutation(api.inspections.seedBLSTemplate);
  const deleteInspection = useMutation(api.inspections.deleteInspection);

  const handleSeedTemplate = async () => {
    if (!user || !user.id) return;
    try {
      await seedBLSTemplate({ createdBy: user.id as Id<"users"> });
      alert("BLS Template created successfully!");
    } catch (error) {
      console.error("Error seeding template:", error);
      alert("Error creating template. It may already exist.");
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, inspection: { _id: Id<"inspections">; property?: { propertyName?: string; addressLine1?: string } | null }) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({
      id: inspection._id,
      name: inspection.property?.propertyName || inspection.property?.addressLine1 || "Unknown Property"
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm || !user) return;
    setIsDeleting(true);
    try {
      await deleteInspection({ userId: user.id as Id<"users">, inspectionId: deleteConfirm.id });
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting inspection:", error);
      alert("Error deleting inspection. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPdf = async (e: React.MouseEvent, inspectionId: Id<"inspections">) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || generatingPdfId) return;
    setGeneratingPdfId(inspectionId);
    try {
      const reportData = await convex.query(api.inspections.getInspectionReport, {
        inspectionId,
        userId: user.id as Id<"users">,
      });
      await generateInspectionPDF(reportData);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setGeneratingPdfId(null);
    }
  };

  // Memoize stats
  const stats = useMemo(() => {
    if (!inspections) return null;
    return {
      total: inspections.length,
      scheduled: inspections.filter((i) => i.status === "scheduled").length,
      inProgress: inspections.filter((i) => i.status === "in_progress").length,
      completed: inspections.filter((i) => i.status === "completed").length,
    };
  }, [inspections]);

  // Memoize filtered list
  const filteredInspections = useMemo(() => {
    if (!inspections) return undefined;
    if (statusFilter === "all") return inspections;
    return inspections.filter((inspection) => inspection.status === statusFilter);
  }, [inspections, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-600";
      case "in_progress": return "bg-yellow-600";
      case "completed": return "bg-green-600";
      case "cancelled": return "bg-gray-600";
      default: return "bg-gray-600";
    }
  };

  const getProgressColor = (passed: number, failed: number, total: number) => {
    if (total === 0) return "bg-gray-600";
    const passRate = passed / total;
    if (failed > 0) return "bg-yellow-600";
    if (passRate === 1) return "bg-green-600";
    return "bg-blue-600";
  };

  const FILTER_BUTTONS = [
    { value: "all", label: "All", activeClass: "bg-blue-600 text-white" },
    { value: "scheduled", label: "Scheduled", activeClass: "bg-blue-600 text-white" },
    { value: "in_progress", label: "In Progress", activeClass: "bg-yellow-600 text-white" },
    { value: "completed", label: "Completed", activeClass: "bg-green-600 text-white" },
  ];

  if (!user) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="inspections" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Property Inspections
            </h1>
            <p className="text-gray-400 mt-1">
              Conduct and track property inspection checklists
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/inspections/templates"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Manage Templates
            </Link>
            <Link
              href="/inspections/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              + New Inspection
            </Link>
          </div>
        </div>

        {/* Template Check */}
        {templates && templates.length === 0 && (
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6" role="alert">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-yellow-400 font-medium">
                  No Inspection Templates Found
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Create the BLS Property Inspection template to get started.
                </p>
              </div>
              <button
                onClick={handleSeedTemplate}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
              >
                Create BLS Template
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Inspections" value={stats.total} color="blue" />
            <StatCard title="Scheduled" value={stats.scheduled} color="blue" />
            <StatCard title="In Progress" value={stats.inProgress} color="yellow" />
            <StatCard title="Completed" value={stats.completed} color="green" />
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {FILTER_BUTTONS.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setStatusFilter(btn.value)}
                aria-pressed={statusFilter === btn.value}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  statusFilter === btn.value
                    ? btn.activeClass
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inspections List */}
        {inspections === undefined ? (
          <LoadingScreen fullScreen={false} message="Loading inspections..." />
        ) : filteredInspections && filteredInspections.length > 0 ? (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-700">
              {filteredInspections.map((inspection) => (
                <Link
                  key={inspection._id}
                  href={`/inspections/${inspection._id}`}
                  className="block p-4 hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium">
                          {inspection.property?.propertyName ||
                            inspection.property?.addressLine1 ||
                            "Unknown Property"}
                        </h3>
                        {inspection.dwelling && (
                          <span className="text-gray-400 text-sm">
                            - {inspection.dwelling.dwellingName}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                        <span>{inspection.template?.name || "Unknown Template"}</span>
                        <span className="text-gray-600">|</span>
                        <span>
                          {inspection.inspector
                            ? `${inspection.inspector.firstName} ${inspection.inspector.lastName}`
                            : "Unassigned"}
                        </span>
                        <span className="text-gray-600">|</span>
                        <span>{inspection.scheduledDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Progress */}
                      <div className="text-right">
                        <div className="text-sm text-gray-400 mb-1">
                          {inspection.completedItems}/{inspection.totalItems} items
                        </div>
                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={inspection.completedItems} aria-valuemax={inspection.totalItems} aria-label="Inspection progress">
                          <div
                            className={`h-full ${getProgressColor(
                              inspection.passedItems,
                              inspection.failedItems,
                              inspection.totalItems
                            )}`}
                            style={{
                              width: `${
                                inspection.totalItems > 0
                                  ? (inspection.completedItems / inspection.totalItems) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs text-white ${getStatusColor(inspection.status)}`}
                      >
                        {formatStatus(inspection.status)}
                      </span>
                      {/* Download PDF Button - only for completed inspections */}
                      {inspection.status === "completed" && (
                        <button
                          onClick={(e) => handleDownloadPdf(e, inspection._id)}
                          disabled={generatingPdfId === inspection._id}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-wait rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          aria-label={`Download PDF report for ${inspection.property?.propertyName || inspection.property?.addressLine1 || "Unknown Property"}`}
                        >
                          {generatingPdfId === inspection._id ? (
                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteClick(e, inspection)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label={`Delete inspection for ${inspection.property?.propertyName || inspection.property?.addressLine1 || "Unknown Property"}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No inspections found"
            description={statusFilter !== "all" ? "Try a different status filter." : "Create your first inspection to get started."}
            isFiltered={statusFilter !== "all"}
            action={statusFilter === "all" ? { label: "+ Create First Inspection", href: "/inspections/new" } : undefined}
            icon={
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="bg-gray-800 rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-title" className="text-xl font-bold text-white mb-4">Delete Inspection</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the inspection for{" "}
              <span className="font-semibold text-white">{deleteConfirm.name}</span>?
              This will permanently delete all items and photos associated with this inspection.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InspectionsPage() {
  return (
    <RequireAuth>
      <InspectionsContent />
    </RequireAuth>
  );
}
