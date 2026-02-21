"use client";

import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Id } from "../../../convex/_generated/dataModel";
import { formatStatus } from "@/utils/format";
import { generateInspectionPDF } from "@/utils/inspectionPdf";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import HelpGuideButton from "@/components/ui/HelpGuideButton";
import HelpGuidePanel from "@/components/ui/HelpGuidePanel";
import { HELP_GUIDES } from "@/constants/helpGuides";

type TabId = "property" | "all" | "specialist";

const TABS: { id: TabId; label: string }[] = [
  { id: "property", label: "By Property" },
  { id: "all", label: "All Inspections" },
  { id: "specialist", label: "Specialist Schedules" },
];

const SPECIALIST_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  fire_safety: { bg: "bg-red-900/40", text: "text-red-400" },
  smoke_alarms: { bg: "bg-yellow-900/40", text: "text-yellow-400" },
  sprinklers: { bg: "bg-blue-900/40", text: "text-blue-400" },
  electrical_safety: { bg: "bg-purple-900/40", text: "text-purple-400" },
  pest_control: { bg: "bg-green-900/40", text: "text-green-400" },
  other: { bg: "bg-gray-700", text: "text-gray-300" },
};

function formatCategoryLabel(category: string): string {
  return category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function InspectionsContent() {
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("property");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: Id<"inspections">; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [completingScheduleId, setCompletingScheduleId] = useState<string | null>(null);
  const { alert: alertDialog } = useConfirmDialog();
  const { organization } = useOrganization();
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

  // Queries
  const inspections = useQuery(api.inspections.getInspections, user ? { userId: user.id as Id<"users"> } : "skip");
  const templates = useQuery(api.inspections.getTemplates, user ? { userId: user.id as Id<"users"> } : "skip");
  const propertyGrouped = useQuery(
    api.inspections.getByPropertyGrouped,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const specialistSchedules = useQuery(
    api.preventativeSchedule.getSpecialistSchedules,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  // Mutations
  const seedBLSTemplate = useMutation(api.inspections.seedBLSTemplate);
  const deleteInspection = useMutation(api.inspections.deleteInspection);
  const completeSpecialist = useMutation(api.preventativeSchedule.completeSpecialistSchedule);

  const handleSeedTemplate = async () => {
    if (!user || !user.id) return;
    try {
      await seedBLSTemplate({ createdBy: user.id as Id<"users"> });
      await alertDialog("Standard SDA Inspection template created successfully!");
    } catch (error) {
      console.error("Error seeding template:", error);
      await alertDialog("Error creating template. It may already exist.");
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
      await alertDialog("Error deleting inspection. Please try again.");
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
      await generateInspectionPDF(reportData, organization?.name);
    } catch (error) {
      console.error("Error generating PDF:", error);
      await alertDialog("Error generating PDF. Please try again.");
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const togglePropertyExpanded = useCallback((propertyId: string) => {
    setExpandedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  }, []);

  const handleCompleteSpecialist = async (scheduleId: Id<"preventativeSchedule">) => {
    if (!user) return;
    setCompletingScheduleId(scheduleId);
    try {
      const today = new Date().toISOString().split("T")[0];
      await completeSpecialist({
        userId: user.id as Id<"users">,
        scheduleId,
        completedDate: today,
      });
    } catch (error) {
      console.error("Error completing specialist schedule:", error);
      await alertDialog("Error marking item as complete. Please try again.");
    } finally {
      setCompletingScheduleId(null);
    }
  };

  // ---- Computed stats ----
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const overdueCount = inspections
      ? inspections.filter(
          (i) => i.status === "scheduled" && new Date(i.scheduledDate) < now
        ).length
      : 0;

    const upcomingThisMonth = inspections
      ? inspections.filter((i) => {
          if (i.status !== "scheduled") return false;
          const d = new Date(i.scheduledDate);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d >= now;
        }).length
      : 0;

    const specialistDueCount = specialistSchedules
      ? specialistSchedules.filter((s) => {
          if (!s.isActive) return false;
          const due = new Date(s.nextDueDate);
          return due <= thirtyDaysFromNow;
        }).length
      : 0;

    const propertiesTracked = propertyGrouped ? propertyGrouped.length : 0;

    return { overdueCount, upcomingThisMonth, specialistDueCount, propertiesTracked };
  }, [inspections, specialistSchedules, propertyGrouped]);

  // Memoize filtered list for "All Inspections" tab
  const filteredInspections = useMemo(() => {
    if (!inspections) return undefined;
    if (statusFilter === "all") return inspections;
    return inspections.filter((inspection) => inspection.status === statusFilter);
  }, [inspections, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-teal-700";
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
    return "bg-teal-700";
  };

  const FILTER_BUTTONS = [
    { value: "all", label: "All", activeClass: "bg-teal-700 text-white" },
    { value: "scheduled", label: "Scheduled", activeClass: "bg-teal-700 text-white" },
    { value: "in_progress", label: "In Progress", activeClass: "bg-yellow-600 text-white" },
    { value: "completed", label: "Completed", activeClass: "bg-green-600 text-white" },
  ];

  // --- Property health indicator ---
  const getPropertyHealthColor = useCallback((property: NonNullable<NonNullable<typeof propertyGrouped>[number]>) => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Red: overdue
    if (property.hasOverdue) return "bg-red-500";

    // Yellow: has issues from latest inspections
    if (property.totalIssues > 0) return "bg-yellow-500";

    // Red: no scheduled inspection and last completed was more than 3 months ago (or never)
    if (
      !property.nextScheduledDate &&
      (!property.lastInspectionDate || new Date(property.lastInspectionDate) < threeMonthsAgo)
    ) {
      return "bg-red-500";
    }

    // Green: all good
    return "bg-green-500";
  }, []);

  // --- Specialist schedule status ---
  const getSpecialistStatus = useCallback((nextDueDate: string) => {
    const now = new Date();
    const due = new Date(nextDueDate);
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (due < now) return { label: "Overdue", className: "bg-red-900/40 text-red-400" };
    if (due <= fourteenDaysFromNow) return { label: "Due Soon", className: "bg-yellow-900/40 text-yellow-400" };
    return { label: "Current", className: "bg-green-900/40 text-green-400" };
  }, []);

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
            <HelpGuideButton onClick={() => setShowHelp(true)} />
            <Link
              href="/inspections/templates"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              Manage Templates
            </Link>
            <Link
              href="/inspections/new"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
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
                  Create the Standard SDA Inspection template to get started.
                </p>
              </div>
              <button
                onClick={handleSeedTemplate}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
              >
                Create Standard Template
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard title="Overdue Inspections" value={stats.overdueCount} color="red" />
          <StatCard title="Upcoming This Month" value={stats.upcomingThisMonth} color="blue" />
          <StatCard title="Specialist Items Due" value={stats.specialistDueCount} color="yellow" />
          <StatCard title="Properties Tracked" value={stats.propertiesTracked} color="green" />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-800 p-1 rounded-lg mb-6" role="tablist" aria-label="Inspection views">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                activeTab === tab.id
                  ? "bg-teal-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ======================== */}
        {/* TAB: By Property         */}
        {/* ======================== */}
        {activeTab === "property" && (
          <div role="tabpanel" aria-label="By Property">
            {propertyGrouped === undefined ? (
              <LoadingScreen fullScreen={false} message="Loading property inspections..." />
            ) : propertyGrouped.length > 0 ? (
              <div className="space-y-4">
                {propertyGrouped.map((property) => {
                  if (!property) return null;
                  const isExpanded = expandedProperties.has(property.propertyId);
                  const healthColor = getPropertyHealthColor(property);

                  return (
                    <div
                      key={property.propertyId}
                      className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
                    >
                      {/* Property Header - clickable to expand */}
                      <button
                        onClick={() => togglePropertyExpanded(property.propertyId)}
                        className="w-full text-left p-4 hover:bg-gray-700/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-inset"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {/* Health indicator dot */}
                            <span
                              className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ${healthColor}`}
                              aria-label={
                                healthColor === "bg-green-500"
                                  ? "Healthy"
                                  : healthColor === "bg-yellow-500"
                                  ? "Has issues"
                                  : "Overdue or needs attention"
                              }
                            />
                            <div>
                              <h3 className="text-white font-medium text-base">
                                {property.propertyName || property.addressLine1 || "Unknown Property"}
                              </h3>
                              {property.suburb && (
                                <p className="text-gray-400 text-sm">{property.suburb}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400 flex-shrink-0">
                            <span>
                              Last:{" "}
                              <span className="text-gray-300">
                                {property.lastInspectionDate
                                  ? new Date(property.lastInspectionDate).toLocaleDateString("en-AU")
                                  : "Never"}
                              </span>
                            </span>
                            <span className="text-gray-600">|</span>
                            <span>
                              Next:{" "}
                              <span className="text-gray-300">
                                {property.nextScheduledDate
                                  ? new Date(property.nextScheduledDate).toLocaleDateString("en-AU")
                                  : "None"}
                              </span>
                            </span>
                            <span className="text-gray-600">|</span>
                            <span>
                              Issues:{" "}
                              <span className={property.totalIssues > 0 ? "text-yellow-400" : "text-gray-300"}>
                                {property.totalIssues}
                              </span>
                            </span>
                            {/* Chevron */}
                            <svg
                              className={`w-5 h-5 text-gray-400 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </button>

                      {/* Expanded Dwelling List */}
                      {isExpanded && (
                        <div className="border-t border-gray-700">
                          {property.dwellings.length > 0 ? (
                            <div className="divide-y divide-gray-700/50">
                              {property.dwellings.map((dw) => {
                                const latestInspection = dw.lastCompleted || dw.inspections[0];
                                const hasIssues = dw.totalFailed > 0;
                                const lastDate = dw.lastCompleted?.completedDate || dw.lastCompleted?.scheduledDate;
                                const nextDate = dw.nextScheduled?.scheduledDate;

                                return (
                                  <div
                                    key={dw.dwellingId}
                                    className="px-4 py-3 pl-10 hover:bg-gray-700/30 transition-colors"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white text-sm font-medium">
                                          {dw.dwellingName}
                                        </span>
                                        {dw.hasCustomTemplate && (
                                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400">
                                            Custom Template
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span>
                                          Last:{" "}
                                          <span className="text-gray-300">
                                            {lastDate
                                              ? new Date(lastDate).toLocaleDateString("en-AU")
                                              : "None"}
                                          </span>
                                          {latestInspection && dw.lastCompleted && (
                                            <span
                                              className={`ml-1 ${
                                                hasIssues ? "text-yellow-400" : "text-green-400"
                                              }`}
                                            >
                                              ({hasIssues ? `${dw.totalFailed} issues` : "Passed"})
                                            </span>
                                          )}
                                        </span>
                                        <span className="text-gray-600">|</span>
                                        <span>
                                          Next:{" "}
                                          <span className="text-gray-300">
                                            {nextDate
                                              ? new Date(nextDate).toLocaleDateString("en-AU")
                                              : "None"}
                                          </span>
                                        </span>
                                        {/* Link to latest inspection */}
                                        {latestInspection && (
                                          <Link
                                            href={`/inspections/${latestInspection._id}`}
                                            className="text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                                          >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                          </Link>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}

                          {/* Unlinked inspections (not tied to a dwelling) */}
                          {property.unlinkedInspections && property.unlinkedInspections.length > 0 && (
                            <div className="divide-y divide-gray-700/50">
                              <div className="px-4 py-2 pl-10 bg-gray-800/50">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">
                                  Property-Level Inspections
                                </span>
                              </div>
                              {property.unlinkedInspections.map((insp) => (
                                <Link
                                  key={insp._id}
                                  href={`/inspections/${insp._id}`}
                                  className="block px-4 py-3 pl-10 hover:bg-gray-700/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-inset"
                                >
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-300">
                                      {new Date(insp.scheduledDate).toLocaleDateString("en-AU")}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs text-white ${getStatusColor(insp.status)}`}
                                    >
                                      {formatStatus(insp.status)}
                                    </span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )}

                          {property.dwellings.length === 0 &&
                            (!property.unlinkedInspections || property.unlinkedInspections.length === 0) && (
                              <div className="px-4 py-6 pl-10 text-center text-gray-400 text-sm">
                                No inspections recorded for this property yet.
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No properties with inspections"
                description="Create an inspection to start tracking property conditions."
                action={{ label: "+ Create First Inspection", href: "/inspections/new" }}
                icon={
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />
            )}
          </div>
        )}

        {/* ======================== */}
        {/* TAB: All Inspections     */}
        {/* ======================== */}
        {activeTab === "all" && (
          <div role="tabpanel" aria-label="All Inspections">
            {/* Filters */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
                {FILTER_BUTTONS.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => setStatusFilter(btn.value)}
                    aria-pressed={statusFilter === btn.value}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
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
                      className="block p-4 hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-inset"
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
                            <span className="text-gray-400">|</span>
                            <span>
                              {inspection.inspector
                                ? `${inspection.inspector.firstName} ${inspection.inspector.lastName}`
                                : "Unassigned"}
                            </span>
                            <span className="text-gray-400">|</span>
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
                              className="p-2 text-teal-500 hover:text-teal-400 hover:bg-teal-950/30 disabled:opacity-50 disabled:cursor-wait rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
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
          </div>
        )}

        {/* ======================== */}
        {/* TAB: Specialist Schedules */}
        {/* ======================== */}
        {activeTab === "specialist" && (
          <div role="tabpanel" aria-label="Specialist Schedules">
            {specialistSchedules === undefined ? (
              <LoadingScreen fullScreen={false} message="Loading specialist schedules..." />
            ) : specialistSchedules.length > 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                {/* Table header - hidden on mobile, visible on sm+ */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-3 bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider font-medium">
                  <span>Property</span>
                  <span>Item</span>
                  <span>Category</span>
                  <span>Frequency</span>
                  <span>Last Done</span>
                  <span>Next Due</span>
                  <span>Actions</span>
                </div>
                <div className="divide-y divide-gray-700">
                  {specialistSchedules
                    .filter((s) => s.isActive)
                    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
                    .map((schedule) => {
                      const status = getSpecialistStatus(schedule.nextDueDate);
                      const catColors = SPECIALIST_CATEGORY_COLORS[schedule.specialistCategory || "other"] || SPECIALIST_CATEGORY_COLORS.other;
                      const isCompleting = completingScheduleId === schedule._id;

                      return (
                        <div
                          key={schedule._id}
                          className="px-4 py-3 hover:bg-gray-700/30 transition-colors"
                        >
                          {/* Mobile layout */}
                          <div className="sm:hidden space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-white text-sm font-medium">
                                  {schedule.property?.propertyName || schedule.property?.addressLine1 || "Unknown"}
                                </p>
                                <p className="text-gray-400 text-sm">{schedule.taskName}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${status.className}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
                              <span className={`px-2 py-0.5 rounded-full ${catColors.bg} ${catColors.text}`}>
                                {formatCategoryLabel(schedule.specialistCategory || "other")}
                              </span>
                              <span>{schedule.frequencyType} (x{schedule.frequencyInterval})</span>
                              <span className="text-gray-600">|</span>
                              <span>
                                Due: {new Date(schedule.nextDueDate).toLocaleDateString("en-AU")}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCompleteSpecialist(schedule._id)}
                              disabled={isCompleting}
                              className="w-full mt-1 px-3 py-1.5 text-xs bg-teal-700 hover:bg-teal-800 disabled:bg-teal-900 disabled:opacity-50 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                            >
                              {isCompleting ? "Completing..." : "Mark Complete"}
                            </button>
                          </div>

                          {/* Desktop layout */}
                          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 items-center">
                            <div>
                              <p className="text-white text-sm">
                                {schedule.property?.propertyName || schedule.property?.addressLine1 || "Unknown"}
                              </p>
                              {schedule.dwelling && (
                                <p className="text-gray-400 text-xs">{schedule.dwelling.dwellingName}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-300 text-sm">{schedule.taskName}</p>
                              {schedule.description && (
                                <p className="text-gray-400 text-xs truncate max-w-xs">{schedule.description}</p>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${catColors.bg} ${catColors.text}`}>
                              {formatCategoryLabel(schedule.specialistCategory || "other")}
                            </span>
                            <span className="text-gray-400 text-sm whitespace-nowrap">
                              {formatCategoryLabel(schedule.frequencyType)}
                            </span>
                            <span className="text-gray-400 text-sm whitespace-nowrap">
                              {schedule.lastCompletedDate
                                ? new Date(schedule.lastCompletedDate).toLocaleDateString("en-AU")
                                : "Never"}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-300 text-sm whitespace-nowrap">
                                {new Date(schedule.nextDueDate).toLocaleDateString("en-AU")}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${status.className}`}>
                                {status.label}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCompleteSpecialist(schedule._id)}
                              disabled={isCompleting}
                              className="px-3 py-1.5 text-xs bg-teal-700 hover:bg-teal-800 disabled:bg-teal-900 disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                            >
                              {isCompleting ? "..." : "Mark Complete"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <EmptyState
                title="No specialist schedules"
                description="Add specialist maintenance items (fire safety, smoke alarms, etc.) from the Preventative Schedule page."
                action={{ label: "Go to Preventative Schedule", href: "/preventative-schedule" }}
                icon={
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
              />
            )}
          </div>
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
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
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
      <BottomNav currentPage="inspections" />
      <HelpGuidePanel
        guide={HELP_GUIDES.inspections}
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
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
